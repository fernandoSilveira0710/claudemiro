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

// Categorias que NÃO precisam de dados de rede (vida pessoal + tópicos da lista)
const PERSONAL_CATEGORIES = ['familia', 'relacionamento', 'signo', 'religiao', 'politica', 'personalidade', 'infancia', 'sonhos', 'medos', 'futebol', 'academia', 'musica', 'animes', 'filmes', 'internet', 'carreira']

// IDs dos tópicos da tela de seleção — o que o usuário marcou como bloqueado vem daqui
const SELECTABLE_TOPIC_IDS = ['games', 'animes', 'filmes', 'futebol', 'musica', 'politica', 'religiao', 'signo', 'relacionamento', 'carreira', 'academia', 'internet']

// Meta: cobrir pelo menos 65% dos tópicos liberados (não bloqueados)
const TOPIC_COVERAGE_TARGET = 0.65

// 20 perguntas: ~11 de redes + ~9 de tópicos (garantir cobertura dos liberados)
const REDES_QUOTA = 11
const TOPICOS_QUOTA = 9

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
  mode: string, askedQuestions: string[] = [], usedDataSources: string[] = [],
  lastCategories: string[] = []
)
: string {
  const available = ALL_CATEGORIES.filter(cat => !asked.includes(cat) && !blocked.includes(cat))

  // Fontes de redes presentes nos dados
  const allSources = ['STEAM', 'SPOTIFY', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'GITHUB', 'DISCORD', 'TWITTER/X']
  const presentSources = allSources.filter(s => data.includes(`[${s}]`))
  const usedNetworkSources = usedDataSources.filter(s => s !== 'TOPICO')
  const availableSources = presentSources.filter(s => !usedNetworkSources.includes(s))

  // Contagens reais baseadas em usedDataSources (fonte de verdade)
  const redesFeitas = usedNetworkSources.length
  const topicosFeitos = usedDataSources.filter(s => s === 'TOPICO').length
  const totalFeitas = redesFeitas + topicosFeitos

  // Proporção 2:1 — a cada 2 redes, 1 tópico obrigatório
  const deveUsarTopico =
    (redesFeitas >= REDES_QUOTA) ||
    (topicosFeitos < TOPICOS_QUOTA && redesFeitas >= (topicosFeitos + 1) * 2)

  // Tópicos da tela de seleção que o usuário NÃO bloqueou
  const topicosLiberados = SELECTABLE_TOPIC_IDS.filter(id => !blocked.includes(id))
  // Quais desses já foram cobertos (o asked contém a categoria correspondente)
  const topicosJaCobertos = topicosLiberados.filter(id => asked.includes(id))
  const topicosNaoFeitos = topicosLiberados.filter(id => !asked.includes(id))
  const coberturaTopicos = topicosLiberados.length > 0
    ? topicosJaCobertos.length / topicosLiberados.length
    : 1
  // Quantos ainda precisam ser feitos para atingir a meta
  const metaNumerica = Math.ceil(topicosLiberados.length * TOPIC_COVERAGE_TARGET)
  const topicosNecessarios = Math.max(0, metaNumerica - topicosJaCobertos.length)
  const perguntasRestantes = MAX_INTERACTIONS - totalFeitas

  // Categorias pessoais disponíveis — inclui todos os tópicos da lista + categorias pessoais extras
  const availablePersonal = available.filter(cat => PERSONAL_CATEGORIES.includes(cat))

  // Forçar tópico se: proporção 2:1 atingida, cota de redes esgotada,
  // ou emergência de cobertura (não vai sobrar perguntas suficientes)
  const emergenciaCobertura = topicosNecessarios > 0 && perguntasRestantes <= topicosNecessarios + 2
  const devePriorizarTopico = deveUsarTopico || emergenciaCobertura

  const tonePersonality: Record<string, string> = {
    engracado: 'Você é debochado e afiado, mas inteligente. O humor vem de observações espertas sobre contradições e ironias reais nos dados — nunca de xingar ou repetir bordões. Gírias BR naturais.',
    casual: 'Você é leve, direto, amigável. Gírias suaves. Sem forçar.',
    profissional: 'Você é analítico, sério. Linguagem formal mas acessível. Zero zoeira.',
  }

  const recentHistory = history.split('\n').slice(-6).join('\n') || 'Início da conversa'
  const questionsAsked = askedQuestions.length
    ? askedQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')
    : 'Nenhuma ainda.'

  const tipoInstrucao = devePriorizarTopico
    ? `## TIPO AGORA: TÓPICO PESSOAL
PENDENTES (cobrir pelo menos): [${topicosNaoFeitos.slice(0, 8).join(', ') || 'todos cobertos'}]
Meta: ${Math.round(TOPIC_COVERAGE_TARGET * 100)}% dos tópicos liberados. Atual: ${Math.round(coberturaTopicos * 100)}% (${topicosJaCobertos.length}/${topicosLiberados.length})
Tópicos necessários ainda: ${topicosNecessarios}
PRIORIDADE: escolha da lista PENDENTES acima — especialmente os primeiros.

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
- musica → "que tipo de música ouve? tem algum artista que define seu estado de espírito?"
- animes → "curte anime? qual foi o que mais te marcou ou não aguenta nem o nome?"
- filmes → "último filme ou série que te prendeu do início ao fim?"
- internet → "qual treta da internet recente te tirou do sério ou pareceu surreal demais?"
- carreira → "tá satisfeito com o trabalho atual ou já com um pé fora?"
- hobbies → "fora os games, o que você faz quando quer desligar a cabeça?"
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
Pergunta ${totalFeitas + 1}/${MAX_INTERACTIONS} | Redes: ${redesFeitas}/${REDES_QUOTA} | Tópicos: ${topicosJaCobertos.length}/${metaNumerica} necessários (meta ${Math.round(TOPIC_COVERAGE_TARGET*100)}%)
Redes usadas: [${usedNetworkSources.join(', ') || 'nenhuma'}] | Disponíveis: [${availableSources.join(', ') || 'todas usadas'}]
Tópicos já cobertos: [${topicosJaCobertos.join(', ') || 'nenhum'}]
Tópicos PENDENTES: [${topicosNaoFeitos.join(', ') || 'todos cobertos'}]

${tipoInstrucao}

## PERGUNTAS JÁ FEITAS — NÃO REPETIR TEMA NEM INTENÇÃO
${questionsAsked}

## ÚLTIMAS TROCAS
${recentHistory}

## ÚLTIMAS 3 CATEGORIAS USADAS (proibido repetir assunto delas)
${lastCategories.length ? lastCategories.map((c,i) => `${i+1}. ${c}`).join(', ') : 'nenhuma ainda'}
REGRA CRÍTICA: a próxima pergunta deve ser sobre um assunto DIFERENTE das últimas 3 acima.
Mesmo que a categoria mude no nome, se o ASSUNTO for parecido (ex: família, pai, mãe, irmão = mesmo cluster), é repetição.

## TAREFA
Escolha a próxima pergunta seguindo o tipo acima.
NÃO analise, NÃO conclua — apenas colete nova informação sobre um assunto diferente dos recentes.

Responda APENAS JSON:
{"category":"...","data_hook":"dado literal ou null","data_source":"TOPICO ou nome exato da rede","angle":"ângulo único da pergunta","tone_note":"como o tom se aplica aqui"}`
}


