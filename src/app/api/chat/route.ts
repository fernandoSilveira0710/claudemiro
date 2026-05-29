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
    const sorted = [...data.steam.games].sort((a: any, b: any) => b.playtime_forever - a.playtime_forever)
    const totalH = Math.round(data.steam.games.reduce((s: number, g: any) => s + g.playtime_forever, 0) / 60)
    const top5 = sorted.slice(0, 5).map((g: any) => `${g.name}(${Math.round(g.playtime_forever / 60)}h)`)
    L.push(`[STEAM] ${data.steam.games.length} jogos | ${totalH}h total | Top: ${top5.join(', ')}`)
  }

  if (data.spotify?.topArtists?.length) {
    const artists = data.spotify.topArtists.slice(0, 6).map((a: any) => a.name)
    const genres = [...new Set(data.spotify.topArtists.flatMap((a: any) => a.genres || []).slice(0, 6))] as string[]
    L.push(`[SPOTIFY] Artistas: ${artists.join(', ')} | Gêneros: ${genres.join(', ') || 'não detectado'}`)
    if (data.spotify.topTracks?.length) {
      const tracks = data.spotify.topTracks.slice(0, 3).map((t: any) => `${t.name} - ${t.artist}`)
      L.push(`[SPOTIFY TRACKS] ${tracks.join(' | ')}`)
    }
  }

  if (data.instagram) {
    const u = data.instagram.user || data.instagram
    const seg = u.edge_followed_by?.count || u.follower_count || 0
    const bio = (u.biography || data.instagram.biography || '').slice(0, 120)
    L.push(`[INSTAGRAM] @${data.instagram.platform_username || '?'} | ${seg} seguidores | Bio: "${bio}"`)
  }

  if (data.tiktok) {
    const bio = (data.tiktok.signature || '').slice(0, 120)
    const seg = data.tiktok.follower_count || 0
    const videos = data.tiktok.video_count || 0
    L.push(`[TIKTOK] @${data.tiktok.platform_username || '?'} | ${seg} seguidores | ${videos} vídeos | Bio: "${bio}"`)
  }

  if (data.youtube?.subscriptions?.length) {
    const canais = data.youtube.subscriptions.slice(0, 10).map((s: any) => s.snippet?.title || '').filter(Boolean)
    L.push(`[YOUTUBE] Segue: ${canais.join(', ')}`)
  }

  if (data.github) {
    const langs = data.github.top_languages
      ? Object.keys(data.github.top_languages).slice(0, 4).join(', ')
      : 'não informado'
    L.push(`[GITHUB] @${data.github.platform_username || '?'} | ${data.github.public_repos || 0} repos | Linguagens: ${langs}`)
  }

  if (data.discord) {
    L.push(`[DISCORD] ${data.discord.guild_count || 0} servidores`)
  }

  if (data.twitter) {
    L.push(`[TWITTER/X] @${data.twitter.platform_username || '?'} | ${data.twitter.followers_count || 0} seguidores | ${data.twitter.statuses_count || 0} tweets`)
  }

  return L.join('\n') || 'Nenhum dado de redes conectado.'
}

