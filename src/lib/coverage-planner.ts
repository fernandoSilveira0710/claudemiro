// ============================================================
// COVERAGE PLANNER (Fase 1)
// O código decide QUAL slot perguntar; a IA só escreve a pergunta.
// Garante: toda rede conectada + todo tópico liberado viram pergunta.
// ============================================================

export interface Slot {
  type: 'network' | 'topic'
  key: string          // 'instagram' | 'futebol'
  priority: number     // 0..4 (D0 mais prioritário)
  label: string        // nome legível
}

export interface AskedSlot { key: string; count: number }

const MAX_PER_SLOT = 3

// Prioridade D0→D4
const NETWORK_PRIORITY: Record<string, number> = {
  instagram: 0, facebook: 0, x: 0, twitter: 0, tiktok: 0,
  discord: 1, steam: 1, twitch: 1,
  youtube: 2,
  github: 3, reddit: 3,
}

// Tópicos da tela de seleção (D4)
const SELECTABLE_TOPICS = ['games', 'animes', 'filmes', 'futebol', 'musica', 'politica', 'religiao', 'signo', 'relacionamento', 'carreira', 'academia', 'internet', 'leitura', 'saude']

const TOPIC_LABEL: Record<string, string> = {
  games: 'Games', animes: 'Animes', filmes: 'Filmes/Séries', futebol: 'Futebol',
  musica: 'Música', politica: 'Política', religiao: 'Religião', signo: 'Signo/Espiritualidade',
  relacionamento: 'Relacionamento', carreira: 'Carreira/Trampo', academia: 'Academia/Fitness', internet: 'Tretas da Internet',
  leitura: 'Leitura/Livros', saude: 'Corrida/Caminhada',
}

const NETWORK_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', x: 'X/Twitter', twitter: 'X/Twitter',
  tiktok: 'TikTok', discord: 'Discord', steam: 'Steam', twitch: 'Twitch',
  youtube: 'YouTube', github: 'GitHub', reddit: 'Reddit',
}

// Monta a lista de slots a cobrir
export function buildSlots(connectedPlatforms: string[], blockedTopics: string[]): Slot[] {
  const slots: Slot[] = []

  for (const p of connectedPlatforms) {
    const key = p.toLowerCase()
    if (key in NETWORK_PRIORITY) {
      slots.push({ type: 'network', key, priority: NETWORK_PRIORITY[key], label: NETWORK_LABEL[key] || key })
    }
  }

  for (const t of SELECTABLE_TOPICS) {
    if (!blockedTopics.includes(t)) {
      slots.push({ type: 'topic', key: t, priority: 4, label: TOPIC_LABEL[t] || t })
    }
  }

  return slots
}

// Embaralha (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Escolhe o próximo slot dado o estado atual.
// Regras: cobrir todos primeiro (1x cada), ordem aleatória dentro da prioridade,
// não repetir slot em turnos seguidos, máx 3 por slot quando sobra espaço.
export function pickNextSlot(
  slots: Slot[],
  asked: AskedSlot[],
  lastKey: string | null,
  maxQuestions: number,
  questionsAsked: number
): Slot | null {
  if (questionsAsked >= maxQuestions) return null

  const countOf = (key: string) => asked.find(a => a.key === key)?.count || 0

  // 1) Slots ainda não cobertos (count 0), ordem aleatória mas D0 antes de D4
  const naoCobertos = slots.filter(s => countOf(s.key) === 0 && s.key !== lastKey)
  if (naoCobertos.length > 0) {
    // agrupa por prioridade, embaralha dentro do grupo, pega da maior prioridade
    const minPrio = Math.min(...naoCobertos.map(s => s.priority))
    const candidatos = shuffle(naoCobertos.filter(s => s.priority === minPrio))
    return candidatos[0]
  }

  // 2) Todos cobertos uma vez → aprofunda (máx 3 por slot), priorizando os menos perguntados
  const restantes = maxQuestions - questionsAsked
  if (restantes <= 0) return null

  const aprofundaveis = slots
    .filter(s => countOf(s.key) < MAX_PER_SLOT && s.key !== lastKey)
    .sort((a, b) => {
      // menos perguntados primeiro; desempate por prioridade; depois aleatório
      const diff = countOf(a.key) - countOf(b.key)
      if (diff !== 0) return diff
      return a.priority - b.priority
    })

  if (aprofundaveis.length === 0) {
    // tudo no limite — libera repetição geral (caso extremo: poucas fontes)
    const todos = slots.filter(s => s.key !== lastKey)
    return todos.length ? shuffle(todos)[0] : (slots[0] || null)
  }

  // entre os menos perguntados, escolhe aleatório
  const menorCount = countOf(aprofundaveis[0].key)
  const empatados = shuffle(aprofundaveis.filter(s => countOf(s.key) === menorCount))
  return empatados[0]
}

