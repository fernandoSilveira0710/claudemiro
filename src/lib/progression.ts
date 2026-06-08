import type { ScannedUserData } from './scanner'

// ── Métricas verificáveis por API (cada uma vem de um campo real) ──
export interface Metrics {
  // Steam — playtime_forever / playtime_2weeks (min → h)
  steam_total_hours?: number
  steam_top_game?: string
  steam_top_game_hours?: number
  steam_library_count?: number
  // Instagram (scraper) — edge_followed_by / edge_owner_to_timeline_media
  instagram_followers?: number
  instagram_posts?: number
  // X/Twitter (scraper) — followers_count / statuses_count
  twitter_followers?: number
  twitter_tweets?: number
  // TikTok (scraper)
  tiktok_followers?: number
  tiktok_videos?: number
  // YouTube (Data API) — channels.statistics + subscriptions
  youtube_subscriptions?: number
  youtube_subscribers?: number
  // GitHub
  github_followers?: number
  github_repos?: number
  // Reddit
  reddit_karma?: number
  // Discord — guilds.length
  discord_servers?: number
  // Spotify — top + recently played (artistas/gêneros distintos)
  spotify_top_artist?: string
  spotify_distinct_genres?: number
  spotify_recent_artists?: string[]   // artistas ouvidos recentemente (recently-played)
  // Strava — athlete/stats recent_*_totals (distance m, moving_time s, count)
  strava_recent_distance_km?: number
  strava_recent_activities?: number
  strava_recent_moving_min?: number
  // Trakt — users/me/stats
  trakt_movies_watched?: number
  trakt_episodes_watched?: number
}

export interface Goal {
  id: string
  platform: string
  emoji: string
  label: string
  metric: keyof Metrics
  baseline: number
  target: number
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

  // Steam
  const games = data.steam?.games
  if (games?.length) {
    m.steam_total_hours = Math.round(games.reduce((s, g) => s + (g.playtime_forever || 0), 0) / 60)
    m.steam_library_count = games.length
    const top = [...games].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))[0]
    if (top) { m.steam_top_game = top.name; m.steam_top_game_hours = Math.round((top.playtime_forever || 0) / 60) }
  }

  // Instagram
  const ig = data.instagram
  if (ig) {
    m.instagram_followers = num(ig.followers ?? ig.followers_count ?? ig.edge_followed_by?.count)
    m.instagram_posts = num(ig.posts ?? ig.media_count ?? ig.edge_owner_to_timeline_media?.count)
  }

  // X/Twitter
  const tw = data.twitter || data.x
  if (tw) {
    m.twitter_followers = num(tw.followers ?? tw.followers_count)
    m.twitter_tweets = num(tw.tweets ?? tw.statuses_count)
  }

  // TikTok
  const tk = data.tiktok
  if (tk) {
    m.tiktok_followers = num(tk.followers)
    m.tiktok_videos = num(tk.videos)
  }

  // YouTube
  const yt = data.youtube
  if (yt) {
    m.youtube_subscriptions = num(yt.subscriptions_count ?? (Array.isArray(yt.subscriptions) ? yt.subscriptions.length : undefined))
    m.youtube_subscribers = num(yt.subscriberCount ?? yt.statistics?.subscriberCount)
  }

  // GitHub
  const gh = data.github
  if (gh) {
    m.github_followers = num(gh.followers)
    m.github_repos = num(gh.public_repos ?? gh.repos)
  }

  // Reddit
  const rd = data.reddit
  if (rd) m.reddit_karma = num(rd.total_karma ?? rd.followers)

  // Discord
  const dc = data.discord
  if (dc?.guilds) m.discord_servers = Array.isArray(dc.guilds) ? dc.guilds.length : undefined

  // Spotify
  if (data.spotify?.topArtists?.length) {
    m.spotify_top_artist = data.spotify.topArtists[0].name
    const genres = new Set(data.spotify.topArtists.flatMap(a => a.genres || []))
    m.spotify_distinct_genres = genres.size || undefined
  }
  if (data.spotify?.recentlyPlayed?.length) {
    m.spotify_recent_artists = [...new Set(data.spotify.recentlyPlayed.map(t => t.artist))]
  }

  // Strava
  const st = data.strava
  if (st?.recent) {
    m.strava_recent_distance_km = num(Math.round((st.recent.distance_m || 0) / 1000))
    m.strava_recent_activities = num(st.recent.count)
    m.strava_recent_moving_min = num(Math.round((st.recent.moving_time_s || 0) / 60))
  }

  // Trakt
  const tr = data.trakt
  if (tr?.stats) {
    m.trakt_movies_watched = num(tr.stats.movies_watched)
    m.trakt_episodes_watched = num(tr.stats.episodes_watched)
  }

  return m
}

