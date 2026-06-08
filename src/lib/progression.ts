import type { ScannedUserData } from './scanner'

export interface Metrics {
  steam_total_hours?: number
  steam_top_game?: string
  steam_top_game_hours?: number
  instagram_followers?: number
  instagram_posts?: number
  spotify_top_artist?: string
  twitter_followers?: number
  discord_servers?: number
}

export interface Goal {
  id: string
  platform: string
  emoji: string
  label: string          // "Jogue +1h de Lethal Company"
  metric: keyof Metrics  // qual métrica observar
  baseline: number       // valor no momento da geração
  target: number         // valor a atingir
  done?: boolean
}

export interface SkillDelta { name: string; delta: number }
export interface Progression {
  overall_delta: number
  skills: SkillDelta[]
  goals_met: number
  goals_total: number
}

/** Extrai números comparáveis do scanned_data. */
export function extractMetrics(data: ScannedUserData): Metrics {
  const m: Metrics = {}

  const games = data.steam?.games
  if (games?.length) {
    m.steam_total_hours = Math.round(games.reduce((s, g) => s + (g.playtime_forever || 0), 0) / 60)
    const top = [...games].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))[0]
    if (top) { m.steam_top_game = top.name; m.steam_top_game_hours = Math.round((top.playtime_forever || 0) / 60) }
  }

  const ig = data.instagram
  if (ig) {
    m.instagram_followers = Number(ig.followers ?? ig.followers_count ?? ig.edge_followed_by?.count) || undefined
    m.instagram_posts = Number(ig.posts ?? ig.media_count ?? ig.edge_owner_to_timeline_media?.count) || undefined
  }

  if (data.spotify?.topArtists?.[0]) m.spotify_top_artist = data.spotify.topArtists[0].name

  const tw = data.twitter || data.x
  if (tw) m.twitter_followers = Number(tw.followers ?? tw.followers_count) || undefined

  const dc = data.discord
  if (dc?.guilds) m.discord_servers = Array.isArray(dc.guilds) ? dc.guilds.length : undefined

  return m
}

/** Gera metas mensuráveis pra próxima geração, a partir das métricas atuais. */
export function generateGoals(metrics: Metrics): Goal[] {
  const goals: Goal[] = []

  if (metrics.steam_top_game && metrics.steam_top_game_hours != null) {
    goals.push({
      id: 'steam_play', platform: 'steam', emoji: '🎮',
      label: `Jogue +2h de ${metrics.steam_top_game}`,
      metric: 'steam_top_game_hours', baseline: metrics.steam_top_game_hours, target: metrics.steam_top_game_hours + 2,
    })
  }
  if (metrics.instagram_posts != null) {
    goals.push({
      id: 'ig_posts', platform: 'instagram', emoji: '📸',
      label: 'Poste 3 fotos novas no Instagram',
      metric: 'instagram_posts', baseline: metrics.instagram_posts, target: metrics.instagram_posts + 3,
    })
  }
  if (metrics.instagram_followers != null) {
    goals.push({
      id: 'ig_followers', platform: 'instagram', emoji: '📈',
      label: 'Ganhe +10 seguidores no Instagram',
      metric: 'instagram_followers', baseline: metrics.instagram_followers, target: metrics.instagram_followers + 10,
    })
  }
  if (metrics.twitter_followers != null) {
    goals.push({
      id: 'tw_followers', platform: 'twitter', emoji: '🐦',
      label: 'Ganhe +5 seguidores no X',
      metric: 'twitter_followers', baseline: metrics.twitter_followers, target: metrics.twitter_followers + 5,
    })
  }

  return goals.slice(0, 4)
}

/** Marca metas cumpridas comparando metas antigas com as métricas atuais. */
export function checkGoals(previousGoals: Goal[] | undefined, currentMetrics: Metrics): Goal[] {
  if (!previousGoals?.length) return []
  return previousGoals.map(g => {
    const current = currentMetrics[g.metric]
    const done = typeof current === 'number' && current >= g.target
    return { ...g, done }
  })
}

/** Calcula deltas de skills e overall vs o veredito anterior. */
export function calcProgression(
  prevSkills: { name: string; value: number }[] | undefined,
  currentSkills: { name: string; value: number }[] | undefined,
  checkedGoals: Goal[],
): Progression {
  const prev = prevSkills || []
  const cur = currentSkills || []

  const skills: SkillDelta[] = cur.map(s => {
    const old = prev.find(p => p.name === s.name)
    return { name: s.name, delta: old ? s.value - old.value : 0 }
  })

  const avg = (arr: { value: number }[]) =>
    arr.length ? Math.round(arr.reduce((sum, x) => sum + x.value, 0) / arr.length) : 0
  const overall_delta = avg(cur) - avg(prev)

  return {
    overall_delta,
    skills,
    goals_met: checkedGoals.filter(g => g.done).length,
    goals_total: checkedGoals.length,
  }
}
