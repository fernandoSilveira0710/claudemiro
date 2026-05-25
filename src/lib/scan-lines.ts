// Base de diálogos MASSIVA do Claudemiro
// Memes, virais do TikTok/Twitter, gírias BR 2024-2026

// ─── RETORNO (após ficar offline) ───
export function getReturnSpeech(lastSeenDays: number): string {
  if (lastSeenDays === 0) return ''
  if (lastSeenDays === 1) {
    return pick([
      'Voltou rápido hein? Tava com saudades de mim? 🥹',
      '1 dia fora... tava tramando o quê? 🤨',
      'Ontem não deu pra passar aqui? Tudo bem, eu esperei. 🕯️',
      '24h offline. Tava ocupado ou só me evitando? 👀',
      '1 dia sumido. Já tava preparando seu obituário digital. ⚰️',
      'Voltou! 24h depois... nem parecia que você tinha ido. 🤡',
    ])
  }
  if (lastSeenDays <= 3) {
    return pick([
      `${lastSeenDays} dias sumido... achei que tinha me abandonado. 🥺`,
      `Sumiu por ${lastSeenDays} dias. E eu aqui, sozinho, julgando o vento. 🌬️`,
      `Voltou! Achei que tinha desistido de ser julgado. 🧑‍⚖️`,
      `${lastSeenDays} dias offline. Suas redes sentiram falta? Eu senti. 🤖`,
      `${lastSeenDays} dias depois... o feed não se alimenta sozinho. 🍽️`,
      `Apareceu! ${lastSeenDays} dias é muita ausência pra quem quer ser zoado. 📅`,
    ])
  }
  if (lastSeenDays <= 7) {
    return pick([
      `${lastSeenDays} dias! Quase cancelei seu cadastro. 😤`,
      `Uma semana fora... o mundo das redes não se julga sozinho. 🌍`,
      `Voltou! ${lastSeenDays} dias depois... já ia te declarar desaparecido. 🔍`,
      `Achou que eu ia esquecer de você? ${lastSeenDays} dias depois e tô aqui. 😈`,
      `${lastSeenDays} dias. Tava no retiro espiritual? 🙏`,
      `${lastSeenDays} dias offline. Enquanto isso, coletei dados de outras vítimas. 😏`,
    ])
  }
  return pick([
    `${lastSeenDays} dias... já nem lembrava mais sua cara. Quem é você mesmo? 🤔`,
    `Olha só quem resolveu aparecer depois de ${lastSeenDays} dias! 🫵`,
    `Ressuscitou! ${lastSeenDays} dias depois... tava no limbo digital? 👻`,
    `${lastSeenDays} dias. Nem o Serasa me deu tanto trabalho pra te achar. 🔎`,
    `${lastSeenDays} dias offline... a Internet tava mais triste sem você. Mentira. 😂`,
    `${lastSeenDays} dias. Tava preso? Tava fugindo? Me conta a fofoca. 🍵`,
  ])
}

