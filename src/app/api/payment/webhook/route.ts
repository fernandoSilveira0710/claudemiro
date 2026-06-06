import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateWebhookSignature } from '@/lib/abacate-pay'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('X-Webhook-Signature')

  // ─── AbacatePay Webhook (v2) ─────────────────────────
  if (signature) {
    // Valida assinatura HMAC-SHA256 base64 com chave pública
    if (!validateWebhookSignature(rawBody, signature)) {
      console.warn('[AbacatePay] Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let body: any
    try { body = JSON.parse(rawBody) } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const event = body.event as string
    const paymentData = body.data
    const paymentId = paymentData?.checkout?.id || paymentData?.transparent?.id || paymentData?.id

    if (!paymentId) {
      return NextResponse.json({ received: true })
    }

    const supabase = await createServerSupabase()

    // PIX transparente pago
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

        const isSub = payment.type === 'subscription'
        const newPlan = isSub ? 'PRO' : 'FLEX'
        const profileUpdate: Record<string, any> = { plan: newPlan }
        if (!isSub) {
          profileUpdate.flex_type = payment.type === 'one_time' ? 'one_time_monthly' : 'per_generation'
          if (payment.type === 'one_time') {
            profileUpdate.plan_expires_at = new Date(Date.now() + 30 * 864e5).toISOString()
          }
        }
        await supabase.from('profiles')
          .update(profileUpdate)
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
  let body: any
  try { body = JSON.parse(rawBody) } catch {
    return NextResponse.json({ received: true })
  }

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