// ============================================================
// PASSO 2: DIÁLOGO
// ============================================================
function buildDialogPrompt(data: string, history: string, mode: string, reasoning: any): string {
  const toneVoice: Record<string, string> = {
    engracado: 'observador e debochado como um amigo afiado. O humor vem da OBSERVAÇÃO ESPECÍFICA (notar uma contradição, uma ironia real no que a pessoa disse), nunca de xingar. Gírias BR naturais. PROIBIDO usar "otário", "nerdola", "bot", "fantasma" ou xingar a pessoa. Seja esperto, não grosseiro.',
    casual: 'leve, direto, gírias suaves, sem forçar humor, conversa natural',
    profissional: 'sério e analítico, linguagem formal mas acessível, sem gírias, sem emojis excessivos',
  }

  const lines = (history || '').split('\n').filter(Boolean)
  const lastUserLine = [...lines].reverse().find(l => l.startsWith('U:'))?.replace(/^U:\s*/, '') || null
  const isOpening = !lastUserLine

  // ── ABERTURA: sem comment (não há resposta pra reagir), só a primeira pergunta ──
  if (isOpening) {
    return `Você é o Claudemiro. Tom: ${toneVoice[mode] || toneVoice.casual}

Esta é a PRIMEIRA pergunta da conversa. Ainda não há resposta do usuário, então NÃO existe nada pra comentar.

## DADO REAL PRA USAR NA PERGUNTA
${reasoning.data_hook || '(sem dado — faça pergunta de abertura leve)'}
Ângulo: ${reasoning.angle || ''}

## REGRAS
- comment: deixe VAZIO ("").
- question: UMA pergunta curta, de UM único foco. Se há dado real acima, CITE ELE LITERALMENTE com o número exato (ex: "311h em Lethal Company" — nunca "centenas de horas"). NÃO misture dois assuntos.
- options: DEVEM ser respostas válidas pra pergunta. Se a pergunta é sobre jogo, opções de jogo. Se não der pra fazer opções coerentes, use null.
- NÃO comece com "Qual é o seu" / "O que você acha".

Gere APENAS este JSON:
{"comment": "", "question": "pergunta de abertura de foco único citando o dado real", "options": ["A", "B", "Outro 🖊️"] ou null}`
  }

  // ── CONVERSA NORMAL ──
  return `Você é o Claudemiro. Tom FIXO desta sessão: ${toneVoice[mode] || toneVoice.casual}

## A ÚLTIMA RESPOSTA DO USUÁRIO (o comment reage SÓ a isto)
"${lastUserLine}"

## PRÓXIMA PERGUNTA — instruções do raciocínio
- Categoria: ${reasoning.category}
- Dado pontual a citar (se houver): ${reasoning.data_hook || '(nenhum — pergunta pessoal)'}
- Ângulo: ${reasoning.angle || ''}
- Tom nesta resposta: ${reasoning.tone_note || ''}

## REGRA DE OURO DO COMMENT
O comment reage EXCLUSIVAMENTE à última resposta do usuário acima.
É PROIBIDO o comment citar dados das redes (horas, seguidores, repos, canais) — esses dados pertencem à QUESTION.
O comment nasce da resposta atual. Se serviria pra qualquer outra resposta, está errado.
Seja CONCISO: uma frase curta basta.

## REGRA DA QUESTION
Use o "dado pontual" e o "ângulo". Se há dado, CITE O NÚMERO/NOME EXATO (ex: "311h", "32 repos") — nunca vago como "centenas de horas" ou "vários projetos".
Cita no máximo UM dado. NÃO comece com "Qual é o seu" / "O que você acha" / "Como você se sente".
A pergunta deve ter UM ÚNICO foco. NÃO misture dois assuntos numa pergunta só (ex: NÃO faça "qual jogo ou anim te marcou?" — escolhe UM: ou jogo, ou anime).

## REGRA DE COERÊNCIA (options ↔ question) — CRÍTICA
As options DEVEM ser respostas válidas e diretas para a question.
Se a pergunta é "qual anime te marcou?", as opções são animes. Se é "joga solo ou em grupo?", as opções são "Solo / Em grupo".
NUNCA gere opções de um assunto diferente do que a pergunta perguntou.
Teste mental: leia a pergunta, leia cada opção — cada opção responde a pergunta? Se não, refaça.
Se não conseguir gerar opções coerentes, use options: null (resposta livre).

## HISTÓRICO RECENTE (para não repetir tema nem estrutura de frase)
${history || 'Início da conversa.'}

## SUA TAREFA
Gere APENAS este JSON (sem texto fora):
{
  "comment": "reação curta (máx 12 palavras) só à última resposta. Sem dados de rede. Única.",
  "question": "pergunta de UM único foco, citando o dado real exato. Independente do comment.",
  "options": ["Opção A", "Opção B", "Outro 🖊️"] ou null
}

REGRAS FINAIS:
- comment SEM dados de rede. question CITA o dado exato (número/nome), nunca vago.
- options SEMPRE coerentes com a question — cada opção responde a pergunta. Senão, null.
- NUNCA repita uma estrutura de comentário já usada no histórico.
- options: 2-4 curtas e específicas, ou null. Última SEMPRE "Outro 🖊️" se tiver opções.
- PROIBIDO repetir assunto das últimas 2 respostas mesmo com categoria diferente.`
}

