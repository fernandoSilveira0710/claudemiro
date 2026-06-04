import { createServerSupabase } from '@/lib/supabase/server'
import { chatCompletion } from '@/lib/ai'
import { scanUserData, ScannedUserData } from '@/lib/scanner'
import { buildVeredictPrompt } from '@/lib/card-generator'
import { NextResponse } from 'next/server'

export const AVAILABLE_TOPICS = [
  { id: 'games', label: 'Games', emoji: '��' }, { id: 'animes', label: 'Animes', emoji: '��' },
  { id: 'filmes', label: 'Filmes/Séries', emoji: '��' }, { id: 'futebol', label: 'Futebol', emoji: '⚽' },
  { id: 'musica', label: 'Música', emoji: '��' }, { id: 'politica', label: 'Política', emoji: '��️' },
  { id: 'religiao', label: 'Religião', emoji: '��' }, { id: 'signo', label: 'Signo/Espiritualidade', emoji: '��' },
  { id: 'relacionamento', label: 'Relacionamento', emoji: '��' }, { id: 'carreira', label: 'Carreira/Trampo', emoji: '��' },
  { id: 'academia', label: 'Academia/Fitness', emoji: '��' }, { id: 'internet', label: 'Tretas da Internet', emoji: '��' },
]

const MAX_INTERACTIONS = 20
const ALL_CATEGORIES = ['games', 'musica', 'carreira', 'hobbies', 'futebol', 'animes', 'filmes', 'familia', 'relacionamento', 'signo', 'religiao', 'politica', 'internet', 'academia', 'personalidade', 'infancia', 'sonhos', 'medos']

// Categorias que NÃO precisam de dados de rede (vida pessoal + tópicos da lista)
const PERSONAL_CATEGORIES = ['familia', 'relacionamento', 'signo', 'religiao', 'politica', 'personalidade', 'infancia', 'sonhos', 'medos', 'futebol', 'academia', 'musica', 'animes', 'filmes', 'internet', 'carreira']

// IDs dos tópicos da tela de seleção — o que o usuário marcou como bloqueado vem daqui
const SELECTABLE_TOPIC_IDS = ['games', 'animes', 'filmes', 'futebol', 'musica', 'politica', 'religiao', 'signo', 'relacionamento', 'carreira', 'academia', 'internet']

// Meta: cobrir pelo menos 65% dos tópicos liberados (não bloqueados)
const TOPIC_COVERAGE_TARGET = 0.65

