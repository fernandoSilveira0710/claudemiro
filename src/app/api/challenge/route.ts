import { createServerSupabase } from '@/lib/supabase/server'
import { chatCompletion } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verificar PRO
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan !== 'PRO') {
    return NextResponse.json({ error: 'Exclusivo para plano PRO' }, { status: 402 })
  }

  // Buscar último veredito
  const { data: lastVeredict } = await supabase
    .from('veredits')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastVeredict) {
    return NextResponse.json({ error: 'Gere um veredito primeiro' }, { status: 400 })
  }

  // Gerar desafios via IA
  const prompt = `Com base nestes dados da pessoa: ${JSON.stringify({
    badge: lastVeredict.veredict_badge,
    tags: lastVeredict.tags,
    niche: lastVeredict.niche,
  })}, gere 3 desafios semanais divertidos e motivacionais. Cada desafio deve ser:
- Curto (1 frase)
- Alcançável em 1 semana
- Relacionado aos interesses dela
- Com tom do modo "${lastVeredict.mode}"

Exemplos: "Ganha +10 seguidores no Instagram", "Zera aquele jogo que tá parado há 3 meses", "Posta 1 stories por dia sem vergonha"

Responda APENAS um JSON: { "challenges": ["desafio 1", "desafio 2", "desafio 3"] }`

  const result = await chatCompletion(
    [{ role: 'user', content: prompt }],
    undefined,
    { temperature: 0.9, maxTokens: 500, json: true }
  )

  let challenges: string[] = []
  try {
    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim()
    challenges = JSON.parse(cleaned).challenges
  } catch {
    challenges = ['Faça algo que te tire da zona de conforto', 'Conecte-se com alguém novo', 'Poste seu veredito nas redes']
  }

  // Salvar desafios
  for (const challengeText of challenges) {
    await supabase.from('challenges').insert({
      user_id: user.id,
      challenge_text: challengeText,
      status: 'active',
    })
  }

  return NextResponse.json({ challenges })
}

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3)

  return NextResponse.json({ challenges: challenges || [] })
}
