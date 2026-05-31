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
    // FLEX — pagamento único (1 mês, gera a cada 5 dias)
    if (type === 'one_time') {
      const { qrCode, qrCodeBase64, paymentId } = await createPixPayment(
        9.99, 'Claudemiro FLEX — 1 mês de vereditos', userEmail
      )

      await supabase.from('payments').insert({
        user_id: user.id,
        amount: 9.99,
        type: 'one_time',
        mercado_pago_id: String(paymentId),
        plan: 'FLEX',
      })

      return NextResponse.json({ qrCode, qrCodeBase64, paymentId })
    }

    // FLEX — por geração (avulso, 1 veredito)
    if (type === 'per_generation') {
      const { qrCode, qrCodeBase64, paymentId } = await createPixPayment(
        3.99, 'Claudemiro — 1 veredito', userEmail
      )

      await supabase.from('payments').insert({
        user_id: user.id,
        amount: 3.99,
        type: 'per_generation',
        mercado_pago_id: String(paymentId),
        plan: 'FLEX',
      })

      return NextResponse.json({ qrCode, qrCodeBase64, paymentId })
    }

    // PRO — assinatura mensal
    if (type === 'subscription') {
      const { initPoint, preferenceId } = await createProSubscription(userEmail)

      await supabase.from('payments').insert({
        user_id: user.id,
        amount: 19.99,
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
