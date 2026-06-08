import type { ScannedUserData } from './scanner'

// ── Métricas verificáveis por API (cada uma vem de um campo real) ──
export interface Metrics {
  steam_total_hours?: number
  steam_top_game?: string
  steam_top_game_hours?: number
  steam_library_count?: number
  instagram_followers?: number
  instagram_posts?: number
  twitter_followers?: number
  twitter_tweets?: number
  tiktok_followers?: number
  tiktok_videos?: number
  youtube_subscriptions?: number
  github_followers?: number
  github_repos?: number
  reddit_karma?: number
  discord_servers?: number
  spotify_top_artist?: string
  spotify_distinct_genres?: number
  trakt_movies_watched?: number
  trakt_episodes_watched?: number
  hardcover_books_read?: number
}

export interface Goal {
  id: string
  platform: string
  emoji: string
  label: string
  metric?: keyof Metrics  // só metas VERIFICÁVEIS têm metric
  baseline?: number
  target?: number
  verified: boolean       // true = checada por API; false = "na honra" (usuário marca)
  done?: boolean
}

export interface SkillDelta { name: string; delta: number }
export interface Progression {
  overall_delta: number
  skills: SkillDelta[]
  goals_met: number
  goals_total: number
}

function num(v: unknown): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Extrai números comparáveis do scanned_data — só campos que uma API confirma. */
export function extractMetrics(data: ScannedUserData): Metrics {
  const m: Metrics = {}

  const games = data.steam?.games
  if (games?.length) {
    m.steam_total_hours = Math.round(games.reduce((s, g) => s + (g.playtime_forever || 0), 0) / 60)
    m.steam_library_count = games.length
    const top = [...games].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))[0]
    if (top) { m.steam_top_game = top.name; m.steam_top_game_hours = Math.round((top.playtime_forever || 0) / 60) }
  }

  const ig = data.instagram
  if (ig) {
    m.instagram_followers = num(ig.followers ?? ig.followers_count ?? ig.edge_followed_by?.count)
    m.instagram_posts = num(ig.posts ?? ig.media_count ?? ig.edge_owner_to_timeline_media?.count)
  }

  const tw = data.twitter || data.x
  if (tw) {
    m.twitter_followers = num(tw.followers ?? tw.followers_count)
    m.twitter_tweets = num(tw.tweets ?? tw.statuses_count)
  }

  const tk = data.tiktok
  if (tk) {
    m.tiktok_followers = num(tk.followers)
    m.tiktok_videos = num(tk.videos)
  }

  const yt = data.youtube
  if (yt) m.youtube_subscriptions = num(yt.subscriptions_count ?? (Array.isArray(yt.subscriptions) ? yt.subscriptions.length : undefined))

  const gh = data.github
  if (gh) {
    m.github_followers = num(gh.followers)
    m.github_repos = num(gh.public_repos ?? gh.repos)
  }

  const rd = data.reddit
  if (rd) m.reddit_karma = num(rd.total_karma ?? rd.followers)

  const dc = data.discord
  if (dc?.guilds) m.discord_servers = Array.isArray(dc.guilds) ? dc.guilds.length : undefined

  if (data.spotify?.topArtists?.length) {
    m.spotify_top_artist = data.spotify.topArtists[0].name
    const genres = new Set(data.spotify.topArtists.flatMap(a => a.genres || []))
    m.spotify_distinct_genres = genres.size || undefined
  }

  const tr = data.trakt
  if (tr?.stats) {
    m.trakt_movies_watched = num(tr.stats.movies_watched)
    m.trakt_episodes_watched = num(tr.stats.episodes_watched)
  }

  const hc = data.hardcover
  if (hc?.stats) m.hardcover_books_read = num(hc.stats.books_read)

  return m
}

/**
 * Gera metas pra próxima geração.
 * VERIFICÁVEIS (verified:true): re-medidas por API e comparadas ao target.
 * DECLARATIVAS (verified:false): tópicos sem API conectada (fitness) — o usuário
 *   marca como cumprida na honra; só entram se o perfil tiver esses interesses.
 */
