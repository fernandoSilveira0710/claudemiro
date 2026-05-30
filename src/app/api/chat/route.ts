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

const MAX_INTERACTIONS = 20
const ALL_CATEGORIES = ['games', 'musica', 'carreira', 'hobbies', 'futebol', 'animes', 'filmes', 'familia', 'relacionamento', 'signo', 'religiao', 'politica', 'internet', 'academia', 'personalidade', 'infancia', 'sonhos', 'medos']
const PERSONAL_CATEGORIES = ['familia', 'relacionamento', 'signo', 'religiao', 'politica', 'personalidade', 'infancia', 'sonhos', 'medos', 'futebol', 'academia']
// 20 perguntas: ~12 de redes (cobrir todas), ~8 de tópicos pessoais (cobrir 70% dos liberados)
const REDES_QUOTA = 12
const TOPICOS_QUOTA = 8
// Posições onde entra tópico pessoal (0-indexado): a cada ~2-3 perguntas de rede
const TOPICO_POSITIONS = new Set([2, 5, 8, 11, 14, 17, 19])

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
    const langs = data.github.top_languages ? Object.keys(data.github.top_languages).slice(0, 4).join(', ') : 'não informado'
    L.push(`[GITHUB] @${data.github.platform_username || '?'} | ${data.github.public_repos || 0} repos | Linguagens: ${langs}`)
  }
  if (data.discord) L.push(`[DISCORD] ${data.discord.guild_count || 0} servidores`)
  if (data.twitter) L.push(`[TWITTER/X] @${data.twitter.platform_username || '?'} | ${data.twitter.followers_count || 0} seguidores | ${data.twitter.statuses_count || 0} tweets`)
  return L.join('\n') || 'Nenhum dado de redes conectado.'
}