// ─── BALÃO PRINCIPAL (conexões) ───
export function getBotSpeech(connectionsCount: number, vereditsCount: number, connectionsData?: any[]): string {
  if (connectionsData?.length) {
    const dataPhrases = getDataBasedPhrases(connectionsData)
    if (dataPhrases.length && Math.random() > 0.4) return pick(dataPhrases)
  }

  const none = [
    'Só 1 rede social? Tá com medo do que? 😒',
    'Cadê as redes? Não vou te julgar... muito. 😐',
    'Sem dados? Assim você me deixa entediado... 🥱',
    'Conecta alguma coisa aí, pô. Tô no escuro aqui. 🌑',
    'Sem redes sociais? Tá vivendo em 1990? 📟',
    'Zero conexões... isso é medo ou só tédio mesmo? 🦗',
    'Você é um fantasma digital? 0 redes detectadas. 👻',
    'Tá no modo anônimo da vida real? 🥸',
  ]

  const few = [
    'Hum, começando a se expor... já vi umas coisas aqui. 😏',
    'Poucas redes, mas já deu pra sentir o cheiro. 👃',
    'Tô montando seu dossiê, aguarde... 📋',
    'Só isso? Tenho certeza que você tem mais podre por aí. 🕵️',
    'Meia dúzia de redes... mas qualidade > quantidade, né? 🤌',
    'Poucas conexões, mas já tô te julgando. Não se preocupe. 😊',
    'Tímido nas redes? Aqui não tem essa, campeão. 🏆',
    'Com 2 redes já dá pra fazer um estrago... 🧨',
  ]

  const medium = [
    'Tô vendo umas coisas bem interessantes aqui... 🤔',
    'Seu perfil tá ficando suculento. Continua... 🧃',
    'Já tenho material pra um veredito, hein? 📝',
    'Olha, olha... que feed diversificado o seu. 🧐',
    'Cada rede uma personalidade diferente... qual é a real? 🎭',
    'Várias redes, várias máscaras. Qual você tira primeiro? 🎪',
    'Seu histórico tá tipo bolo de casamento: muitas camadas. 🎂',
    'Tô igual cachorro farejando... e o cheiro tá bom. 🐕',
  ]

  const many = [
    'Manda a carteira de trabalho também? 😂',
    'Caraca, tu vive na internet! Tô amando. 🤩',
    'Que banquete de dados! Claudemiro tá felizão. 🍽️',
    'Todas as redes? Até o FBI tem menos informação. 🚔',
    'Você é um caso sério. Sorte que eu adoro casos sérios. 🔬',
    'Isso aqui não é um perfil, é um currículo digital. 📄',
    'Se expor assim na internet... coragem ou imprudência? 🎲',
    'Eu já vi muito perfil, mas o seu... é entretenimento puro. 🎬',
  ]

  const hasVeredits = [
    'Bora fazer outro veredito? O último ficou bom... 🎯',
    'Quer se ver de novo? Seu último card tá te esperando. 🃏',
    'Já te julguei antes, mas posso julgar de novo... 😈',
    'Saudades de te expor. Bora mais um? 🔮',
    'Seu último veredito foi épico. Dá pra superar? 🏆',
    'Faz outro veredito... prometo que dessa vez pego leve. (Mentira) 🤥',
    'O último card foi bom, mas você mudou? Vamos descobrir... 🔄',
  ]

  let pool: string[]
  if (connectionsCount === 0) pool = none
  else if (connectionsCount <= 2) pool = few
  else if (connectionsCount <= 5) pool = medium
  else if (vereditsCount > 0) pool = [...many, ...hasVeredits]
  else pool = many
  return pick(pool)
}

// ─── FRASES BASEADAS EM DADOS ESPECÍFICOS ───
function getDataBasedPhrases(connectionsData: any[]): string[] {
  const phrases: string[] = []
  for (const { platform, data } of connectionsData) {
    if (!data) continue
    switch (platform) {
      case 'steam':
        if (data.games?.length) {
          const h = Math.round(data.games.reduce((s: number, g: any) => s + (g.playtime_forever || 0), 0) / 60)
          if (h > 3000) phrases.push(`${h.toLocaleString()}h de Steam... respira ar puro às vezes? 🌳`)
          if (h > 1000) phrases.push(`${h.toLocaleString()}h de jogo. E a vida social, como vai? 🎮`)
          if (h > 200) phrases.push(`${h}h de jogatina. Quer que eu te julgue agora ou depois? 🕹️`)
          if (h > 50) phrases.push(`${h}h de Steam. Iniciante, mas promissor. 🐣`)
        }
        if (data.games?.length > 200) phrases.push(`${data.games.length} jogos. Comprou ou só adicionou? 🛒`)
        if (data.games?.length === 0) phrases.push('Steam zerada? Nem Free Fire? 🧐')
        break
      case 'instagram':
        if (data.followers === 0) phrases.push('0 seguidores no Instagram. Perfil secreto ou só unpopular? 🤐')
        if (data.following > 3000) phrases.push(`Seguindo ${parseInt(data.following).toLocaleString()}... stalker profissional? 🔍`)
        if (data.following > 1000) phrases.push(`Seguindo ${parseInt(data.following).toLocaleString()}. Isso é networking ou obsessão? 📱`)
        if (data.posts === 0) phrases.push('Zero posts. Instagram é só pra ver meme, né? 😂')
        if (data.posts > 300) phrases.push(`${data.posts} posts. Isso é feed ou documentário? 🎥`)
        if (data.is_private) phrases.push('Perfil privado... o que você esconde, hein? 🔒')
        if (data.is_verified) phrases.push('Verificado no Instagram! Alguém é famosinho. ✅')
        break
      case 'discord':
        if (data.guilds?.length > 50) phrases.push(`${data.guilds.length} servidores. Isso é coleção ou vício? 🏆`)
        if (data.guilds?.length > 20) phrases.push(`${data.guilds.length} servers... em quantos você realmente fala? 💬`)
        if (data.guilds?.length > 5) phrases.push(`${data.guilds.length} servidores no Discord. Socialmente ativo? 👥`)
        break
      case 'spotify':
        if (data.topArtists?.length) phrases.push(`Artista #1: ${data.topArtists[0]?.name || '???'}. Isso explica muita coisa. 🎵`)
        break
      case 'github':
        if (data.repos > 50) phrases.push(`${data.repos} repositórios. Quantos têm commit esse ano? 📅`)
        if (data.followers === 0) phrases.push('0 seguidores no GitHub. Código secreto ou ninguém entendeu? 🤫')
        if (data.followers > 100) phrases.push(`${data.followers} followers no GitHub. Dev famoso! ⭐`)
        if (data.repos === 0) phrases.push('0 repositórios públicos. Só commita no privado? 👻')
        break
      case 'youtube':
        if (data.subscriptions?.length > 200) phrases.push(`${data.subscriptions.length} canais inscritos. Dorme quando? 📺`)
        break
      case 'tiktok':
        if (data.followers === 0 && data.following === 0) phrases.push('0 seguidores, 0 seguindo... TikTok fantasma? 👻')
        if (data.followers > 50000) phrases.push(`${parseInt(data.followers).toLocaleString()} seguidores! TikToker profissional? 🌟`)
        if (data.videos > 200) phrases.push(`${data.videos} vídeos. Isso é dedicação ou desemprego? 💃`)
        break
      case 'x':
        if (data.tweets > 10000) phrases.push(`${parseInt(data.tweets).toLocaleString()} tweets. Já pediu pra sair? 🐦`)
        if (data.followers === 0 && data.following === 0) phrases.push('Conta zerada no X. Só serve pra ler treta. 🍿')
        if (data.verified) phrases.push('Verificado no X. Alguém paga por isso? 💅')
        break
      case 'reddit':
        if (data.comment_karma > 100000) phrases.push(`${parseInt(data.comment_karma).toLocaleString()} karma. Redditor profissional. ☀️?`)
        if (data.link_karma === 0 && data.comment_karma === 0) phrases.push('0 karma. Nunca postou, nunca comentou. Espectador profissional. 🥷')
        break
    }
  }
  return phrases
}

