import { createServerSupabase } from '@/lib/supabase/server'
import { chatCompletion } from '@/lib/deepseek'
import { scanUserData } from '@/lib/scanner'
import { buildVeredictPrompt } from '@/lib/card-generator'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mode, sensitiveTopics } = await request.json()

  // Verificar plano: FREE só pode 1 veredito
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()

  if (profile?.plan === 'FREE') {
    const { count } = await supabase
      .from('veredits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count && count >= 1) {
      return NextResponse.json({ error: 'Plano FREE permite apenas 1 veredito. Faça upgrade para PRO.' }, { status: 402 })
    }
  }

  // Buscar chat history
  const { data: chatSession } = await supabase
    .from('chat_sessions')
    .select('messages')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const chatHistory = chatSession?.messages || []

  // Escanear dados das redes
  const userData = await scanUserData(user.id)

  // Gerar veredito via IA
  const prompt = buildVeredictPrompt(userData, chatHistory, mode)
  const resultRaw = await chatCompletion(
    [{ role: 'user', content: prompt }],
    undefined,
    { temperature: 0.9, maxTokens: 3000, json: true }
  )

  // Parse do JSON
  let veredict: any
  try {
    // Limpar possível markdown code block
    const cleaned = resultRaw.replace(/```json\s*|\s*```/g, '').trim()
    veredict = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Falha ao gerar veredito. Tente novamente.', raw: resultRaw }, { status: 500 })
  }

  // Salvar no banco
  const { data: saved } = await supabase
    .from('veredits')
    .insert({
      user_id: user.id,
      mode,
      veredict_text: veredict.veredict_text,
      veredict_badge: veredict.veredict_badge,
      tags: veredict.tags,
      niche: veredict.niche,
      niche_colors: veredict.niche_colors,
      music_track: veredict.music_track,
      political_stance: veredict.political_stance,
      sensitive_topics: sensitiveTopics,
      profession_label: veredict.profession_label,
      tips: veredict.tips,
    })
    .select()
    .single()

  return NextResponse.json({
    ...veredict,
    veredict_id: saved?.id,
    nano_banana_prompt: veredict.nano_banana_prompt,
  })
}