// Gera as instruções específicas do slot pra IA escrever a pergunta.
// `data` é o scanned_data; usamos pra dar contexto real (seguidores, games, etc).
export function slotInstructions(slot: Slot, data: any, askCount: number): string {
  const aprofunda = askCount > 0
    ? `\n\n⚠️ ATENÇÃO: você JÁ perguntou sobre ${slot.label} antes. NÃO repita a mesma pergunta nem reformule a anterior. Mude COMPLETAMENTE o ângulo (se já perguntou "qual", pergunte "por quê" ou "desde quando" ou um detalhe específico do que ele respondeu). Se não houver ângulo novo genuíno, é melhor não insistir nesse assunto.`
    : ''

  if (slot.type === 'network') {
    return networkInstructions(slot.key, data) + aprofunda
  }
  return topicInstructions(slot.key, data) + aprofunda
}

function followerAngle(n: number): string {
  if (n <= 100) return 'poucos seguidores — rede familiar ou só observa?'
  if (n <= 500) return 'famosinho local'
  if (n <= 2000) return 'já tem gente interessada — por quê?'
  if (n <= 10000) return 'estrela municipal'
  return 'estrela de verdade, +10k'
}

function networkInstructions(key: string, data: any): string {
  switch (key) {
    case 'instagram': {
      const ig = data.instagram?.user || data.instagram || {}
      const seg = ig.edge_followed_by?.count || ig.follower_count || data.instagram?.follower_count || 0
      return `REDE: Instagram (onde a maioria vive a "vida enzo"). Seguidores: ${seg} (${followerAngle(seg)}).
Pergunte sobre o que ele consome/posta no Instagram, ou explore a faixa de seguidores. Vá direto.`
    }
    case 'facebook':
      return `REDE: Facebook (vibe mais "tiozão"). Pergunte o que ele ainda faz no Face, ou por que mantém/abandonou. Meio-termo, sem zoar demais.`
    case 'x':
    case 'twitter': {
      const seg = data.x?.follower_count || data.twitter?.follower_count || 0
      const tweets = data.x?.tweet_count || data.twitter?.tweet_count || 0
      return `REDE: X/Twitter (lugar de reclamar, opinar, falar mal). ${seg} seguidores, ${tweets} tweets.
Pergunte sobre o que ele mais reclama/posta, ou que tipo de assunto o faz tuitar.`
    }
    case 'tiktok': {
      const seg = data.tiktok?.follower_count || 0
      const vids = data.tiktok?.video_count || 0
      return `REDE: TikTok (terra do vídeo curto/nutella). ${seg} seguidores, ${vids} vídeos.
Pergunte o que ele consome ali, ou por que (não) posta.`
    }
    case 'steam': {
      const games = data.steam?.games || []
      const top = [...games].sort((a: any, b: any) => (b.playtime_forever || 0) - (a.playtime_forever || 0))[0]
      const topName = top ? `${top.name} (${Math.round((top.playtime_forever || 0) / 60)}h)` : 'jogos'
      return `REDE: Steam (perfil gamer). Jogo mais jogado: ${topName}.
Escolha UM ângulo: o que prende nesse jogo, gênero favorito, ou se joga sozinho/com galera. Cite o número exato de horas.`
    }
    case 'discord': {
      const servers = data.discord?.guild_count || data.discord?.servers?.length || 0
      return `REDE: Discord. ${servers} servidores.
Pergunte de que tipo de comunidade ele participa, ou (se poucos servidores) pra que usa.`
    }
    case 'twitch':
      return `REDE: Twitch. Pergunte se ele streama ou só assiste, e quem ele acompanha / por quê.`
    case 'youtube': {
      const subs = data.youtube?.subscriptions || []
      const canais = subs.slice(0, 8).map((s: any) => s.snippet?.title || '').filter(Boolean)
      return `REDE: YouTube (todo mundo usa). Segue: ${canais.join(', ') || 'vários canais'}.
Escolha UM canal específico e pergunte por que curte / o que assiste dele. NÃO liste todos. Ou pergunte se prefere vídeo longo ou curto.`
    }
    case 'github': {
      const repos = data.github?.repos || data.github?.public_repos || 0
      const langs = data.github?.top_languages ? Object.keys(data.github.top_languages).slice(0, 3).join(', ') : ''
      return `REDE: GitHub (dev ou vibe coder?). ${repos} repos públicos. Linguagens: ${langs || 'não informado'}.
Se 0 repos: pergunte se os projetos são privados e por quê. Senão: que tipo de projeto faz, linguagem favorita.`
    }
    case 'reddit':
      return `REDE: Reddit (só a nata usa). Pergunte de que subreddit participa e por que usa (reclamar de tech? histórias?).`
    default:
      return `REDE: ${key}. Pergunte algo relevante sobre o uso dessa rede.`
  }
}

