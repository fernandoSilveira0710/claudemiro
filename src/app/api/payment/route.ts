import { createServerSupabase } from '@/lib/supabase/server'
import { createPixPayment, createProSubscription } from '@/lib/mercado-pago'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type } = await request.json()
  const userEmail = user.email || `${user.id}@claudemiro.app`

  try {
    if (type === 'one_time') {
      const { qrCode, qrCodeBase64, paymentId } = await createPixPayment(
        2.9, 'Claudemiro — 1 Veredito', userEmail
      )

      await supabase.from('payments').insert({
        user_id: user.id,
        amount: 2.9,
        type: 'one_time',
        mercado_pago_id: String(paymentId),
        plan: 'FLEX',
      })

      return NextResponse.json({ qrCode, qrCodeBase64, paymentId })
    }

    if (type === 'subscription') {
      const { initPoint, preferenceId } = await createProSubscription(userEmail)

      await supabase.from('payments').insert({
        user_id: user.id,
        amount: 9.9,
        type: 'subscription',
        mercado_pago_id: preferenceId,
        plan: 'PRO',
      })

      return NextResponse.json({ initPoint })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (err: any) {
    console.error('Payment error:', err)
    return NextResponse.json({ error: 'Falha ao gerar pagamento' }, { status: 500 })
  }
}
