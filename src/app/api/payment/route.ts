import { createServerSupabase } from '@/lib/supabase/server'
import {
  createPixPayment as createAbacatePix,
  createProSubscription as createAbacateSubscription,
  simulatePixPayment,
  type PixCustomer,
} from '@/lib/abacate-pay'
import { NextResponse } from 'next/server'

const PRICES: Record<string, { amount: number; desc: string; plan: string }> = {
  one_time: { amount: 9.99, desc: 'Claudemiro FLEX — 1 mês de vereditos', plan: 'FLEX' },
  per_generation: { amount: 3.99, desc: 'Claudemiro — 1 veredito', plan: 'FLEX' },
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action, type, customer, paymentId } = body

  try {
    // ─── CANCELAR (usuário fechou modal / voltou sem pagar) ────────
    if (action === 'cancel') {
      if (!paymentId) return NextResponse.json({ error: 'paymentId obrigatório' }, { status: 400 })
      const { data: payment } = await supabase
        .from('payments').select('id, status')
        .eq('mercado_pago_id', paymentId).eq('user_id', user.id).single()
      if (!payment) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
      if (payment.status === 'approved') return NextResponse.json({ cancelled: false, reason: 'already_paid' })
      // PIX QRCode expira sozinho; só marcamos no nosso banco
      await supabase.from('payments').update({ status: 'cancelled' }).eq('id', payment.id)
      return NextResponse.json({ cancelled: true })
    }

    // ─── SIMULAR PAGAMENTO (sandbox / botão "já paguei" em devMode) ─
    if (action === 'simulate') {
      if (!paymentId) return NextResponse.json({ error: 'paymentId obrigatório' }, { status: 400 })

      // Tenta localizar no nosso banco (pode não existir se o insert falhou antes)
      const { data: payment } = await supabase
        .from('payments').select('id, type, user_id, status, plan')
        .eq('mercado_pago_id', paymentId).eq('user_id', user.id).maybeSingle()

      // Simula o pagamento na AbacatePay (só funciona em devMode)
      let simOk = false
      try {
        await simulatePixPayment(paymentId)
        simOk = true
      } catch (e: any) {
        console.error('[payment] simulate falhou na AbacatePay:', e?.message)
      }

      // Se temos o registro local, já ativa o plano (não espera webhook)
      if (payment && payment.status !== 'approved') {
        const isSubscription = payment.type === 'subscription'
        const newPlan = isSubscription ? 'PRO' : 'FLEX'
        
        const profileUpdate: Record<string, any> = { plan: newPlan }
        if (!isSubscription) {
          profileUpdate.flex_type = payment.type === 'one_time' ? 'one_time_monthly' : 'per_generation'
          // FLEX mensal: expira em 30 dias
          if (payment.type === 'one_time') {
            profileUpdate.plan_expires_at = new Date(Date.now() + 30 * 864e5).toISOString()
          }
        }
        
        await supabase.from('payments').update({ status: 'approved' }).eq('id', payment.id)
        await supabase.from('profiles').update(profileUpdate).eq('id', payment.user_id)
        return NextResponse.json({ simulated: true, status: 'PAID', plan: newPlan })
      }

      if (!payment && !simOk) {
        return NextResponse.json({
          error: 'not_found',
          message: 'Pagamento não encontrado e simulação indisponível. Rode as migrations do banco.',
        }, { status: 404 })
      }

      // Registro inexistente local mas simulação ok → deixa o polling /status confirmar
      return NextResponse.json({ simulated: simOk, status: 'PENDING' })
    }

    // ─── ASSINATURA PRO (recorrente, cartão, página hospedada) ─────
    if (type === 'subscription') {
      const c = customer as Partial<PixCustomer> | undefined
      if (!c?.name || !c?.taxId || !c?.email || !c?.cellphone) {
        return NextResponse.json({ error: 'missing_customer', message: 'Dados obrigatórios' }, { status: 422 })
      }
      const { initPoint, paymentId: subId } = await createAbacateSubscription({
        name: c.name, email: c.email, taxId: c.taxId, cellphone: c.cellphone,
      })
      await supabase.from('payments').insert({
        user_id: user.id, amount: 19.99, type: 'subscription',
        mercado_pago_id: subId, plan: 'PRO', provider: 'abacatepay',
      })
      return NextResponse.json({ initPoint })
    }

    // ─── PIX (one_time / per_generation) — QR Code no próprio site ──
    const price = PRICES[type as string]
    if (!price) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

    const c = customer as Partial<PixCustomer> | undefined
    if (!c?.name || !c?.taxId || !c?.email || !c?.cellphone) {
      return NextResponse.json({ error: 'missing_customer', message: 'Dados do pagador obrigatórios' }, { status: 422 })
    }

    const { qrCode, qrCodeBase64, paymentId: pixId, amount } = await createAbacatePix(
      price.amount, price.desc,
      { name: c.name, email: c.email, taxId: c.taxId, cellphone: c.cellphone },
      300,
    )

    const { error: insertError } = await supabase.from('payments').insert({
      user_id: user.id, amount: price.amount, type,
      mercado_pago_id: pixId, plan: price.plan, provider: 'abacatepay',
    })

    if (insertError) {
      console.error('[payment] insert falhou:', insertError)
      return NextResponse.json({
        error: 'db_insert_failed',
        message: 'Não consegui registrar o pagamento. Verifique se as migrations do banco foram aplicadas.',
        detail: insertError.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      qrCode, qrCodeBase64, paymentId: pixId,
      amount, // centavos
      amountReais: price.amount,
      expiresIn: 300,
    })
  } catch (err: any) {
    console.error('Payment error:', err)
    return NextResponse.json({ error: 'Falha ao gerar pagamento' }, { status: 500 })
  }
}
