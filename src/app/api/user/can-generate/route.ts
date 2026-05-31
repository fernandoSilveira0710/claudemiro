import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, flex_type, plan_expires_at, last_generation_at')
    .eq('id', user.id)
    .single()

  const now = new Date()
  const plan = profile?.plan || 'FREE'
  const last = profile?.last_generation_at ? new Date(profile.last_generation_at) : null

  // PRO: ilimitado
  if (plan === 'PRO') {
    return NextResponse.json({ allowed: true })
  }

  // FREE: 1x a cada 15 dias
  if (plan === 'FREE') {
    if (!last) return NextResponse.json({ allowed: true })
    const next = new Date(last.getTime() + 15 * 864e5)
    if (now >= next) return NextResponse.json({ allowed: true })
    return NextResponse.json({
      allowed: false,
      reason: 'free_cooldown',
      nextAt: next.toISOString(),
    })
  }

  // FLEX per_generation: cada geração exige pagamento
  if (plan === 'FLEX' && profile?.flex_type === 'per_generation') {
    // Verifica se tem pagamento pendente aprovado não consumido
    const { data: pendingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'per_generation')
      .eq('status', 'approved')
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (pendingPayment) return NextResponse.json({ allowed: true })

    return NextResponse.json({
      allowed: false,
      reason: 'needs_payment',
      message: 'Geração avulsa requer pagamento de R$3,99',
    })
  }

  // FLEX one_time_monthly: a cada 5 dias dentro do mês
  if (plan === 'FLEX') {
    if (profile?.plan_expires_at && now > new Date(profile.plan_expires_at)) {
      return NextResponse.json({
        allowed: false,
        reason: 'flex_expired',
        message: 'Seu plano FLEX expirou. Faça upgrade.',
      })
    }
    if (!last) return NextResponse.json({ allowed: true })
    const next = new Date(last.getTime() + 5 * 864e5)
    if (now >= next) return NextResponse.json({ allowed: true })
    return NextResponse.json({
      allowed: false,
      reason: 'flex_cooldown',
      nextAt: next.toISOString(),
      message: `Próximo veredito disponível em ${next.toLocaleDateString('pt-BR')}.`,
    })
  }

  return NextResponse.json({ allowed: false, reason: 'unknown' })
}