export function generateGoals(metrics: Metrics, interests?: string[]): Goal[] {
  const g: Goal[] = []

  // ── VERIFICÁVEIS ──
  if (metrics.steam_top_game && metrics.steam_top_game_hours != null)
    g.push({ id: 'steam_play', platform: 'steam', emoji: '🎮', label: `Jogue +2h de ${metrics.steam_top_game}`, metric: 'steam_top_game_hours', baseline: metrics.steam_top_game_hours, target: metrics.steam_top_game_hours + 2, verified: true })

  if (metrics.trakt_episodes_watched != null)
    g.push({ id: 'trakt_eps', platform: 'trakt', emoji: '📺', label: 'Assista +5 episódios', metric: 'trakt_episodes_watched', baseline: metrics.trakt_episodes_watched, target: metrics.trakt_episodes_watched + 5, verified: true })
  else if (metrics.trakt_movies_watched != null)
    g.push({ id: 'trakt_movies', platform: 'trakt', emoji: '🎬', label: 'Assista +2 filmes', metric: 'trakt_movies_watched', baseline: metrics.trakt_movies_watched, target: metrics.trakt_movies_watched + 2, verified: true })

  if (metrics.hardcover_books_read != null)
    g.push({ id: 'hc_books', platform: 'hardcover', emoji: '📚', label: 'Termine +1 livro', metric: 'hardcover_books_read', baseline: metrics.hardcover_books_read, target: metrics.hardcover_books_read + 1, verified: true })

  if (metrics.spotify_distinct_genres != null)
    g.push({ id: 'spotify_genre', platform: 'spotify', emoji: '🎧', label: 'Saia da bolha: ouça +1 gênero novo', metric: 'spotify_distinct_genres', baseline: metrics.spotify_distinct_genres, target: metrics.spotify_distinct_genres + 1, verified: true })

  if (metrics.instagram_posts != null)
    g.push({ id: 'ig_posts', platform: 'instagram', emoji: '📸', label: 'Poste +3 fotos no Instagram', metric: 'instagram_posts', baseline: metrics.instagram_posts, target: metrics.instagram_posts + 3, verified: true })

  if (metrics.github_repos != null)
    g.push({ id: 'gh_repos', platform: 'github', emoji: '💻', label: 'Crie +1 repositório público', metric: 'github_repos', baseline: metrics.github_repos, target: metrics.github_repos + 1, verified: true })

  if (metrics.youtube_subscriptions != null)
    g.push({ id: 'yt_subs', platform: 'youtube', emoji: '▶️', label: 'Inscreva-se em +3 canais', metric: 'youtube_subscriptions', baseline: metrics.youtube_subscriptions, target: metrics.youtube_subscriptions + 3, verified: true })

  if (metrics.reddit_karma != null)
    g.push({ id: 'reddit_karma', platform: 'reddit', emoji: '🤖', label: 'Ganhe +50 de karma no Reddit', metric: 'reddit_karma', baseline: metrics.reddit_karma, target: metrics.reddit_karma + 50, verified: true })

  // ── DECLARATIVAS ("na honra") — interesses sem API conectada ──
  const has = (t: string) => interests?.includes(t)
  // leitura só vira declarativa se NÃO tiver Hardcover conectado
  if ((has('saude') || has('academia')))
    g.push({ id: 'honor_fitness', platform: 'honor', emoji: '🏃', label: 'Faça 3 treinos/caminhadas esta semana', verified: false })
  if (has('leitura') && metrics.hardcover_books_read == null)
    g.push({ id: 'honor_reading', platform: 'honor', emoji: '📖', label: 'Leia 50 páginas de um livro', verified: false })

  return g.slice(0, 5)
}

/**
 * Re-checa metas da rodada anterior.
 * - verified: compara métrica atual com o target.
 * - declarativa: usa o estado marcado pelo usuário (honorDone por id).
 */
export function checkGoals(previousGoals: Goal[] | undefined, currentMetrics: Metrics, honorDone?: Record<string, boolean>): Goal[] {
  if (!previousGoals?.length) return []
  return previousGoals.map(goal => {
    if (goal.verified && goal.metric && goal.target != null) {
      const current = currentMetrics[goal.metric]
      return { ...goal, done: typeof current === 'number' && current >= goal.target }
    }
    return { ...goal, done: honorDone?.[goal.id] ?? goal.done ?? false }
  })
}

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
  const avg = (arr: { value: number }[]) => arr.length ? Math.round(arr.reduce((sum, x) => sum + x.value, 0) / arr.length) : 0
  return {
    overall_delta: avg(cur) - avg(prev),
    skills,
    goals_met: checkedGoals.filter(x => x.done).length,
    goals_total: checkedGoals.length,
  }
}
