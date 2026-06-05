import { createServerSupabase } from '@/lib/supabase/server'
import { createPixPayment, createProSubscription } from '@/lib/mercado-pago'
import {
  createPixPayment as createAbacatePix,
  createProSubscription as createAbacateSubscription,
} from '@/lib/abacate-pay'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, provider = 'abacatepay' } = await request.json()
  const userEmail = user.email || `${user.id}@claudemiro.app`

  try {
    // ─── ABACATE PAY ─────────────────────────────────
    if (provider === 'abacatepay') {
      if (type === 'one_time') {
        const { qrCode, qrCodeBase64, paymentId } = await createAbacatePix(
          9.99, 'Claudemiro FLEX — 1 mês de vereditos', userEmail,
        )

        await supabase.from('payments').insert({
          user_id: user.id,
          amount: 9.99,
          type: 'one_time',
          mercado_pago_id: paymentId,
          plan: 'FLEX',
          provider: 'abacatepay',
        })

        return NextResponse.json({ qrCode, qrCodeBase64, paymentId })
      }

      if (type === 'per_generation') {
        const { qrCode, qrCodeBase64, paymentId } = await createAbacatePix(
          3.99, 'Claudemiro — 1 veredito', userEmail,
        )

        await supabase.from('payments').insert({
          user_id: user.id,
          amount: 3.99,
          type: 'per_generation',
          mercado_pago_id: paymentId,
          plan: 'FLEX',
          provider: 'abacatepay',
        })

        return NextResponse.json({ qrCode, qrCodeBase64, paymentId })
      }

      if (type === 'subscription') {
        const { initPoint, paymentId } = await createAbacateSubscription(userEmail)

        await supabase.from('payments').insert({
          user_id: user.id,
          amount: 19.99,
          type: 'subscription',
          mercado_pago_id: paymentId,
          plan: 'PRO',
          provider: 'abacatepay',
        })

        return NextResponse.json({ initPoint })
      }

      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    // ─── MERCADO PAGO (default) ──────────────────────
    if (type === 'one_time') {
      const { qrCode, qrCodeBase64, paymentId } = await createPixPayment(
        9.99, 'Claudemiro FLEX — 1 mês de vereditos', userEmail,
      )

      await supabase.from('payments').insert({
        user_id: user.id,
        amount: 9.99,
        type: 'one_time',
        mercado_pago_id: String(paymentId),
        plan: 'FLEX',
        provider: 'mercado_pago',
      })

      return NextResponse.json({ qrCode, qrCodeBase64, paymentId })
    }

    if (type === 'per_generation') {
      const { qrCode, qrCodeBase64, paymentId } = await createPixPayment(
        3.99, 'Claudemiro — 1 veredito', userEmail,
      )

      await supabase.from('payments').insert({
        user_id: user.id,
        amount: 3.99,
        type: 'per_generation',
        mercado_pago_id: String(paymentId),
        plan: 'FLEX',
        provider: 'mercado_pago',
      })

      return NextResponse.json({ qrCode, qrCodeBase64, paymentId })
    }

    if (type === 'subscription') {
      const { initPoint, preferenceId } = await createProSubscription(userEmail)

      await supabase.from('payments').insert({
        user_id: user.id,
        amount: 19.99,
        type: 'subscription',
        mercado_pago_id: preferenceId,
        plan: 'PRO',
        provider: 'mercado_pago',
      })

      return NextResponse.json({ initPoint })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (err: any) {
    console.error('Payment error:', err)
    return NextResponse.json({ error: 'Falha ao gerar pagamento' }, { status: 500 })
  }
}