function topicInstructions(key: string, data: any): string {
  switch (key) {
    case 'games':
      return `TÓPICO: Games. Pergunte o melhor game e por quê, OU o estilo/gênero que mais curte. Foco único.`
    case 'animes':
      return `TÓPICO: Animes (sensível, pode ser que não curta). Pergunte se é fã e qual anime favorito, OU gênero, OU personagem favorito. UM ângulo só.`
    case 'filmes':
      return `TÓPICO: Filmes/Séries. Pergunte qual filme/série marcou e por quê, OU ator preferido. Não misture filme com anime.`
    case 'futebol':
      return `TÓPICO: Futebol. Pergunte QUAL time torce (direto), OU liga preferida, OU jogador favorito, OU time que odeia. UM ângulo.`
    case 'musica': {
      const tracks = data.spotify?.topTracks || []
      const top = tracks[0]
      if (top) return `TÓPICO: Música. Spotify mostra que ouve "${top.name} - ${top.artist}". Pergunte sobre essa música/artista, ou o gênero que define o gosto dele.`
      return `TÓPICO: Música (sem Spotify conectado). Pergunte QUAL gênero curte e qual música/artista favorito. Pode ser input livre se pedir duas coisas.`
    }
    case 'politica':
      return `TÓPICO: Política (sensível, mas ele liberou). Pergunte direto qual lado se identifica, OU o que acha de algum presidente. Sem julgar.`
    case 'religiao':
      return `TÓPICO: Religião. Pergunte QUAL religião e o que significa na prática pra ele. Direto.`
    case 'signo':
      return `TÓPICO: Signo. Pergunte QUAL é o signo dele (direto). O "acredita ou não" pode vir no aprofundamento.`
    case 'relacionamento':
      return `TÓPICO: Relacionamento. Pergunte o status (solteiro/namorando/casado) direto. O "por quê/há quanto tempo" vem no aprofundamento.`
    case 'carreira':
      return `TÓPICO: Carreira. Pergunte qual área/profissão, OU onde trampa e se curte. UM ângulo.`
    case 'academia':
      return `TÓPICO: Academia/Fitness. Pergunte se treina e o quê, OU qual objetivo. (Tema sensível tipo "bomba" só se ele abrir.)`
    case 'internet':
      return `TÓPICO: Tretas da Internet. Pergunte qual treta recente ele acompanhou ou achou surreal. Leve.`
    case 'leitura':
      return `TÓPICO: Leitura/Livros. Pergunte qual o último livro que leu ou tá lendo, OU o gênero favorito (ficção, fantasia, autoajuda, técnico), OU se lê por prazer ou hábito. UM ângulo.`
    case 'saude':
      return `TÓPICO: Corrida/Caminhada. Pergunte se corre, caminha ou pedala e com qual frequência, OU o que motiva (saúde, cabeça, competição). UM ângulo.`
    default:
      return `TÓPICO: ${key}. Faça uma pergunta direta e específica sobre isso.`
  }
}
