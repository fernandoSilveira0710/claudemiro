import { createServerSupabase } from '@/lib/supabase/server'
import {
  createPixPayment as createAbacatePix,
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
      await supabase.from('payments').update({ status: 'cancelled' }).eq('id', payment.id)
      return NextResponse.json({ cancelled: true })
    }

    // ─── SIMULAR PAGAMENTO (sandbox / botão "já paguei") ────────────
    if (action === 'simulate') {
      if (!paymentId) return NextResponse.json({ error: 'paymentId obrigatório' }, { status: 400 })
      const { data: payment } = await supabase
        .from('payments').select('id, type, user_id, status')
        .eq('mercado_pago_id', paymentId).eq('user_id', user.id).single()
      if (!payment) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

      try { await simulatePixPayment(paymentId) } catch (e) {}
      return NextResponse.json({ simulated: true })
    }

    // ─── PIX (one_time / per_generation) ─────────────────────────────
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

    const { error: insertErr } = await supabase.from('payments').insert({
      user_id: user.id, amount: price.amount, type,
      mercado_pago_id: pixId, plan: price.plan,
    })
    if (insertErr) console.error('[payment] INSERT error:', insertErr)

    return NextResponse.json({
      qrCode, qrCodeBase64, paymentId: pixId,
      amount, amountReais: price.amount, expiresIn: 300,
    })
  } catch (err: any) {
    console.error('Payment error:', err)
    return NextResponse.json({ error: 'Falha ao gerar pagamento' }, { status: 500 })
  }
}
