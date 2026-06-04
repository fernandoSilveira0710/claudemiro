import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  const body = await request.json()
  const signature = request.headers.get('x-abacatepay-signature')

  // ─── AbacatePay Webhook ─────────────────────────────
  if (signature) {
    const secret = process.env.ABACATE_PAY_WEBHOOK_SECRET
    if (secret) {
      const rawBody = JSON.stringify(body)
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(rawBody)
      const expected = hmac.digest('hex')

      if (expected !== signature) {
        console.warn('[AbacatePay] Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = body.event as string
    const paymentId = body.data?.id as string | undefined

    if (!paymentId) {
      return NextResponse.json({ received: true })
    }

    const supabase = await createServerSupabase()

    // PIX pago
    if (event === 'transparent.completed') {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('mercado_pago_id', paymentId)
        .eq('provider', 'abacatepay')
        .single()

      if (payment && payment.status !== 'approved') {
        await supabase.from('payments')
          .update({ status: 'approved' })
          .eq('id', payment.id)

        const newPlan = payment.type === 'subscription' ? 'PRO' : 'FLEX'
        await supabase.from('profiles')
          .update({ plan: newPlan })
          .eq('id', payment.user_id)
      }
    }

    // Assinatura criada/renovada
    if (event === 'subscription.completed' || event === 'subscription.renewed') {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('mercado_pago_id', paymentId)
        .eq('provider', 'abacatepay')
        .single()

      if (payment && payment.status !== 'approved') {
        await supabase.from('payments')
          .update({ status: 'approved' })
          .eq('id', payment.id)

        await supabase.from('profiles')
          .update({ plan: 'PRO' })
          .eq('id', payment.user_id)
      }
    }

    // Assinatura cancelada
    if (event === 'subscription.cancelled') {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('mercado_pago_id', paymentId)
        .eq('provider', 'abacatepay')
        .single()

      if (payment) {
        await supabase.from('profiles')
          .update({ plan: 'free' })
          .eq('id', payment.user_id)
      }
    }

    return NextResponse.json({ received: true })
  }

  // ─── Mercado Pago Webhook (legacy) ──────────────────
  if (body.type === 'payment' && body.data?.id) {
    const supabase = await createServerSupabase()

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('mercado_pago_id', String(body.data.id))
      .single()

    if (payment && payment.status !== 'approved') {
      await supabase.from('payments')
        .update({ status: 'approved' })
        .eq('id', payment.id)

      if (payment.type === 'subscription') {
        await supabase.from('profiles')
          .update({ plan: 'PRO' })
          .eq('id', payment.user_id)
      }

      if (payment.type === 'one_time') {
        await supabase.from('profiles')
          .update({ plan: 'FLEX' })
          .eq('id', payment.user_id)
      }
    }
  }

  return NextResponse.json({ received: true })
}
