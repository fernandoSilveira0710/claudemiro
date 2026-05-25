import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()

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

      // Ativar plano
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
