// Base de frases/memes por plataforma para o terminal de varredura
// Usa dados reais (números) com templates de frases engraçadas

export function generateScanLines(platform: string, data: any): string[] {
  const lines: string[] = []

  switch (platform) {
    case 'instagram':
      if (data.followers !== undefined) {
        if (data.followers === 0) lines.push(`${data.followers} seguidores... Só tem mosca no Instagram?`)
        else if (data.followers < 100) lines.push(`${data.followers} seguidores. Tão exclusivo que nem mãe segue.`)
        else if (data.followers < 1000) lines.push(`${data.followers} seguidores. Micro-influencer de boteco.`)
        else lines.push(`${parseInt(data.followers).toLocaleString()} seguidores. Famosinho, mas ninguém paga boleto com like.`)
      }
      if (data.following !== undefined && data.following > 2000) lines.push(`Seguindo ${parseInt(data.following).toLocaleString()}... Segue até perfil de cachorro.`)
      if (data.posts === 0) lines.push('Zero posts. Instagram é só pra stalkear mesmo?')
      else if (data.posts && data.posts > 500) lines.push(`${data.posts} posts. Terapeuta já está encaminhado.`)
      break

    case 'steam':
      if (data.games?.length) {
        const hours = Math.round(data.games.reduce((s: number, g: any) => s + (g.playtime_forever || 0), 0) / 60)
        if (hours > 2000) lines.push(`${hours}h de jogo. Status: Sem vida social. Mas pelo menos não é LoL.`)
        else if (hours > 500) lines.push(`${hours}h de Steam. Dormir é opcional.`)
        else lines.push(`${hours}h de jogo. Casual, mas nem tanto.`)
      }
      if (data.games?.length > 200) lines.push(`${data.games.length} jogos na biblioteca. Jogou 3.`)
      if (data.games?.length > 50) lines.push(`${data.games.length} jogos. Desses, 47 nunca foram instalados.`)
      break

    case 'discord':
      if (data.guilds?.length > 30) lines.push(`${data.guilds.length} servidores. Hmmmm, famosinho então?`)
      else if (data.guilds?.length > 10) lines.push(`${data.guilds.length} servidores do Discord. Em nenhum você fala.`)
      else if (data.guilds?.length > 0) lines.push(`${data.guilds.length} servidores. Quietinho nos cantos.`)
      break

    case 'spotify':
      if (data.topArtists?.length) {
        lines.push(`Artista #1: ${data.topArtists[0]?.name || '???'}. Diz muito sobre você.`)
      }
      if (data.topTracks?.length) {
        const sad = data.topTracks.filter((t: any) =>
          t.name?.toLowerCase().includes('triste') || t.name?.toLowerCase().includes('choro') || t.name?.toLowerCase().includes('sofrência') || t.artist?.toLowerCase().includes('sertanejo')
        )
        if (sad.length > 0) lines.push('Playlist de "Músicas para Chorar no Banho" detectada.')
      }
      break

    case 'youtube':
      if (data.channel?.statistics?.subscriberCount) {
        const subs = parseInt(data.channel.statistics.subscriberCount)
        if (subs === 0) lines.push('0 inscritos. Canal mais vazio que lanchonete vegana.')
        else if (subs < 10) lines.push(`${subs} inscritos. Só a família e o tio chato.`)
        else lines.push(`${subs.toLocaleString()} inscritos. Quase um Casimiro.`)
      }
      if (data.subscriptions?.length > 100) lines.push(`Segue ${data.subscriptions.length} canais. Conteúdo infinito, produtividade zero.`)
      if (data.channel?.statistics?.videoCount > 100) lines.push(`${data.channel.statistics.videoCount} vídeos. Criador de conteúdo ou acumulador digital?`)
      break

    case 'twitch':
      if (data.follows?.length === 0) lines.push('Não segue ninguém na Twitch. Só entra pra ver live vazada?')
      else if (data.follows?.length > 50) lines.push(`${data.follows.length} canais seguidos. Nunca assistiu 90% deles.`)
      break

    case 'tiktok':
      if (data.followers === 0 && data.following === 0) lines.push('0 seguidores, 0 seguindo. Só assiste vídeo de gatinho e dá like sem querer.')
      if (data.videos > 50) lines.push(`${data.videos} vídeos. Dancinha ou opinião polêmica?`)
      if (data.followers > 10000) lines.push(`${parseInt(data.followers).toLocaleString()} seguidores. TikToker profissional ou só sorte do algoritmo?`)
      break

    case 'x':
      if (data.tweets > 10000) lines.push(`${parseInt(data.tweets).toLocaleString()} tweets. Já pediu pra sair do Twitter alguma vez?`)
      if (data.followers === 0) lines.push('0 seguidores. Conta só pra xingar político no anonimato.')
      if (data.following > 1000) lines.push(`Seguindo ${parseInt(data.following).toLocaleString()}. Linha do tempo deve ser um caos.`)
      break

    case 'github':
      if (data.repos > 50) lines.push(`${data.repos} repositórios. Quantos com commit esse ano?`)
      if (data.followers === 0) lines.push('0 seguidores no GitHub. Código secreto ou só ninguém entendeu?')
      if (data.repos === 0) lines.push('0 repositórios públicos. Dev fantasma ou só commita no privado?')
      break

    case 'reddit':
      if (data.link_karma === 0 && data.comment_karma === 0) lines.push('0 karma. Lurker profissional. Nunca postou, nunca comentou.')
      if (data.comment_karma > 50000) lines.push(`${parseInt(data.comment_karma).toLocaleString()} karma. Redditor raiz. Toma sol às vezes?`)
      break

    default:
      lines.push('Dados sendo analisados... Claudemiro está de olho.')
  }

  if (lines.length === 0) lines.push('Dados detectados. Claudemiro está processando...')
  return lines
}

// Expressões do robô baseado no número de conexões
export function getBotMood(connectionsCount: number): { eyes: string; label: string; scale: number; speed: number } {
  if (connectionsCount === 0) return { eyes: 'normal', label: 'Neutro', scale: 1, speed: 20 }
  if (connectionsCount <= 3) return { eyes: 'sereno', label: 'Sereno', scale: 1.05, speed: 16 }
  if (connectionsCount <= 6) return { eyes: 'feliz', label: 'Feliz', scale: 1.1, speed: 12 }
  return { eyes: 'safado', label: 'Safado 😏', scale: 1.15, speed: 8 }
}
