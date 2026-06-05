import { createServerSupabase } from '@/lib/supabase/server'
import { checkPaymentStatus } from '@/lib/abacate-pay'
import { NextResponse } from 'next/server'

/**
 * Polling de status de pagamento PIX.
 * O frontend chama aqui a cada ~4s enquanto o QR Code está na tela.
 * Confirma direto na AbacatePay e, se pago, ativa o plano (não depende só do webhook).
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('paymentId')
  if (!paymentId) return NextResponse.json({ error: 'paymentId obrigatório' }, { status: 400 })

  // Confirma que esse pagamento pertence ao usuário
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('mercado_pago_id', paymentId)
    .eq('user_id', user.id)
    .single()

  if (!payment) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })

  // Já aprovado (webhook chegou antes) → responde direto
  if (payment.status === 'approved') {
    return NextResponse.json({ status: 'PAID', plan: payment.plan })
  }

  // Consulta a AbacatePay em tempo real
  try {
    const remote = await checkPaymentStatus(paymentId)

    if (remote.status === 'PAID') {
      // Ativa o plano agora (não espera o webhook)
      const newPlan = payment.type === 'subscription' ? 'PRO' : 'FLEX'
      await supabase.from('payments').update({ status: 'approved' }).eq('id', payment.id)
      await supabase.from('profiles').update({ plan: newPlan }).eq('id', payment.user_id)
      return NextResponse.json({ status: 'PAID', plan: newPlan })
    }

    if (remote.status === 'EXPIRED' || remote.status === 'CANCELLED') {
      return NextResponse.json({ status: 'EXPIRED' })
    }

    return NextResponse.json({ status: 'PENDING' })
  } catch (err) {
    console.error('[payment/status] erro ao consultar AbacatePay:', err)
    return NextResponse.json({ status: 'PENDING' })
  }
}