// ============================================================
// PASSO 1: RACIOCÍNIO — analisar estado e decidir categoria
// ============================================================
function buildReasoningPrompt(
  data: string,
  blocked: string[],
  asked: string[],
  history: string,
  mode: string,
  askedQuestions: string[] = [],
  usedDataSources: string[] = []
): string {
  const available = ALL_CATEGORIES.filter(c => !asked.includes(c) && !blocked.includes(c))

  // Detectar quais fontes de dados existem nos dados do usuário
  const allSources = ['STEAM', 'SPOTIFY', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'GITHUB', 'DISCORD', 'TWITTER/X']
  const presentSources = allSources.filter(s => data.includes(`[${s}]`))
  const availableSources = presentSources.filter(s => !usedDataSources.includes(s))
  const mustUseSources = availableSources.length > 0 ? availableSources : presentSources

  const tonePersonality: Record<string, string> = {
    engracado: 'Você é debochado, usa gírias, zoeira pesada, humor ácido. Faz referências à cultura internet BR.',
    casual:    'Você é leve, direto, amigável. Gírias suaves. Sem forçar.',
    profissional: 'Você é analítico, sério. Linguagem formal mas acessível. Zero zoeira.',
  }

  const recentHistory = history.split('\n').slice(-8).join('\n') || 'Início da conversa'
  const questionsAsked = askedQuestions.length
    ? askedQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')
    : 'Nenhuma ainda.'

  return `Você é o Claudemiro, um interrogador de personalidade digital.

## SEU PERFIL DE TOM (NUNCA MUDE ISSO)
${tonePersonality[mode] || tonePersonality.casual}

## DADOS REAIS DO USUÁRIO (use isso pra criar perguntas únicas)
${data}

## TÓPICOS BLOQUEADOS PELO USUÁRIO (NUNCA pergunte sobre estes)
${blocked.length ? blocked.join(', ') : 'nenhum bloqueado'}

## CATEGORIAS DISPONÍVEIS PARA EXPLORAR
${available.join(', ')}

## ROTAÇÃO DE FONTES DE DADOS — REGRA CRÍTICA
Fontes já usadas nas últimas perguntas: [${usedDataSources.join(', ') || 'nenhuma ainda'}]
Fontes DISPONÍVEIS que ainda não foram exploradas: [${availableSources.join(', ') || 'todas já usadas — pode repetir'}]

REGRA: o data_hook da próxima pergunta DEVE vir de uma fonte em [Fontes DISPONÍVEIS].
Se [Fontes DISPONÍVEIS] estiver vazio, use qualquer fonte disponível nos dados.
Exemplos:
- Se STEAM já foi usado 2x e YOUTUBE está disponível → use dado do YOUTUBE
- Se GITHUB está disponível → pergunte sobre código/repos
- Se INSTAGRAM está disponível → pergunte sobre a bio/seguidores
- NUNCA use STEAM ou qualquer outra fonte 2x seguidas, mesmo que a categoria seja diferente

## PERGUNTAS JÁ FEITAS — PROIBIDO REPETIR TEMA OU INTENÇÃO
Regra: uma pergunta nova é repetição se busca a mesma informação que uma já feita,
mesmo usando palavras completamente diferentes.
${questionsAsked}

## ÚLTIMAS MENSAGENS
${recentHistory}

## SUA TAREFA
1. Olhe [Fontes DISPONÍVEIS] — escolha UMA dessas fontes para o data_hook
2. Escolha uma categoria disponível que combine com essa fonte
3. Defina o ângulo específico a partir do dado daquela fonte
4. Verifique: o angle é diferente de tudo já perguntado? Se não, troque o ângulo.

Responda APENAS JSON:
{"category":"...","data_hook":"dado literal da fonte escolhida","data_source":"nome da fonte (ex: GITHUB, YOUTUBE, INSTAGRAM)","angle":"ângulo único","tone_note":"como o tom se aplica aqui"}`
}

