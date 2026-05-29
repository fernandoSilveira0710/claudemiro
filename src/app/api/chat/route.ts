import { createServerSupabase } from '@/lib/supabase/server'
import { chatCompletion } from '@/lib/ai'
import { scanUserData, ScannedUserData } from '@/lib/scanner'
import { buildVeredictPrompt } from '@/lib/card-generator'
import { NextResponse } from 'next/server'

export const AVAILABLE_TOPICS = [
  { id: 'games', label: 'Games', emoji: '🎮' }, { id: 'animes', label: 'Animes', emoji: '🐉' },
  { id: 'filmes', label: 'Filmes/Séries', emoji: '🎬' }, { id: 'futebol', label: 'Futebol', emoji: '⚽' },
  { id: 'musica', label: 'Música', emoji: '🎵' }, { id: 'politica', label: 'Política', emoji: '🗳️' },
  { id: 'religiao', label: 'Religião', emoji: '🙏' }, { id: 'signo', label: 'Signo/Espiritualidade', emoji: '🔮' },
  { id: 'relacionamento', label: 'Relacionamento', emoji: '💘' }, { id: 'carreira', label: 'Carreira/Trampo', emoji: '💼' },
  { id: 'academia', label: 'Academia/Fitness', emoji: '💪' }, { id: 'internet', label: 'Tretas da Internet', emoji: '🍿' },
]

const MAX_INTERACTIONS = 8
const ALL_CATEGORIES = ['games', 'musica', 'carreira', 'hobbies', 'futebol', 'animes', 'filmes', 'familia', 'relacionamento', 'signo', 'religiao', 'politica', 'internet', 'academia', 'personalidade', 'infancia', 'sonhos', 'medos']

function digest(data: any): string {
  const L: string[] = []
  if (data.steam?.games?.length) {
    const h = Math.round(data.steam.games.reduce((s: number, g: any) => s + g.playtime_forever, 0) / 60)
    L.push(`Steam: ${data.steam.games.length} jogos, ${h}h. Top: ${data.steam.games.sort((a: any, b: any) => b.playtime_forever - a.playtime_forever).slice(0, 5).map((g: any) => `${g.name}(${Math.round(g.playtime_forever / 60)}h)`).join(', ')}`)
  }
  if (data.spotify?.topArtists?.length) L.push(`Spotify: ${data.spotify.topArtists.slice(0, 5).map((a: any) => a.name).join(', ')}`)
  if (data.instagram) { const u = data.instagram.user || data.instagram; L.push(`Instagram: @${data.instagram.platform_username || '?'} (${u.edge_followed_by?.count || 0} seg). Bio: "${(u.biography || data.instagram.biography || '').slice(0, 100)}"`) }
  if (data.tiktok) L.push(`TikTok: @${data.tiktok.platform_username || '?'}. Bio: "${(data.tiktok.signature || '').slice(0, 100)}"`)
  if (data.youtube?.subscriptions?.length) L.push(`YouTube: segue ${data.youtube.subscriptions.slice(0, 8).map((s: any) => s.snippet?.title || '').filter(Boolean).join(', ')}`)
  if (data.github) L.push(`GitHub: @${data.github.platform_username || '?'}, ${data.github.public_repos || 0} repos`)
  return L.join('\n') || 'Nenhum dado.'
}

// ============================================================
// PASSO 1: RACIOCÍNIO — analisar estado e decidir categoria
// ============================================================
function buildReasoningPrompt(data: string, blocked: string[], asked: string[], history: string, mode: string): string {
  const available = ALL_CATEGORIES.filter(c => !asked.includes(c) && !blocked.includes(c))
  const tones: Record<string, string> = { engracado: 'debochado, zoeira, gírias', casual: 'leve, direto', profissional: 'sério, analítico' }
  return `=== ANÁLISE DE ESTADO ===
Categorias JÁ perguntadas: [${asked.join(', ') || 'nenhuma'}]
Categorias DISPONÍVEIS: [${available.join(', ')}]
Tom: ${tones[mode] || 'casual'}

=== DADOS ===
${data}

=== ÚLTIMAS MENSAGENS ===
${history.split('\n').slice(-6).join('\n') || 'Início'}

=== SUA TAREFA ===
Analise os dados e o histórico. Escolha UMA categoria disponível para a próxima pergunta. Depois pense em COMO conectar o que o usuário acabou de dizer com essa categoria.

Responda com JSON: {"category":"categoria escolhida","connection":"como conectar a última resposta do usuário com essa categoria (1 frase)","tone_note":"ajuste de tom baseado no que o usuário disse (ex: 'usuário foi seco, responder mais direto' ou 'usuário engajou, manter ritmo')"}

Regra: escolha uma categoria DISPONÍVEL. NUNCA repita categoria já perguntada.`
}