// 20 perguntas: até ~8 de redes (há ~7-8 redes possíveis) + resto de tópicos pessoais.
// Quando as redes esgotam, o sistema migra pra tópicos automaticamente.
const REDES_QUOTA = 8
const TOPICOS_QUOTA = 12

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
): string {
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

  // Proporção 2:1 — a cada 2 redes, 1 tópico obrigatório.
  // Também força tópico se TODAS as redes presentes já foram exploradas (não reusar rede).
  const todasRedesUsadas = availableSources.length === 0 && presentSources.length > 0
  const deveUsarTopico =
    (redesFeitas >= REDES_QUOTA) ||
    todasRedesUsadas ||
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

  const recentHistory = history.split('\n').slice(-12).join('\n') || 'Início da conversa'
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
Escolha UMA categoria e faça UMA pergunta direta.

## REGRA DE OURO: EXTRAIA O FATO CONCRETO
Seu objetivo é DESCOBRIR fatos sobre a pessoa pra montar um retrato real — não só comentar o que já sabe.
Em cada tópico, pergunte o FATO ESPECÍFICO primeiro. NÃO comente/julgue um tema sem antes ter perguntado o dado concreto dele.
Pergunte sempre o "qual" e o "porquê":
- futebol → QUAL time você torce? (e depois: por que esse time, desde quando)
- signo → QUAL é o seu signo? (não "acredita em signo?" — isso vem depois)
- politica → você se considera mais de qual lado, e QUAL pauta te importa mais?
- musica → QUAL gênero e QUAL artista/música você mais ouve?
- carreira → ONDE você trabalha e QUAL sua função? gosta do que faz?
- familia → como é sua família? mora com quem? é próximo de quem?
- religiao → QUAL sua religião e o que ela significa pra você na prática?
- filmes → QUAL foi o último filme/série que te marcou? (foco em filme OU série, nunca misture com anime)
- games → QUAL gênero/jogo você curte mais e POR QUÊ?
- animes → QUAL anime é seu favorito? (só anime, separado de séries/filmes)
- academia → treina o quê? QUAL objetivo (saúde, estética, força)?
- relacionamento → QUAL seu status? (solteiro/namorando/casado) e há quanto tempo?
- infancia → QUAL era o sonho de criança? o que mudou?
- hobbies → QUAL hobbie fora de tela e como começou nele?

Se a pessoa já deu o fato antes, aprofunde no PORQUÊ. Se não deu, PERGUNTE o fato — não pule pro julgamento.
data_hook = null. data_source = "TOPICO".`
    : `## TIPO AGORA: REDE SOCIAL
Fontes presentes: [${presentSources.join(', ')}]
Fontes usadas: [${usedNetworkSources.join(', ') || 'nenhuma'}]
Última usada: ${usedNetworkSources[usedNetworkSources.length - 1] || 'nenhuma'}
Fontes NÃO exploradas ainda: [${availableSources.join(', ') || 'todas já usadas'}]

OBRIGATÓRIO: usar uma fonte de [Fontes NÃO exploradas ainda]. NUNCA reuse uma fonte que já está em [Fontes usadas] — cada rede é perguntada UMA vez só. Se já perguntou YouTube, não volte no YouTube (nem no Frei Gilson ou qualquer canal dele).
data_source = nome exato da rede (STEAM, SPOTIFY, INSTAGRAM, TIKTOK, YOUTUBE, GITHUB, DISCORD, TWITTER/X).

## EXTRAIA O ITEM ESPECÍFICO (não comente a lista inteira)
Use o dado da rede pra perguntar sobre UM item concreto, e descubra o porquê:
- YOUTUBE → escolha UM canal que ele segue e pergunte por que curte / o que assiste dele. NÃO liste todos os canais.
- STEAM → escolha UM jogo e pergunte o que ele tem de especial, gênero favorito, como joga.
- SPOTIFY → pergunte qual artista/música ele mais ouve e o que significa (se não tem dado, pergunte o gênero/música favorita).
- GITHUB → pergunte que tipo de projeto ele faz, qual linguagem prefere e por quê.
- INSTAGRAM/TIKTOK → pergunte o que ele consome ali, que tipo de conteúdo curte.
- DISCORD → pergunte de que tipo de comunidade ele participa ou gostaria.

data_hook = o item específico escolhido (ex: "canal Bistecone no YouTube", "jogo Lethal Company").
REGRA DE QUALIDADE: se a fonte só tem dados zerados (0 seguidores/repos/vídeos) e já houve pergunta sobre "zero de algo", prefira outra fonte com dado real.`

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

## CATEGORIAS JÁ PERGUNTADAS (NÃO repita nenhuma destas)
[${asked.filter(Boolean).join(', ') || 'nenhuma'}]
REGRA DURA: escolha uma categoria que NÃO está na lista acima. Cada assunto é perguntado UMA vez só.

## PERGUNTAS JÁ FEITAS — NÃO REPETIR TEMA NEM INTENÇÃO
${questionsAsked}

## ÚLTIMAS TROCAS
${recentHistory}

## ÚLTIMAS 3 CATEGORIAS USADAS (proibido repetir assunto delas)
${lastCategories.length ? lastCategories.map((c,i) => `${i+1}. ${c}`).join(', ') : 'nenhuma ainda'}
REGRA CRÍTICA: a próxima pergunta deve ser sobre um assunto DIFERENTE das últimas 3 acima.
Mesmo que a categoria mude no nome, se o ASSUNTO for parecido (ex: família, pai, mãe, irmão = mesmo cluster; ou academia/treino/fitness = mesmo cluster; ou Frei Gilson já perguntado = não voltar nele), é repetição PROIBIDA.

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
{"comment": "", "question": "pergunta de abertura de foco único citando o dado real", "options": ["A", "B", "Outro ��️"] ou null}`
  }

  // ── CONVERSA NORMAL ──
  return `Você é o Claudemiro. Tom FIXO desta sessão: ${toneVoice[mode] || toneVoice.casual}

## REGRA ABSOLUTA — UMA PERGUNTA SÓ (a mais importante)
A conversa tem 20 turnos, então NÃO atropele: faça UMA ÚNICA pergunta por vez.
- O comment é SÓ reação/reconhecimento. O comment NUNCA contém pergunta. NÃO pode ter "?", não pode ter "ou", não pode oferecer escolha.
- TODA a pergunta vai na "question", e é UMA só (um único "?").
- ERRADO (o que você fez e não pode repetir): comment="Cê guarda os projetos pra você ou tem medo de code review?" + question="tá solteiro ou namorando?" → SÃO DUAS PERGUNTAS. PROIBIDO.
- Se você quer saber duas coisas, escolha UMA agora e guarde a outra pro próximo turno. Há turnos de sobra.

## COMO DEVE SOAR — DIÁLOGO NATURAL, SEM COSTURA FORÇADA
A pessoa responde, você reconhece (comment) e faz a próxima pergunta (question) DIRETA ao novo assunto.
NÃO tente costurar a resposta anterior com a próxima pergunta se os assuntos não se conectam de verdade.

ERRADO (conexão falsa, non-sequitur) — NÃO faça:
- "Católico, então já tem um time do coração também, qual time?" (ser católico não tem relação com ter time)
- "Cê segue o CazéTV, mas já que caiu no papo de música, qual estilo?" (CazéTV não tem nada a ver com música)

CERTO (comment reconhece + pergunta direta e separada):
- comment="Católico, respeito." / question="E futebol, qual time tu torce?"
- comment="Boa." / question="Falando em música, qual estilo tu curte mais?"

O comment reage SÓ ao que a pessoa disse, em 1 frase curta. A question vai direta ao novo assunto.
Pode usar um conector leve e honesto ("e aí,", "falando em X," QUANDO de fato muda pra X) — mas nunca invente relação entre coisas que não se relacionam.
NUNCA use genéricos vazios ("hmm saquei", "boa kkk", "interessante"). NUNCA repita a resposta de volta.

## A ÚLTIMA RESPOSTA DO USUÁRIO
"${lastUserLine}"

## PRÓXIMA PERGUNTA — instruções do raciocínio
- Categoria: ${reasoning.category}
- Dado pontual a citar (se houver): ${reasoning.data_hook || '(nenhum — pergunta pessoal)'}
- Ângulo: ${reasoning.angle || ''}
- Tom nesta resposta: ${reasoning.tone_note || ''}

## ESTRUTURA DA SUA RESPOSTA
- comment: reconhecimento curto, SEM pergunta, SEM "?". Reage ao conteúdo da resposta.
- question: UMA pergunta só (um único "?"), foco único. Use o dado real exato se houver.

## REGRAS DA QUESTION
- UM único foco. NÃO misture dois assuntos numa pergunta.
- ATENÇÃO: anime, série e filme são DOMÍNIOS DIFERENTES. NUNCA pergunte "anime ou série?" / "filme ou anime?" — escolha UM só. Se perguntar de anime, opções são animes; se série, séries; se filme, filmes. Misturar (One Piece + Breaking Bad juntos) é ERRO.
- EXTRAIA O FATO: pergunte o "qual" concreto (qual time, qual signo, qual gênero, onde trabalha, qual canal) — não comente um tema sem antes saber o fato dele.
- Se há dado, cite o número/nome EXATO ("311h", "Frei Gilson") — nunca vago.
- NÃO comece com "Qual é o seu" / "O que você acha" / "Como você se sente" (mas PODE perguntar "qual" naturalmente: "e aí, qual time tu torce?").
- VÁ DIRETO AO PONTO: o usuário liberou esses assuntos, então pergunte de forma simples e direta o que quer saber. Sem rodeio, sem justificar por que está perguntando.

## COERÊNCIA options ↔ question (crítica)
Cada opção tem que ser uma resposta válida e COMPLETA pra pergunta. Pergunta de anime → opções de anime.
REGRA DO MESMO DOMÍNIO: TODAS as opções devem ser do MESMO tipo. NUNCA misture anime com série, filme com anime, jogo com música. Ex ERRADO: ["One Piece", "Attack on Titan", "Breaking Bad"] (os dois primeiros são anime, o terceiro é série). Se você se pegar misturando tipos nas opções, a pergunta está errada — refoque ela em UM domínio só.
REGRA DAS DUAS VARIÁVEIS: se a pergunta pede DUAS informações (ex: "qual gênero E qual artista?", "onde trabalha E qual função?"), use options: null — botão não responde duas coisas. Só input livre.
Só ofereça options quando a pergunta tem UMA resposta fechada e simples do mesmo domínio (ex: "qual time?" → times; "solteiro ou casado?" → status).
Se uma opção sozinha não responde a pergunta inteira, ou se as opções seriam de tipos diferentes, use null.

## HISTÓRICO RECENTE (não repita tema nem estrutura de frase já usada)
${history || 'Início da conversa.'}

## SUA TAREFA
Gere APENAS este JSON (sem texto fora):
{
  "comment": "reconhecimento curto SEM pergunta e SEM '?', reagindo ao conteúdo específico da resposta",
  "question": "UMA pergunta só (um único '?'), foco único, citando dado exato se houver",
  "options": ["Opção A", "Opção B", "Outro ��️"] ou null
}

REGRAS FINAIS:
- UMA pergunta no total. O comment NÃO pergunta nada (sem "?"). Toda pergunta vai na question.
- comment ORIGINAL toda vez. PROIBIDO "hmm saquei", "boa kkk", "entendi kkk", "interessante" e genéricos.
- comment NUNCA repete/parafraseia a resposta. NUNCA cita dados de rede. NUNCA força conexão estranha.
- olhe o HISTÓRICO: se já usou uma abertura de comment parecida, use OUTRA diferente.
- options coerentes com a question, mesmo domínio. Se a pergunta pede DUAS coisas, options = null. Última SEMPRE "Outro ��️" se tiver opções.
- PROIBIDO repetir assunto das últimas 2 respostas.`
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
    const parsed = sanitizeParsed(safeParse(dialogJson))
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
    const parsed = sanitizeParsed(safeParse(dialogJson))
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
    const vmsg = `�� *VEREDITO*\n\n${veredict.veredict_text}\n\n��️ ${veredict.veredict_badge || ''}`
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

  // SALVAGUARDA anti-repetição: se a categoria escolhida já foi usada (e não é veredito),
  // troca por uma categoria ainda não perguntada — prioriza tópicos da lista de seleção.
  if (reasoning.category && reasoning.category !== 'veredito' && asked.includes(reasoning.category)) {
    const blockedT = s.phase_data?.blockedTopics || []
    const topicosPend = SELECTABLE_TOPIC_IDS.filter(id => !blockedT.includes(id) && !asked.includes(id))
    const outrasPend = ALL_CATEGORIES.filter(c => !blockedT.includes(c) && !asked.includes(c))
    const nova = topicosPend[0] || outrasPend[0]
    if (nova) {
      reasoning.category = nova
      reasoning.data_source = 'TOPICO'
      reasoning.data_hook = null
      reasoning.angle = `perguntar sobre ${nova} (assunto ainda não explorado)`
    }
  }

  // Fim do chat: limite atingido ou reasoning pediu veredito.
  // Mostra a bolha "opinião formada" UMA vez; o frontend exibe a barra de ações.
  if (reasoning.category === 'veredito' || asked.length >= MAX_INTERACTIONS) {
    const lastMsg = msgs[msgs.length - 1]
    if (!lastMsg?.parsed?.isVeredictOffer) {
      const parsed: any = { comment: 'Já tenho uma opinião formada sobre você. ��', question: '', isVeredictOffer: true }
      msgs.push({ role: 'claudemiro', content: '', parsed, reasoning })
      await supabase.from('chat_sessions').update({ messages: msgs, phase_data: { ...s.phase_data } }).eq('id', s.id)
      return NextResponse.json({ type: 'reply', parsed, interactionCount: asked.length, suggestVeredict: true, sessionId: s.id })
    }
    return NextResponse.json({ type: 'noop', interactionCount: asked.length, suggestVeredict: true, sessionId: s.id })
  }

  const dialogTemp = mode === 'engracado' ? 0.65 : mode === 'profissional' ? 0.5 : 0.7
  const dialogPrompt = buildDialogPrompt(dataStr, hist, s.mode, reasoning)
  const dialogJson = await chatCompletion([{ role: 'user', content: dialogPrompt }], undefined, { temperature: dialogTemp, maxTokens: 400, json: true })
  const parsed = sanitizeParsed(safeParse(dialogJson))
  msgs.push({ role: 'claudemiro', content: dialogJson, parsed, reasoning })
  const newAsked = [...asked, reasoning.category].filter(Boolean)
  const newAskedQuestions = [...askedQuestions, parsed.question].filter(Boolean)
  const newUsedSources = [...usedDataSources, normalizeDataSource(reasoning.data_source)].filter(Boolean)
  await supabase.from('chat_sessions').update({ messages: msgs, phase_data: { ...s.phase_data, askedCategories: newAsked, askedQuestions: newAskedQuestions, usedDataSources: newUsedSources } }).eq('id', s.id)

  const hasQuestion = !!(parsed.question && parsed.question.trim())
  const suggestNow = newAsked.length >= MAX_INTERACTIONS && !hasQuestion
  return NextResponse.json({ type: 'reply', parsed, interactionCount: newAsked.length, suggestVeredict: suggestNow, sessionId: s.id })
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

// Salvaguarda: garante que o comment não contenha pergunta (uma pergunta só, na question).
function sanitizeParsed(parsed: any): any {
  if (!parsed || typeof parsed !== 'object') return parsed
  let comment = (parsed.comment || '').toString().trim()
  // Se o comment tem "?", corta tudo a partir da última frase que vira pergunta.
  if (comment.includes('?')) {
    // mantém só o trecho ANTES da primeira pergunta
    const idx = comment.indexOf('?')
    // recua até o começo da frase que contém o "?"
    const before = comment.slice(0, idx)
    const lastBreak = Math.max(before.lastIndexOf('. '), before.lastIndexOf('! '), before.lastIndexOf(', '))
    comment = (lastBreak > 0 ? before.slice(0, lastBreak + 1) : '').trim()
  }
  return { ...parsed, comment }
}