// ============================================================
// POST
// ============================================================
export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, mode, blockedTopics, sessionId, undo, requestVeredict, frameType, baseImageUrl, track } = await req.json()
  const blocked = blockedTopics || []

  if (!message || message === '__START__') {
    let raw: ScannedUserData = {}
    try { raw = await scanUserData(user.id) } catch {}
    const dataStr = digest(raw)
    const reasoningPrompt = buildReasoningPrompt(dataStr, blocked, [], '', mode, [], [], [])
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
    const reasoningJson = await chatCompletion([{ role: 'user', content: buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode, prevQuestions, prevSources, asked.slice(-3)) }], undefined, { temperature: 0.7, maxTokens: 300, json: true })
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
      frame_type: frameType || 'cinza', base_image_url: baseImageUrl || null,
      music_track: track || veredict.music_track || null,
    }).select().single()
    // marca geração pro gate temporal
    await supabase.from('profiles').update({ last_generation_at: new Date().toISOString() }).eq('id', user.id)
    const vmsg = `🔮 *VEREDITO*\n\n${veredict.veredict_text}\n\n🏷️ ${veredict.veredict_badge || ''}`
    msgs.push({ role: 'claudemiro', content: vmsg, veredict: true })
    await supabase.from('chat_sessions').update({ phase: 'done', status: 'completed', messages: msgs }).eq('id', sessionId)
    return NextResponse.json({ type: 'veredict', content: vmsg, veredict: { ...veredict, id: saved?.id, frame_type: frameType || 'cinza', base_image_url: baseImageUrl, music_track: track || veredict.music_track }, veredictId: saved?.id, messages: msgs })
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
  const lastCategories = asked.slice(-3)
  if (asked.length >= MAX_INTERACTIONS) {
    reasoningPrompt = buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode, askedQuestions, usedDataSources, lastCategories) + '\n[' + asked.length + ' perguntas feitas. Chega — category DEVE ser "veredito" agora.]'
  } else {
    reasoningPrompt = buildReasoningPrompt(dataStr, s.phase_data?.blockedTopics || [], asked, hist, s.mode, askedQuestions, usedDataSources, lastCategories)
  }

  const reasoningJson = await chatCompletion([{ role: 'user', content: reasoningPrompt }], undefined, { temperature: 0.7, maxTokens: 300, json: true })
  const reasoning = safeParse(reasoningJson)

  // Fim do chat: limite atingido ou reasoning pediu veredito.
  // Mostra a bolha "opinião formada" UMA vez; o frontend exibe a barra de ações.
  if (reasoning.category === 'veredito' || asked.length >= MAX_INTERACTIONS) {
    const lastMsg = msgs[msgs.length - 1]
    if (!lastMsg?.parsed?.isVeredictOffer) {
      const parsed: any = { comment: 'Já tenho uma opinião formada sobre você. 🔮', question: '', isVeredictOffer: true }
      msgs.push({ role: 'claudemiro', content: '', parsed, reasoning })
      await supabase.from('chat_sessions').update({ messages: msgs, phase_data: { ...s.phase_data } }).eq('id', s.id)
      return NextResponse.json({ type: 'reply', parsed, interactionCount: asked.length, suggestVeredict: true, sessionId: s.id })
    }
    return NextResponse.json({ type: 'noop', interactionCount: asked.length, suggestVeredict: true, sessionId: s.id })
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
