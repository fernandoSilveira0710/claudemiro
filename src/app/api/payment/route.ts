import { createServerSupabase } from '@/lib/supabase/server'
import {
  createPixPayment as createAbacatePix,
  createProSubscription as createAbacateSubscription,
  cancelPixPayment,
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
        .from('payments')
        .select('id, status')
        .eq('mercado_pago_id', paymentId)
        .eq('user_id', user.id)
        .single()

      if (!payment) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
      if (payment.status === 'approved') return NextResponse.json({ cancelled: false, reason: 'already_paid' })

      await cancelPixPayment(paymentId)
      await supabase.from('payments').update({ status: 'cancelled' }).eq('id', payment.id)
      return NextResponse.json({ cancelled: true })
    }

    // ─── ASSINATURA PRO (recorrente, página hospedada via cartão) ──
    if (type === 'subscription') {
      const userEmail = user.email || `${user.id}@claudemiro.app`
      const { initPoint, paymentId: subId } = await createAbacateSubscription(userEmail)
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

    const { qrCode, qrCodeBase64, paymentId: pixId } = await createAbacatePix(
      price.amount, price.desc,
      { name: c.name, email: c.email, taxId: c.taxId, cellphone: c.cellphone },
      300,
    )

    await supabase.from('payments').insert({
      user_id: user.id, amount: price.amount, type,
      mercado_pago_id: pixId, plan: price.plan, provider: 'abacatepay',
    })

    return NextResponse.json({ qrCode, qrCodeBase64, paymentId: pixId, expiresIn: 300 })
  } catch (err: any) {
    console.error('Payment error:', err)
    return NextResponse.json({ error: 'Falha ao gerar pagamento' }, { status: 500 })
  }
}
