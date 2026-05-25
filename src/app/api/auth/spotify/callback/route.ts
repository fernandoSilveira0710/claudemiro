import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // user ID
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=spotify', process.env.NEXT_PUBLIC_APP_URL))
  }

  // Trocar code por token
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/spotify/callback`,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/connect?error=spotify_token', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokens = await tokenRes.json()

  // Buscar dados do perfil Spotify
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!profileRes.ok) {
    return NextResponse.redirect(new URL('/connect?error=spotify_profile', process.env.NEXT_PUBLIC_APP_URL))
  }

  const profile = await profileRes.json()

  // Salvar no Supabase
  const supabase = await createServerSupabase()
  await supabase.from('social_connections').upsert({
    user_id: state,
    platform: 'spotify',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    platform_user_id: profile.id,
    platform_username: profile.display_name,
    raw_data: profile,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  return NextResponse.redirect(new URL('/connect?success=spotify', process.env.NEXT_PUBLIC_APP_URL))
}
