import { createServerSupabase } from './supabase/server'

export interface ScannedUserData {
  spotify?: {
    topArtists: { name: string; genres: string[] }[]
    topTracks: { name: string; artist: string; previewUrl?: string | null; spotifyUrl?: string }[]
  }
  steam?: {
    profile: { personaname: string; avatarfull: string }
    games: { name: string; playtime_forever: number; playtime_2weeks?: number }[]
  }
  [platform: string]: any
}

export async function scanUserData(userId: string): Promise<ScannedUserData> {
  const supabase = await createServerSupabase()

  const { data: connections } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', userId)

  const data: ScannedUserData = {}

  for (const conn of connections || []) {
    switch (conn.platform) {
      case 'spotify': {
        // Verificar se token expirou e refresh
        let token = conn.access_token
        if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
          token = await refreshSpotifyToken(conn.refresh_token!)
          await supabase.from('social_connections')
            .update({ access_token: token })
            .eq('id', conn.id)
        }

        try {
          const [artistsRes, tracksRes] = await Promise.all([
            fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=medium_term', {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch('https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term', {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ])

          const artists = await artistsRes.json()
          const tracks = await tracksRes.json()

          data.spotify = {
            topArtists: artists.items?.map((a: any) => ({
              name: a.name,
              genres: a.genres?.slice(0, 5) || [],
            })) || [],
            topTracks: tracks.items?.map((t: any) => ({
              name: t.name,
              artist: t.artists?.[0]?.name || '',
              previewUrl: t.preview_url || null,
              spotifyUrl: t.external_urls?.spotify || undefined,
            })) || [],
          }
        } catch {
          // Token inválido, pular
        }
        break
      }

      case 'steam': {
        data.steam = conn.raw_data
        break
      }

      default:
        if (conn.raw_data) {
          data[conn.platform] = conn.raw_data
        }
    }
  }

  return data
}

async function refreshSpotifyToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  const data = await res.json()
  return data.access_token
}