// ============================================================
// PASSO 2: DIÁLOGO — gerar a resposta final
// ============================================================
function buildDialogPrompt(data: string, history: string, mode: string, reasoning: any): string {
  const tones: Record<string, string> = { engracado: 'debochado, irônico, zoeira, gírias (nerdola, otaku fedido, marombeiro), emojis', casual: 'leve, direto, gírias suaves', profissional: 'sério, analítico, formal' }
  return `=== CONTEXTO ===
Tom: ${tones[mode] || 'casual'}
Dados do usuário: ${data}
${reasoning.tone_note ? `Ajuste de tom: ${reasoning.tone_note}` : ''}

=== RACIOCÍNIO ===
Categoria escolhida: ${reasoning.category}
Conexão com última resposta: ${reasoning.connection}

=== HISTÓRICO ===
${history || 'Início da conversa.'}

=== SUA TAREFA ===
Com base no raciocínio acima, gere a resposta. JSON:
{"comment":"reação ao que o usuário disse (1 frase, tom correto)","question":"próxima pergunta (1 frase, sobre a categoria ${reasoning.category})","options":["A","B"] ou null}

Regras:
- comment: reaja ao que o usuário ACABOU de dizer. Conecte com os DADOS.
- question: UMA pergunta sobre ${reasoning.category}. Seja ESPECÍFICA.
- options: 2-3 opções curtas OU null. Última opção SEMPRE "Outro 🖊️".
- NUNCA invente dados. NUNCA use exemplos prontos.`
}