// ─── TERMINAL DE VARREDURA ───
export function generateScanLines(platform: string, data: any): string[] {
  const L: string[] = []
  const d = data || {}

  switch (platform) {
    case 'instagram':
      if (d.followers !== undefined) {
        if (d.followers === 0) L.push('0 seguidores... Só tem mosca no Instagram? 🦟')
        else if (d.followers < 100) L.push(`${d.followers} seguidores. Tão exclusivo que nem mãe segue. 👩‍👦`)
        else if (d.followers < 1000) L.push(`${d.followers} seguidores. Micro-influencer de boteco. 🍺`)
        else L.push(`${parseInt(d.followers).toLocaleString()} seguidores. Famosinho, mas ninguém paga boleto com like. 💸`)
      }
      if (d.following > 2000) L.push(`Seguindo ${parseInt(d.following).toLocaleString()}... Segue até perfil de cachorro. 🐕`)
      if (d.posts === 0) L.push('Zero posts. Instagram é só pra stalkear mesmo? 👀')
      else if (d.posts > 500) L.push(`${d.posts} posts. Terapeuta já está encaminhado. 🛋️`)
      if (d.is_private) L.push('Perfil privado. Tem coisa aí que não queremos ver... 🔒')
      if (d.is_verified) L.push('Verificado. Olha só, temos uma sub-celebridade! ⭐')
      break

    case 'steam':
      if (d.games?.length) {
        const h = Math.round(d.games.reduce((s: number, g: any) => s + (g.playtime_forever || 0), 0) / 60)
        if (h > 3000) L.push(`${h.toLocaleString()}h de jogo. Cadeira já tem formato do corpo. 🪑`)
        else if (h > 1000) L.push(`${h.toLocaleString()}h. Sem vida social. Mas pelo menos não é LoL. 👍`)
        else if (h > 500) L.push(`${h}h de Steam. Dormir é opcional. 😴`)
        else L.push(`${h}h de jogo. Casual, mas nem tanto. 🎮`)
      }
      if (d.games?.length > 200) L.push(`${d.games.length} jogos na biblioteca. Jogou 3. 📚`)
      if (d.games?.length > 50) L.push(`${d.games.length} jogos. Desses, 80% nunca foram instalados. 📦`)
      if (d.games?.length === 0) L.push('Nenhum jogo na Steam. Baixou só pra ver as promoções? 🏷️')
      break

    case 'discord':
      if (d.guilds?.length > 50) L.push(`${d.guilds.length} servidores. Hmmmm, famosinho então? 😏`)
      else if (d.guilds?.length > 10) L.push(`${d.guilds.length} servidores do Discord. Em nenhum você fala. 🤐`)
      else if (d.guilds?.length > 0) L.push(`${d.guilds.length} servidores. Quietinho nos cantos. 🥷`)
      else L.push('0 servidores. Usa Discord só pra call de jogo? 🎧')
      break

    case 'youtube':
      if (d.channel?.statistics?.subscriberCount) {
        const s = parseInt(d.channel.statistics.subscriberCount)
        if (s === 0) L.push('0 inscritos. Canal mais vazio que lanchonete vegana. 🥬')
        else if (s < 10) L.push(`${s} inscritos. Só a família e o tio chato. 👨‍👩‍👦`)
        else if (s < 1000) L.push(`${s.toLocaleString()} inscritos. Tá crescendo! 🌱`)
        else L.push(`${s.toLocaleString()} inscritos. Quase um Casimiro. 📺`)
      }
      if (d.subscriptions?.length > 200) L.push(`Inscrito em ${d.subscriptions.length} canais. Conteúdo infinito, produtividade zero. 📉`)
      if (d.channel?.statistics?.videoCount > 100) L.push(`${d.channel.statistics.videoCount} vídeos. Criador de conteúdo ou acumulador? 🗂️`)
      break

    case 'twitch':
      if (d.follows?.length === 0) L.push('Não segue ninguém na Twitch. Só entra pra ver live vazada? 🫣')
      else if (d.follows?.length > 100) L.push(`${d.follows.length} canais seguidos. Nunca assistiu 90%. 📺`)
      else L.push(`${d.follows?.length || 0} canais. Modo espectador anônimo. 👻`)
      break

    case 'tiktok':
      if (d.followers === 0 && d.following === 0) L.push('0 seguidores, 0 seguindo. Só assiste gatinho e dá like sem querer. 🐱')
      if (d.videos > 100) L.push(`${d.videos} vídeos. Dancinha ou opinião polêmica? 💃`)
      if (d.followers > 50000) L.push(`${parseInt(d.followers).toLocaleString()} seguidores. TikToker profissional. 🎰`)
      if (d.verified) L.push('Verificado! Temos uma celebridade! ⭐')
      break

    case 'x':
      if (d.tweets > 10000) L.push(`${parseInt(d.tweets).toLocaleString()} tweets. Já pediu pra sair? 🐦`)
      if (d.tweets > 1000) L.push(`${parseInt(d.tweets).toLocaleString()} tweets. Sua opinião é a mais importante, né? 📢`)
      if (d.following > 2000) L.push(`Seguindo ${parseInt(d.following).toLocaleString()}. Linha do tempo: caos total. 🌪️`)
      if (d.verified) L.push('Verificado no X! Alguém é importante. 💅')
      break

    case 'github':
      if (d.repos > 50) L.push(`${d.repos} repositórios. Quantos com commit esse ano? 📅`)
      if (d.repos === 0) L.push('0 repositórios públicos. Dev fantasma. 👻')
      if (d.followers === 0) L.push('0 seguidores. Código secreto ou só ninguém entendeu? 🤷')
      if (d.followers > 100) L.push(`${d.followers} followers. Alguém é famoso entre os DEVs. ⭐`)
      break

    case 'reddit':
      if (d.link_karma === 0 && d.comment_karma === 0) L.push('0 karma. Lurker profissional. 🥷')
      if (d.comment_karma > 100000) L.push(`${parseInt(d.comment_karma).toLocaleString()} karma. Redditor raiz. Toma sol? ☀️`)
      if (d.comment_karma > 10000) L.push(`${parseInt(d.comment_karma).toLocaleString()} karma. Reddit é sua segunda casa. 🏠`)
      break
  }
  if (L.length === 0) L.push('[CLAUDEMIRO] Dados insuficientes para zoar. Conecte mais redes! 🔌')
  return L
}

// ─── MOOD ───
export function getBotMood(connectionsCount: number): { eyes: string; label: string; scale: number; speed: number } {
  if (connectionsCount === 0) return { eyes: 'normal', label: 'Neutro', scale: 1, speed: 20 }
  if (connectionsCount <= 3) return { eyes: 'sereno', label: 'Sereno', scale: 1.05, speed: 16 }
  if (connectionsCount <= 6) return { eyes: 'feliz', label: 'Feliz', scale: 1.1, speed: 12 }
  return { eyes: 'safado', label: 'Safado 😏', scale: 1.15, speed: 8 }
}

function pick(arr: string[]): string { return arr[Math.floor(Math.random() * arr.length)] }