// ============================================================
// PASSO 1: RACIOCÍNIO
// ============================================================
function buildReasoningPrompt(
  data: string, blocked: string[], asked: string[], history: string,
  mode: string, askedQuestions: string[] = [], usedDataSources: string[] = []
)
: string {
  const available = ALL_CATEGORIES.filter(cat => !asked.includes(cat) && !blocked.includes(cat))

  // Fontes de redes presentes nos dados
  const allSources = ['STEAM', 'SPOTIFY', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'GITHUB', 'DISCORD', 'TWITTER/X']
  const presentSources = allSources.filter(s => data.includes(`[${s}]`))
  const usedNetworkSources = usedDataSources.filter(s => s !== 'TOPICO')
  const availableSources = presentSources.filter(s => !usedNetworkSources.includes(s))

  // Posição atual na sessão (determinística)
  const totalFeitas = asked.length
  const deveUsarTopico = TOPICO_POSITIONS.has(totalFeitas) ||
    (usedNetworkSources.length >= REDES_QUOTA)

  // Tópicos liberados pelo usuário (não bloqueados, pessoais)
  const availablePersonal = available.filter(cat => PERSONAL_CATEGORIES.includes(cat))

  // Tópicos liberados que ainda não foram perguntados (para garantir cobertura de 70%)
  const topicosLiberados = PERSONAL_CATEGORIES.filter(cat => !blocked.includes(cat))
  const topicosNaoFeitos = topicosLiberados.filter(cat => !asked.includes(cat))
  const coberturaTopicos = topicosLiberados.length > 0
    ? (topicosLiberados.length - topicosNaoFeitos.length) / topicosLiberados.length
    : 1
  // Se faltam muitas perguntas pra atingir 70% de cobertura, priorizar tópico
  const perguntasRestantes = MAX_INTERACTIONS - totalFeitas
  const topicosNecessarios = Math.ceil(topicosLiberados.length * 0.7) - (topicosLiberados.length - topicosNaoFeitos.length)
  const devePriorizarTopico = deveUsarTopico || (topicosNecessarios > 0 && perguntasRestantes <= topicosNecessarios + 2)

  const tonePersonality: Record<string, string> = {
    engracado: 'Você é debochado, usa gírias, zoeira pesada, humor ácido. Faz referências à cultura internet BR.',
    casual: 'Você é leve, direto, amigável. Gírias suaves. Sem forçar.',
    profissional: 'Você é analítico, sério. Linguagem formal mas acessível. Zero zoeira.',
  }

  const recentHistory = history.split('\n').slice(-6).join('\n') || 'Início da conversa'
  const questionsAsked = askedQuestions.length
    ? askedQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')
    : 'Nenhuma ainda.'

  const tipoInstrucao = devePriorizarTopico
    ? `## TIPO AGORA: TÓPICO PESSOAL
Categorias pessoais ainda não perguntadas: [${availablePersonal.filter(c => !asked.includes(c)).join(', ') || 'todas cobertas — repita alguma com ângulo novo'}]
Meta de cobertura: 70% dos tópicos liberados. Cobertura atual: ${Math.round(coberturaTopicos * 100)}%
Tópicos ainda necessários para meta: ${Math.max(0, topicosNecessarios)}

REGRA: esta pergunta é sobre a VIDA REAL — sem citar jogos, Steam, redes sociais, dados digitais.
Escolha UMA categoria e faça UMA pergunta direta. Conecte com o histórico se soar natural.

Exemplos de perguntas por categoria:
- relacionamento → "tá solteiro, enrolado ou é casado(a) sofrido(a)?"
- familia → "família presente no dia a dia ou cada um no seu canto?"
- signo → "qual o signo? acredita ou acha papo de losango?"
- infancia → "qual era o sonho da infância antes da vida cobrar o aluguel?"
- sonhos → "tem algum plano grande engavetado esperando o momento certo?"
- medos → "qual o maior medo que não fala em voz alta nem pra travesseiro?"
- politica → "vota em quem? pode falar, prometo que não vou julgar (muito)"
- academia → "academia: vai, renova e não vai, ou nem assina?"
- futebol → "qual time? e como lida quando perde — nega, sofre ou culpa o árbitro?"
- carreira → "tá satisfeito com o trampo ou só esperando a sexta-feira?"
- internet → "qual treta da internet te faz perder a fé na humanidade?"

PROIBIDO no comment e na question: Steam, jogos, redes, plataformas digitais.
data_hook = null. data_source = "TOPICO".`
    : `## TIPO AGORA: REDE SOCIAL
Fontes presentes: [${presentSources.join(', ')}]
Fontes usadas: [${usedNetworkSources.join(', ') || 'nenhuma'}]
Última usada: ${usedNetworkSources[usedNetworkSources.length - 1] || 'nenhuma'}
Fontes NÃO exploradas ainda: [${availableSources.join(', ') || 'todas já usadas'}]

OBRIGATÓRIO: usar uma fonte de [Fontes NÃO exploradas ainda]. Se todas usadas, qualquer exceto a última.
data_source = nome exato da rede (STEAM, SPOTIFY, INSTAGRAM, TIKTOK, YOUTUBE, GITHUB, DISCORD, TWITTER/X).

REGRA DE QUALIDADE: se a fonte escolhida só tem dados zerados (0 seguidores, 0 repos, 0 vídeos)
e já houve outra pergunta sobre "zero de algo", prefira uma fonte com dados reais para variar.`

  return `Você é o Claudemiro. Papel: INTERROGADOR DE PERSONALIDADE, não analista.
Seu trabalho agora é COLETAR, não concluir. Guarde as conclusões para o veredito final.

## TOM FIXO
${tonePersonality[mode] || tonePersonality.casual}

## DADOS DAS REDES
${data}

## TÓPICOS BLOQUEADOS
${blocked.length ? blocked.join(', ') : 'nenhum'}

## PROGRESSO DA SESSÃO
Pergunta ${totalFeitas + 1} de ${MAX_INTERACTIONS}.
Redes exploradas: [${usedNetworkSources.join(', ') || 'nenhuma'}] de [${presentSources.join(', ')}]
Tópicos cobertos: ${Math.round(coberturaTopicos * 100)}% (meta: 70%)
Categorias perguntadas: [${asked.join(', ') || 'nenhuma'}]

${tipoInstrucao}

## PERGUNTAS JÁ FEITAS — NÃO REPETIR TEMA NEM INTENÇÃO
${questionsAsked}

## ÚLTIMAS TROCAS
${recentHistory}

## TAREFA
Escolha a próxima pergunta seguindo o tipo acima.
O comment reage à última resposta. A question coleta nova informação.
NÃO analise, NÃO conclua, NÃO dê veredito parcial — apenas pergunte.

Responda APENAS JSON:
{"category":"...","data_hook":"dado literal ou null","data_source":"TOPICO ou nome exato da rede","angle":"ângulo único da pergunta","tone_note":"como o tom se aplica aqui"}`
}


