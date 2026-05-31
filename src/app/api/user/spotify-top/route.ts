import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Retorna as top 10 músicas do Spotify do usuário.
// Se não estiver conectado, devolve { connected: false, authUrl } pra redirecionar ao OAuth.
export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conn } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', 'spotify')
    .single()

  // Não conectado → manda autorizar
  if (!conn) {
    return NextResponse.json({
      connected: false,
      authUrl: `/api/auth/spotify`,
    })
  }

  // Refresh token se expirou
  let token = conn.access_token
  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date() && conn.refresh_token) {
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token,
          client_id: process.env.SPOTIFY_CLIENT_ID!,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
        }),
      })
      const j = await res.json()
      if (j.access_token) {
        token = j.access_token
        await supabase.from('social_connections').update({ access_token: token }).eq('id', conn.id)
      }
    } catch { /* segue com token antigo */ }
  }

  try {
    const res = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      // token inválido → reautorizar
      return NextResponse.json({ connected: false, authUrl: `/api/auth/spotify` })
    }
    const data = await res.json()
    const tracks = (data.items || []).map((t: any) => ({
      name: t.name,
      artist: t.artists?.[0]?.name || '',
      spotifyUrl: t.external_urls?.spotify || '',
    }))
    return NextResponse.json({ connected: true, tracks })
  } catch {
    return NextResponse.json({ connected: false, authUrl: `/api/auth/spotify` })
  }
}
