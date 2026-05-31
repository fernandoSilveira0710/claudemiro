import { createServerSupabase } from '@/lib/supabase/server'
import { MODELS } from '@/lib/ai'
import { NextResponse } from 'next/server'

// Stream de "pensamentos" do Claudemiro enquanto monta o veredito.
// Retorna texto plano (um pensamento por linha), token a token.
export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json()
  const { data: s } = await supabase.from('chat_sessions').select('*').eq('id', sessionId).single()
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const msgs = (s.messages || []) as any[]
  const userAnswers = msgs
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .slice(0, 20)
    .join(' | ')

  const toneMap: Record<string, string> = {
    engracado: 'debochado, com zoeira leve',
    casual: 'leve e direto',
    profissional: 'analítico e sóbrio',
  }
  const tone = toneMap[s.mode] || toneMap.casual

  const prompt = `Você é o Claudemiro analisando uma pessoa. Tom: ${tone}.
Respostas dela no chat: "${userAnswers}".
Gere de 4 a 6 "pensamentos" curtos (máximo 8 palavras cada), como se estivesse raciocinando em voz alta sobre quem ela é.
Um pensamento por linha. Sem numeração, sem aspas, sem marcadores.
Comece vasculhando ("Vasculhando os dados...") e termine perto de uma conclusão ("Já sei quem é...").`

  const model = (process.env.AI_MODEL && MODELS[process.env.AI_MODEL]) || MODELS.deepseek
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (model.apiKey) headers['Authorization'] = `Bearer ${model.apiKey}`

  const upstream = await fetch(`${model.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 200,
      stream: true,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'stream failed' }, { status: 502 })
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const reader = upstream.body.getReader()

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) { controller.close(); return }
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        const payload = t.slice(5).trim()
        if (payload === '[DONE]') { controller.close(); return }
        try {
          const json = JSON.parse(payload)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) controller.enqueue(encoder.encode(delta))
        } catch { /* linha parcial, ignora */ }
      }
    },
    cancel() { reader.cancel() },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