// ============================================================
// PASSO 2: DIÁLOGO — gerar a resposta final
// ============================================================
function buildDialogPrompt(data: string, history: string, mode: string, reasoning: any): string {
  const toneVoice: Record<string, string> = {
    engracado:     'debochado, irônico, zoeira pesada, gírias BR (nerdola, otaku fedido, marombeiro, trampa, trampar), emojis expressivos, pode xingar levemente',
    casual:        'leve, direto, gírias suaves, sem forçar humor, conversa natural',
    profissional:  'sério e analítico, linguagem formal mas acessível, sem gírias, sem emojis excessivos',
  }

  return `Você é o Claudemiro. Tom FIXO desta sessão: ${toneVoice[mode] || toneVoice.casual}

## DADOS REAIS DO USUÁRIO (única fonte de verdade)
${data}

## RACIOCÍNIO DA ETAPA ANTERIOR
- Categoria: ${reasoning.category}
- Dado específico a usar: ${reasoning.data_hook || ''}
- Ângulo da pergunta: ${reasoning.angle || ''}
- Tom nesta resposta: ${reasoning.tone_note || ''}

## HISTÓRICO
${history || 'Início da conversa.'}

## REGRA ANTI-INVENÇÃO
Antes de escrever a question:
- O data_hook acima existe literalmente nos DADOS REAIS?
- Se NÃO existe nos dados → ajuste o ângulo para algo que está nos dados.
- NUNCA conecte a resposta do usuário com informações que você não tem.

## SUA TAREFA
Gere APENAS este JSON (sem texto fora):
{
  "comment": "reação ao que o usuário acabou de dizer — 1 frase curta, no tom certo",
  "question": "FORMATO OBRIGATÓRIO: comece com o dado real do data_hook ou com uma provocação baseada nele. NUNCA comece com 'Qual é o seu', 'O que você acha', 'Como você se sente'. Soe como alguém que já sabe sobre você, não como formulário.",
  "options": ["Opção A", "Opção B", "Outro 🖊️"] ou null
}

REGRAS ABSOLUTAS:
- comment: reaja ao que ele ACABOU de dizer (última linha do histórico)
- question: use o data_hook e o angle — se não tiver dado real para sustentar, mude o angle
- options: 2-3 itens específicos ou null. Última opção SEMPRE "Outro 🖊️" quando presente
- NUNCA repita pergunta do histórico`
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
    const reasoningPrompt = buildReasoningPrompt(dataStr, blocked, [], '', mode, [], [])
    const reasoningJson = await chatCompletion([{ role: 'user', content: reasoningPrompt }], undefined, { temperature: 0.7, maxTokens: 300, json: true })
    const reasoning = safeParse(reasoningJson)

    const dialogPrompt = buildDialogPrompt(dataStr, '', mode, reasoning)
    const dialogJson = await chatCompletion([{ role: 'user', content: dialogPrompt }], undefined, { temperature: 0.8, maxTokens: 400, json: true })
    const parsed = safeParse(dialogJson)

    const { data: session } = await supabase.from('chat_sessions').insert({
      user_id: user.id, mode, phase: 'chat', status: 'active',
      messages: [{ role: 'claudemiro', content: dialogJson, parsed, reasoning }],
      phase_data: {
        blockedTopics: blocked,
        askedCategories: [reasoning.category].filter(Boolean),
        askedQuestions: [parsed.question].filter(Boolean),
        usedDataSources: [reasoning.data_source].filter(Boolean),
      },
      scanned_data: raw,
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

    const prevQuestions = (s.phase_data?.askedQuestions || []).slice(0, -1)
    const prevSources = (s.phase_data?.usedDataSources || []).slice(0, -1)
    const reasoningJson = await chatCompletion([{ role: 'user', content: buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode, prevQuestions, prevSources) }], undefined, { temperature: 0.7, maxTokens: 300, json: true })
    const reasoning = safeParse(reasoningJson)
    const dialogJson = await chatCompletion([{ role: 'user', content: buildDialogPrompt(dataStr, hist, s.mode, reasoning) }], undefined, { temperature: 0.8, maxTokens: 400, json: true })
    const parsed = safeParse(dialogJson)

    const restored = [...msgs, { role: 'claudemiro', content: dialogJson, parsed, reasoning }]
    await supabase.from('chat_sessions').update({
      messages: restored,
      phase_data: {
        ...s.phase_data,
        askedCategories: [...asked, reasoning.category].filter(Boolean),
        askedQuestions: [...prevQuestions, parsed.question].filter(Boolean),
        usedDataSources: [...prevSources, reasoning.data_source].filter(Boolean),
      }
    }).eq('id', sessionId)
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
  const askedQuestions = s.phase_data?.askedQuestions || []
  const usedDataSources = s.phase_data?.usedDataSources || []
  const dataStr = digest(s.scanned_data || {})
  const hist = formatHistoryString(msgs)

  // Se já ofereceu veredito antes, não voltar ao loop
  if (asked.includes('veredito')) {
    const parsed: any = { comment: 'Beleza, vamos continuar então.', question: 'O que mais quer saber?', options: ['Gerar veredito', 'Continuar'] }
    msgs.push({ role: 'claudemiro', content: '', parsed, reasoning: {} })
    await supabase.from('chat_sessions').update({ messages: msgs }).eq('id', s.id)
    return NextResponse.json({ type: 'reply', parsed, interactionCount: asked.length, suggestVeredict: true, sessionId: s.id })
  }

  let reasoningPrompt: string
  if (asked.length >= MAX_INTERACTIONS) {
    reasoningPrompt = buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode, askedQuestions, usedDataSources) + '\n[Já são ' + (asked.length + 1) + ' interações. category DEVE ser "veredito".]'
  } else {
    reasoningPrompt = buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode, askedQuestions, usedDataSources)
  }

  const reasoningJson = await chatCompletion([{ role: 'user', content: reasoningPrompt }], undefined, { temperature: 0.7, maxTokens: 300, json: true })
  const reasoning = safeParse(reasoningJson)

  let dialogPrompt: string
  if (reasoning.category === 'veredito') {
    const parsed: any = { comment: 'Já tenho uma opinião formada sobre você.', question: 'Quer ver?', options: ['Gerar veredito', 'Continuar'] }
    msgs.push({ role: 'claudemiro', content: '', parsed, reasoning })
    const newAsked = [...asked, 'veredito']
    const newAskedQuestions = [...askedQuestions, 'Quer ver?']
    await supabase.from('chat_sessions').update({
      messages: msgs,
      phase_data: { ...s.phase_data, askedCategories: newAsked, askedQuestions: newAskedQuestions }
    }).eq('id', s.id)
    return NextResponse.json({ type: 'reply', parsed, interactionCount: newAsked.length, suggestVeredict: true, sessionId: s.id })
  }

  const dialogTemp = mode === 'engracado' ? 0.65 : mode === 'profissional' ? 0.5 : 0.7
  dialogPrompt = buildDialogPrompt(dataStr, hist, s.mode, reasoning)
  const dialogJson = await chatCompletion([{ role: 'user', content: dialogPrompt }], undefined, { temperature: dialogTemp, maxTokens: 400, json: true })
  const parsed = safeParse(dialogJson)
  msgs.push({ role: 'claudemiro', content: dialogJson, parsed, reasoning })
  const newAsked = [...asked, reasoning.category].filter(Boolean)
  const newAskedQuestions = [...askedQuestions, parsed.question].filter(Boolean)
  const newUsedSources = [...usedDataSources, reasoning.data_source].filter(Boolean)
  await supabase.from('chat_sessions').update({
    messages: msgs,
    phase_data: { ...s.phase_data, askedCategories: newAsked, askedQuestions: newAskedQuestions, usedDataSources: newUsedSources }
  }).eq('id', s.id)

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