// ============================================================
// POST
// ============================================================
export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, mode, blockedTopics, sessionId, undo, requestVeredict } = await req.json()
  const blocked = blockedTopics || []

  // INICIAR
  if (!message || message === '__START__') {
    let raw: ScannedUserData = {}
    try { raw = await scanUserData(user.id) } catch {}
    const dataStr = digest(raw)
    const reasoningPrompt = buildReasoningPrompt(dataStr, blocked, [], '', mode)
    const reasoningJson = await chatCompletion([{ role: 'user', content: reasoningPrompt }], undefined, { temperature: 0.7, maxTokens: 200, json: true })
    const reasoning = safeParse(reasoningJson)

    const dialogPrompt = buildDialogPrompt(dataStr, '', mode, reasoning)
    const dialogJson = await chatCompletion([{ role: 'user', content: dialogPrompt }], undefined, { temperature: 0.8, maxTokens: 300, json: true })
    const parsed = safeParse(dialogJson)

    const { data: session } = await supabase.from('chat_sessions').insert({
      user_id: user.id, mode, phase: 'chat', status: 'active',
      messages: [{ role: 'claudemiro', content: dialogJson, parsed, reasoning }],
      phase_data: { blockedTopics: blocked, askedCategories: [reasoning.category].filter(Boolean) }, scanned_data: raw,
    }).select().single()

    return NextResponse.json({ type: 'start', parsed, sessionId: session?.id, interactionCount: 1 })
  }

  // DESFAZER
  if (undo && sessionId) {
    const { data: s } = await supabase.from('chat_sessions').select('*').eq('id', sessionId).single()
    if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const msgs = (s.messages || []).slice(0, -2)
    const asked = (s.phase_data?.askedCategories || []).slice(0, -1)
    const dataStr = digest(s.scanned_data || {})
    const hist = formatHistoryString(msgs)

    const reasoningJson = await chatCompletion([{ role: 'user', content: buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode) }], undefined, { temperature: 0.7, maxTokens: 200, json: true })
    const reasoning = safeParse(reasoningJson)
    const dialogJson = await chatCompletion([{ role: 'user', content: buildDialogPrompt(dataStr, hist, s.mode, reasoning) }], undefined, { temperature: 0.8, maxTokens: 300, json: true })
    const parsed = safeParse(dialogJson)

    const restored = [...msgs, { role: 'claudemiro', content: dialogJson, parsed, reasoning }]
    await supabase.from('chat_sessions').update({ messages: restored, phase_data: { ...s.phase_data, askedCategories: [...asked, reasoning.category].filter(Boolean) } }).eq('id', sessionId)
    return NextResponse.json({ type: 'undo', messages: restored, interactionCount: asked.length })
  }

  // VEREDITO
  if (requestVeredict && sessionId) {
    const { data: s } = await supabase.from('chat_sessions').select('*').eq('id', sessionId).single()
    if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const msgs = s.messages || []
    const resultRaw = await chatCompletion([{ role: 'user', content: buildVeredictPrompt(s.scanned_data || {}, msgs, s.mode) }], undefined, { temperature: 0.9, maxTokens: 3000, json: true })
    let veredict: any
    try { veredict = JSON.parse(resultRaw.replace(/```json\s*|\s*```/g, '').trim()) } catch { return NextResponse.json({ error: 'Falha', raw: resultRaw }, { status: 500 }) }
    const { data: saved } = await supabase.from('veredits').insert({
      user_id: user.id, mode: s.mode, veredict_text: veredict.veredict_text, veredict_badge: veredict.veredict_badge,
      tags: veredict.tags, niche: veredict.niche, niche_colors: veredict.niche_colors, profession_label: veredict.profession_label, tips: veredict.tips,
    }).select().single()
    const vmsg = `🏆 *VEREDITO*\n\n${veredict.veredict_text}\n\n📛 ${veredict.veredict_badge || ''}`
    msgs.push({ role: 'claudemiro', content: vmsg, veredict: true })
    await supabase.from('chat_sessions').update({ phase: 'done', status: 'completed', messages: msgs }).eq('id', sessionId)
    return NextResponse.json({ type: 'veredict', content: vmsg, veredict: { ...veredict, id: saved?.id }, veredictId: saved?.id, messages: msgs })
  }

  // CONTINUAR
  const { data: s } = await supabase.from('chat_sessions').select('*')
    .eq(sessionId ? 'id' : 'user_id', sessionId || user.id).eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1).single()
  if (!s) return NextResponse.json({ error: 'No active session' }, { status: 404 })

  const msgs = [...(s.messages || []), { role: 'user', content: message }]
  const asked = s.phase_data?.askedCategories || []
  const dataStr = digest(s.scanned_data || {})
  const hist = formatHistoryString(msgs)

  let reasoningPrompt: string
  if (asked.length >= MAX_INTERACTIONS) {
    reasoningPrompt = buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode) + '\n[Já são ' + (asked.length + 1) + ' interações. category DEVE ser "veredito".]'
  } else {
    reasoningPrompt = buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode)
  }

  const reasoningJson = await chatCompletion([{ role: 'user', content: reasoningPrompt }], undefined, { temperature: 0.7, maxTokens: 200, json: true })
  const reasoning = safeParse(reasoningJson)

  let dialogPrompt: string
  if (reasoning.category === 'veredito') {
    // Forçar veredito
    const parsed: any = { comment: 'Já tenho uma opinião formada sobre você.', question: 'Quer ver?', options: ['Gerar veredito', 'Continuar'] }
    msgs.push({ role: 'claudemiro', content: '', parsed, reasoning })
    await supabase.from('chat_sessions').update({ messages: msgs }).eq('id', s.id)
    return NextResponse.json({ type: 'reply', parsed, interactionCount: asked.length + 1, suggestVeredict: true, sessionId: s.id })
  }

  dialogPrompt = buildDialogPrompt(dataStr, hist, s.mode, reasoning)
  const dialogJson = await chatCompletion([{ role: 'user', content: dialogPrompt }], undefined, { temperature: 0.8, maxTokens: 300, json: true })
  const parsed = safeParse(dialogJson)
  msgs.push({ role: 'claudemiro', content: dialogJson, parsed, reasoning })
  const newAsked = [...asked, reasoning.category].filter(Boolean)
  await supabase.from('chat_sessions').update({ messages: msgs, phase_data: { ...s.phase_data, askedCategories: newAsked } }).eq('id', s.id)

  return NextResponse.json({ type: 'reply', parsed, interactionCount: newAsked.length, suggestVeredict: newAsked.length >= MAX_INTERACTIONS, sessionId: s.id })
}

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: s } = await supabase.from('chat_sessions').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single()
  if (!s) return NextResponse.json({ hasSession: false })
  return NextResponse.json({ hasSession: true, sessionId: s.id, mode: s.mode, messages: s.messages || [], blockedTopics: s.phase_data?.blockedTopics || [] })
}

function formatHistoryString(msgs: any[]): string {
  return msgs.map(m => m.role === 'claudemiro' ? `C: ${m.parsed?.comment || ''} ${m.parsed?.question || ''}` : `U: ${m.content}`).join('\n')
}

function safeParse(json: string): any {
  try { return JSON.parse(json.replace(/```json\s*|\s*```/g, '').trim()) } catch { return { category: 'hobbies', connection: '', tone_note: '', comment: '', question: json.slice(0, 200), options: null } }
}
