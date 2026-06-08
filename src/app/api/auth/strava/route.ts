import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const TRAKT_API = 'https://api.trakt.tv'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=trakt', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokenRes = await fetch(`${TRAKT_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.TRAKT_CLIENT_ID,
      client_secret: process.env.TRAKT_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/trakt/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/connect?error=trakt_token', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokens = await tokenRes.json()
  const headers = {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': process.env.TRAKT_CLIENT_ID!,
    Authorization: `Bearer ${tokens.access_token}`,
  }

  let username = ''
  let raw: Record<string, unknown> = {}
  try {
    const meRes = await fetch(`${TRAKT_API}/users/me`, { headers })
    const me = meRes.ok ? await meRes.json() : {}
    username = me?.username || ''

    const statsRes = await fetch(`${TRAKT_API}/users/me/stats`, { headers })
    if (statsRes.ok) {
      const s = await statsRes.json()
      raw = {
        username,
        stats: {
          movies_watched: s?.movies?.watched || 0,
          episodes_watched: s?.episodes?.watched || 0,
          shows_watched: s?.shows?.watched || 0,
        },
      }
    }
  } catch { /* segue */ }

  const supabase = await createServerSupabase()
  await supabase.from('social_connections').upsert({
    user_id: state,
    platform: 'trakt',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: tokens.created_at && tokens.expires_in
      ? new Date((tokens.created_at + tokens.expires_in) * 1000).toISOString() : null,
    platform_username: username,
    raw_data: raw,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  return NextResponse.redirect(new URL('/connect?success=trakt', process.env.NEXT_PUBLIC_APP_URL))
}