/**
 * Gera metas verificáveis pra próxima geração.
 * Cada meta aponta para uma `metric` que será re-medida e comparada ao `target`.
 */
export function generateGoals(metrics: Metrics): Goal[] {
  const g: Goal[] = []

  if (metrics.steam_top_game && metrics.steam_top_game_hours != null)
    g.push({ id: 'steam_play', platform: 'steam', emoji: '🎮', label: `Jogue +2h de ${metrics.steam_top_game}`, metric: 'steam_top_game_hours', baseline: metrics.steam_top_game_hours, target: metrics.steam_top_game_hours + 2 })

  if (metrics.strava_recent_distance_km != null)
    g.push({ id: 'strava_dist', platform: 'strava', emoji: '🏃', label: 'Caminhe/corra +10km esta semana', metric: 'strava_recent_distance_km', baseline: metrics.strava_recent_distance_km, target: metrics.strava_recent_distance_km + 10 })
  else if (metrics.strava_recent_activities != null)
    g.push({ id: 'strava_act', platform: 'strava', emoji: '🏃', label: 'Registre +3 atividades no Strava', metric: 'strava_recent_activities', baseline: metrics.strava_recent_activities, target: metrics.strava_recent_activities + 3 })

  if (metrics.trakt_episodes_watched != null)
    g.push({ id: 'trakt_eps', platform: 'trakt', emoji: '📺', label: 'Assista +5 episódios', metric: 'trakt_episodes_watched', baseline: metrics.trakt_episodes_watched, target: metrics.trakt_episodes_watched + 5 })
  else if (metrics.trakt_movies_watched != null)
    g.push({ id: 'trakt_movies', platform: 'trakt', emoji: '🎬', label: 'Assista +2 filmes', metric: 'trakt_movies_watched', baseline: metrics.trakt_movies_watched, target: metrics.trakt_movies_watched + 2 })

  if (metrics.spotify_distinct_genres != null)
    g.push({ id: 'spotify_genre', platform: 'spotify', emoji: '🎧', label: 'Saia da bolha: ouça +1 gênero novo', metric: 'spotify_distinct_genres', baseline: metrics.spotify_distinct_genres, target: metrics.spotify_distinct_genres + 1 })

  if (metrics.instagram_posts != null)
    g.push({ id: 'ig_posts', platform: 'instagram', emoji: '📸', label: 'Poste +3 fotos no Instagram', metric: 'instagram_posts', baseline: metrics.instagram_posts, target: metrics.instagram_posts + 3 })

  if (metrics.github_repos != null)
    g.push({ id: 'gh_repos', platform: 'github', emoji: '💻', label: 'Crie +1 repositório público', metric: 'github_repos', baseline: metrics.github_repos, target: metrics.github_repos + 1 })

  if (metrics.youtube_subscriptions != null)
    g.push({ id: 'yt_subs', platform: 'youtube', emoji: '▶️', label: 'Inscreva-se em +3 canais', metric: 'youtube_subscriptions', baseline: metrics.youtube_subscriptions, target: metrics.youtube_subscriptions + 3 })

  if (metrics.reddit_karma != null)
    g.push({ id: 'reddit_karma', platform: 'reddit', emoji: '🤖', label: 'Ganhe +50 de karma no Reddit', metric: 'reddit_karma', baseline: metrics.reddit_karma, target: metrics.reddit_karma + 50 })

  return g.slice(0, 5)
}

/** Meta especial: "ouça N músicas do artista X" (via recently-played). Checagem por presença. */
export function checkGoals(previousGoals: Goal[] | undefined, currentMetrics: Metrics): Goal[] {
  if (!previousGoals?.length) return []
  return previousGoals.map(goal => {
    const current = currentMetrics[goal.metric]
    const done = typeof current === 'number' && current >= goal.target
    return { ...goal, done }
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