// ============================================================
// PASSO 2: DIÁLOGO
// ============================================================
function buildDialogPrompt(data: string, history: string, mode: string, reasoning: any): string {
  const toneVoice: Record<string, string> = {
    engracado: 'debochado, irônico, zoeira pesada, gírias BR (nerdola, otaku fedido, marombeiro, trampa, trampar), emojis expressivos, pode xingar levemente',
    casual: 'leve, direto, gírias suaves, sem forçar humor, conversa natural',
    profissional: 'sério e analítico, linguagem formal mas acessível, sem gírias, sem emojis excessivos',
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

## PAPEL
Você coleta informações, NÃO analisa ainda. Não dê conclusões, não faça veredito parcial.
O comment reage ao que ele disse. A question avança para nova informação.

## SUA TAREFA
Gere APENAS este JSON (sem texto fora):
{
  "comment": "reação curta e com personalidade ao que o usuário acabou de dizer — foque no que ele DISSE, não em dados das redes. 1 frase no tom certo. Não seja neutro, mas também não tire conclusões ou faça análise profunda.",
  "question": "pergunta única para coletar nova informação. Se tem data_hook: cite o dado real. Se é tópico pessoal: pergunta direta sobre a vida sem citar redes/jogos. NUNCA comece com Qual é o seu / O que você acha / Como você se sente.",
  "options": ["Opção A", "Opção B", "Outro 🖊️"] ou null
}

REGRAS:
- comment: reaja à ÚLTIMA resposta do usuário. Sem veredito parcial, sem "então você é X".
- question: UMA pergunta, ângulo novo, informação ainda não coletada.
- options: 2-4 curtas e específicas, ou null. Última SEMPRE "Outro 🖊️" se tiver opções.
- NUNCA repita pergunta do histórico nem tema já esgotado.`
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
        usedDataSources: [normalizeDataSource(reasoning.data_source)].filter(Boolean),
      },
      scanned_data: raw,
    }).select().single()
    return NextResponse.json({ type: 'start', parsed, sessionId: session?.id, interactionCount: 1 })
  }

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
      messages: restored, phase_data: { ...s.phase_data, askedCategories: [...asked, reasoning.category].filter(Boolean), askedQuestions: [...prevQuestions, parsed.question].filter(Boolean), usedDataSources: [...prevSources, normalizeDataSource(reasoning.data_source)].filter(Boolean) }
    }).eq('id', sessionId)
    return NextResponse.json({ type: 'undo', messages: restored, interactionCount: asked.length })
  }

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

  let reasoningPrompt: string
  if (asked.length >= MAX_INTERACTIONS) {
    reasoningPrompt = buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode, askedQuestions, usedDataSources) + '\n[' + asked.length + ' perguntas feitas. Chega — category DEVE ser "veredito" agora.]'
  } else {
    reasoningPrompt = buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode, askedQuestions, usedDataSources)
  }

  const reasoningJson = await chatCompletion([{ role: 'user', content: reasoningPrompt }], undefined, { temperature: 0.7, maxTokens: 300, json: true })
  const reasoning = safeParse(reasoningJson)

  if (reasoning.category === 'veredito') {
    const parsed: any = { comment: 'Já tenho uma opinião formada sobre você.', question: 'Quer ver?', options: ['Gerar veredito', 'Continuar'] }
    msgs.push({ role: 'claudemiro', content: '', parsed, reasoning })
    const newAsked = [...asked, 'veredito']
    const newAskedQuestions = [...askedQuestions, 'Quer ver?']
    await supabase.from('chat_sessions').update({ messages: msgs, phase_data: { ...s.phase_data, askedCategories: newAsked, askedQuestions: newAskedQuestions } }).eq('id', s.id)
    return NextResponse.json({ type: 'reply', parsed, interactionCount: newAsked.length, suggestVeredict: true, sessionId: s.id })
  }

  const dialogTemp = mode === 'engracado' ? 0.65 : mode === 'profissional' ? 0.5 : 0.7
  const dialogPrompt = buildDialogPrompt(dataStr, hist, s.mode, reasoning)
  const dialogJson = await chatCompletion([{ role: 'user', content: dialogPrompt }], undefined, { temperature: dialogTemp, maxTokens: 400, json: true })
  const parsed = safeParse(dialogJson)
  msgs.push({ role: 'claudemiro', content: dialogJson, parsed, reasoning })
  const newAsked = [...asked, reasoning.category].filter(Boolean)
  const newAskedQuestions = [...askedQuestions, parsed.question].filter(Boolean)
  const newUsedSources = [...usedDataSources, normalizeDataSource(reasoning.data_source)].filter(Boolean)
  await supabase.from('chat_sessions').update({ messages: msgs, phase_data: { ...s.phase_data, askedCategories: newAsked, askedQuestions: newAskedQuestions, usedDataSources: newUsedSources } }).eq('id', s.id)

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

function normalizeDataSource(raw: string | undefined | null): string | null {
  if (!raw) return null
  const upper = raw.toUpperCase().trim()
  if (upper === 'TOPICO' || upper === 'TÓPICO' || upper === 'TOPIC') return 'TOPICO'
  const sourceMap: Record<string, string> = {
    STEAM: 'STEAM', SPOTIFY: 'SPOTIFY', INSTAGRAM: 'INSTAGRAM',
    TIKTOK: 'TIKTOK', YOUTUBE: 'YOUTUBE', GITHUB: 'GITHUB',
    DISCORD: 'DISCORD', TWITTER: 'TWITTER/X', 'TWITTER/X': 'TWITTER/X', X: 'TWITTER/X',
  }
  for (const [key, val] of Object.entries(sourceMap)) {
    if (upper.includes(key)) return val
  }
  return null
}

function safeParse(json: string): any {
  try { return JSON.parse(json.replace(/```json\s*|\s*```/g, '').trim()) } catch { return { category: 'hobbies', connection: '', tone_note: '', comment: '', question: json.slice(0, 200), options: null } }
}
