// Sistema de diálogos do Claudemiro
// Frases contextuais baseadas em: dados reais, tempo offline, conexões, vereditos

// ─── RETORNO (após ficar offline) ───
export function getReturnSpeech(lastSeenDays: number): string {
  if (lastSeenDays === 0) return '' // mesmo dia, sem frase especial
  if (lastSeenDays === 1) {
    const pool = [
      'Voltou rápido hein? Tava com saudades de mim? 🥹',
      '1 dia fora... tava tramando o quê? 🤨',
      'Ontem não deu pra passar aqui? Tudo bem, eu esperei. 🕯️',
      '24h offline. Tava ocupado ou só me evitando? 👀',
    ]
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (lastSeenDays <= 3) {
    const pool = [
      `${lastSeenDays} dias sumido... achei que tinha me abandonado. 🥺`,
      `Sumiu por ${lastSeenDays} dias. E eu aqui, sozinho, julgando o vento. 🌬️`,
      `Voltou! Achei que tinha desistido de ser julgado. 🧑‍⚖️`,
      `${lastSeenDays} dias offline. Suas redes sentiram falta? Eu senti. 🤖`,
    ]
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (lastSeenDays <= 7) {
    const pool = [
      `${lastSeenDays} dias! Quase cancelei seu cadastro. 😤`,
      `Uma semana fora... o mundo das redes não se julga sozinho. 🌍`,
      `Voltou! ${lastSeenDays} dias depois... já ia te declarar desaparecido. 🔍`,
      `Achou que eu ia esquecer de você? ${lastSeenDays} dias depois e tô aqui. 😈`,
    ]
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const pool = [
    `${lastSeenDays} dias... já nem lembrava mais sua cara. Quem é você mesmo? 🤔`,
    `Olha só quem resolveu aparecer depois de ${lastSeenDays} dias! 🫵`,
    `Ressuscitou! ${lastSeenDays} dias depois... tava no limbo digital? 👻`,
    `${lastSeenDays} dias offline. Enquanto isso, coletei dados de outras vítimas. 😏`,
  ]
  return pool[Math.floor(Math.random() * pool.length)]
}

// ─── BALÃO PRINCIPAL (baseado em conexões + dados) ───
export function getBotSpeech(connectionsCount: number, vereditsCount: number, connectionsData?: any[]): string {
  // Se tem dados específicos, usar frases baseadas nos dados
  if (connectionsData && connectionsData.length > 0) {
    const dataPhrases = getDataBasedPhrases(connectionsData)
    if (dataPhrases.length > 0 && Math.random() > 0.5) {
      return dataPhrases[Math.floor(Math.random() * dataPhrases.length)]
    }
  }

  const none = [
    'Só 1 rede social? Tá com medo do que? 😒',
    'Cadê as redes? Não vou te julgar... muito. 😐',
    'Sem dados? Assim você me deixa entediado... 🥱',
    'Conecta alguma coisa aí, pô. Tô no escuro aqui. 🌑',
  ]
  const few = [
    'Hum, começando a se expor... já vi umas coisas aqui. 😏',
    'Poucas redes, mas já deu pra sentir o cheiro. 👃',
    'Tô montando seu dossiê, aguarde... 📋',
    'Só isso? Tenho certeza que você tem mais podre por aí. 🕵️',
    'Meia dúzia de redes... mas qualidade > quantidade, né? 🤌',
  ]
  const medium = [
    'Tô vendo umas coisas bem interessantes aqui... 🤔',
    'Seu perfil tá ficando suculento. Continua... 🧃',
    'Já tenho material pra um veredito, hein? 📝',
    'Olha, olha... que feed diversificado o seu. 🧐',
    'Cada rede uma personalidade diferente... qual é a real? 🎭',
  ]
  const many = [
    'Manda a carteira de trabalho também? 😂',
    'Caraca, tu vive na internet! Tô amando. 🤩',
    'Que banquete de dados! Claudemiro tá felizão. 🍽️',
    'Todas as redes? Até o FBI tem menos informação. 🚔',
    'Você é um caso sério. Sorte que eu adoro casos sérios. 🔬',
  ]
  const hasVeredits = [
    'Bora fazer outro veredito? O último ficou bom... 🎯',
    'Quer se ver de novo? Seu último card tá te esperando. 🃏',
    'Já te julguei antes, mas posso julgar de novo... 😈',
    'Saudades de te expor. Bora mais um? 🔮',
    'Seu último veredito foi épico. Dá pra superar? 🏆',
  ]

  let pool: string[]
  if (connectionsCount === 0) pool = none
  else if (connectionsCount <= 2) pool = few
  else if (connectionsCount <= 5) pool = medium
  else if (vereditsCount > 0) pool = [...many, ...hasVeredits]
  else pool = many

  return pool[Math.floor(Math.random() * pool.length)]
}

// ─── FRASES BASEADAS EM DADOS ESPECÍFICOS ───
function getDataBasedPhrases(connectionsData: any[]): string[] {
  const phrases: string[] = []

  for (const { platform, data } of connectionsData) {
    if (!data) continue

    switch (platform) {
      case 'steam':
        if (data.games?.length) {
          const hours = Math.round(data.games.reduce((s: number, g: any) => s + (g.playtime_forever || 0), 0) / 60)
          if (hours > 1000) phrases.push(`${hours}h de Steam... e a vida social, como vai? 🎮`)
          if (hours > 200) phrases.push(`${hours}h de jogatina. Quer que eu te julgue agora ou depois? 🕹️`)
        }
        break
      case 'instagram':
        if (data.followers === 0) phrases.push('0 seguidores no Instagram. Perfil secreto ou só unpopular? 🤐')
        if (data.following > 2000) phrases.push(`Seguindo ${parseInt(data.following).toLocaleString()} pessoas... stalker profissional? 🔍`)
        if (data.posts === 0) phrases.push('Zero posts no Instagram. Só serve pra ver meme, né? 😂')
        break
      case 'spotify':
        if (data.topArtists?.length) {
          phrases.push(`Seu artista #1 é ${data.topArtists[0]?.name}. Isso explica muita coisa. 🎵`)
        }
        break
      case 'discord':
        if (data.guilds?.length > 20) phrases.push(`${data.guilds.length} servidores no Discord... em quantos você realmente fala? 💬`)
        break
      case 'github':
        if (data.repos > 30) phrases.push(`${data.repos} repositórios. Quantos têm commit esse mês? 👨‍💻`)
        if (data.followers === 0) phrases.push('0 seguidores no GitHub. Código secreto de estado? 🤫')
        break
      case 'youtube':
        if (data.subscriptions?.length > 100) phrases.push(`${data.subscriptions.length} canais inscritos. Dorme quando? 📺`)
        break
      case 'tiktok':
        if (data.followers === 0 && data.following === 0) phrases.push('0 seguidores, 0 seguindo... TikTok fantasma? 👻')
        break
      case 'x':
        if (data.tweets > 5000) phrases.push(`${parseInt(data.tweets).toLocaleString()} tweets. Sua opinião é a mais importante, né? 🐦`)
        break
    }
  }

  return phrases
}

// ─── FRASES DO TERMINAL DE VARREDURA ───
export function generateScanLines(platform: string, data: any): string[] {
  const lines: string[] = []

  switch (platform) {
    case 'instagram':
      if (data.followers !== undefined) {
        if (data.followers === 0) lines.push(`0 seguidores... Só tem mosca no Instagram? 🦟`)
        else if (data.followers < 100) lines.push(`${data.followers} seguidores. Tão exclusivo que nem mãe segue. 👩‍👦`)
        else if (data.followers < 1000) lines.push(`${data.followers} seguidores. Micro-influencer de boteco. 🍺`)
        else lines.push(`${parseInt(data.followers).toLocaleString()} seguidores. Famosinho, mas ninguém paga boleto com like. 💸`)
      }
      if (data.following !== undefined && data.following > 2000) lines.push(`Seguindo ${parseInt(data.following).toLocaleString()}... Segue até perfil de cachorro. 🐕`)
      if (data.posts === 0) lines.push('Zero posts. Instagram é só pra stalkear mesmo? 👀')
      else if (data.posts > 500) lines.push(`${data.posts} posts. Terapeuta já está encaminhado. 🛋️`)
      if (data.is_private) lines.push('Perfil privado. Tem coisa aí que não queremos ver... 🔒')
      break

    case 'steam':
      if (data.games?.length) {
        const hours = Math.round(data.games.reduce((s: number, g: any) => s + (g.playtime_forever || 0), 0) / 60)
        if (hours > 3000) lines.push(`${hours.toLocaleString()}h de jogo. Status: Cadeira já tem formato do corpo. 🪑`)
        else if (hours > 1000) lines.push(`${hours.toLocaleString()}h de jogo. Status: Sem vida social. Mas pelo menos não é LoL. 👍`)
        else if (hours > 500) lines.push(`${hours}h de Steam. Dormir é opcional. 😴`)
        else lines.push(`${hours}h de jogo. Casual, mas nem tanto. 🎮`)
      }
      if (data.games?.length > 200) lines.push(`${data.games.length} jogos na biblioteca. Jogou 3. 📚`)
      if (data.games?.length > 50) lines.push(`${data.games.length} jogos. Desses, 80% nunca foram instalados. 📦`)
      if (data.games?.length === 0) lines.push('Nenhum jogo na Steam. Baixou só pra ver as promoções? 🏷️')
      break

    case 'discord':
      if (data.guilds?.length > 30) lines.push(`${data.guilds.length} servidores. Hmmmm, famosinho então? 😏`)
      else if (data.guilds?.length > 10) lines.push(`${data.guilds.length} servidores do Discord. Em nenhum você fala. 🤐`)
      else if (data.guilds?.length > 0) lines.push(`${data.guilds.length} servidores. Quietinho nos cantos. 🥷`)
      else lines.push('0 servidores. Usa Discord só pra call de jogo? 🎧')
      break

    case 'youtube':
      if (data.channel?.statistics?.subscriberCount) {
        const subs = parseInt(data.channel.statistics.subscriberCount)
        if (subs === 0) lines.push('0 inscritos. Canal mais vazio que lanchonete vegana. 🥬')
        else if (subs < 10) lines.push(`${subs} inscritos. Só a família e o tio chato. 👨‍👩‍👦`)
        else if (subs < 1000) lines.push(`${subs.toLocaleString()} inscritos. Tá crescendo! 🌱`)
        else lines.push(`${subs.toLocaleString()} inscritos. Quase um Casimiro. 📺`)
      }
      if (data.subscriptions?.length > 100) lines.push(`Segue ${data.subscriptions.length} canais. Conteúdo infinito, produtividade zero. 📉`)
      if (data.channel?.statistics?.videoCount > 100) lines.push(`${data.channel.statistics.videoCount} vídeos. Criador de conteúdo ou acumulador digital? 🗂️`)
      if (data.channel?.statistics?.videoCount === 0) lines.push('Nunca postou vídeo. Só assiste e julga? 🍿')
      break

    case 'twitch':
      if (data.follows?.length === 0) lines.push('Não segue ninguém na Twitch. Só entra pra ver live vazada? 🫣')
      else if (data.follows?.length > 50) lines.push(`${data.follows.length} canais seguidos. Nunca assistiu 90% deles. 📺`)
      else lines.push(`${data.follows?.length || 0} canais seguidos. Modo espectador anônimo. 👻`)
      break

    case 'tiktok':
      if (data.followers === 0 && data.following === 0) lines.push('0 seguidores, 0 seguindo. Só assiste vídeo de gatinho e dá like sem querer. 🐱')
      if (data.videos > 50) lines.push(`${data.videos} vídeos postados. Dancinha ou opinião polêmica? 💃`)
      if (data.followers > 10000) lines.push(`${parseInt(data.followers).toLocaleString()} seguidores. TikToker profissional ou só sorte do algoritmo? 🎰`)
      if (data.verified) lines.push('Verificado no TikTok. Olha só, temos uma celebridade! ⭐')
      break

    case 'x':
      if (data.tweets > 10000) lines.push(`${parseInt(data.tweets).toLocaleString()} tweets. Já pediu pra sair do Twitter alguma vez? 🐦`)
      if (data.tweets > 1000) lines.push(`${parseInt(data.tweets).toLocaleString()} tweets. Sua opinião é a mais importante, né? 📢`)
      if (data.followers === 0 && data.following === 0) lines.push('0 seguidores, 0 seguindo. Conta só pra ler treta. 🍿')
      if (data.following > 1000) lines.push(`Seguindo ${parseInt(data.following).toLocaleString()}. Linha do tempo deve ser um caos. 🌪️`)
      if (data.verified) lines.push('Verificado no X! Alguém é importante. 💅')
      break

    case 'github':
      if (data.repos > 50) lines.push(`${data.repos} repositórios. Quantos com commit esse ano? 📅`)
      if (data.repos === 0) lines.push('0 repositórios públicos. Dev fantasma ou só commita no privado? 👻')
      if (data.followers === 0) lines.push('0 seguidores no GitHub. Código secreto ou só ninguém entendeu? 🤷')
      if (data.followers > 100) lines.push(`${data.followers} seguidores no GitHub. Alguém é famoso entre os DEVs. ⭐`)
      break

    case 'reddit':
      if (data.link_karma === 0 && data.comment_karma === 0) lines.push('0 karma. Lurker profissional. Nunca postou, nunca comentou. 🥷')
      if (data.comment_karma > 50000) lines.push(`${parseInt(data.comment_karma).toLocaleString()} karma. Redditor raiz. Toma sol às vezes? ☀️`)
      if (data.comment_karma > 10000) lines.push(`${parseInt(data.comment_karma).toLocaleString()} karma. Reddit é sua segunda casa. 🏠`)
      break
  }

  if (lines.length === 0) lines.push('[CLAUDEMIRO] Dados insuficientes para zoar. Conecte mais redes! 🔌')
  return lines
}

// ─── MOOD DO ROBÔ ───
export function getBotMood(connectionsCount: number): { eyes: string; label: string; scale: number; speed: number } {
  if (connectionsCount === 0) return { eyes: 'normal', label: 'Neutro', scale: 1, speed: 20 }
  if (connectionsCount <= 3) return { eyes: 'sereno', label: 'Sereno', scale: 1.05, speed: 16 }
  if (connectionsCount <= 6) return { eyes: 'feliz', label: 'Feliz', scale: 1.1, speed: 12 }
  return { eyes: 'safado', label: 'Safado 😏', scale: 1.15, speed: 8 }
}
