import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=strava', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/connect?error=strava_token', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokens = await tokenRes.json()
  const athlete = tokens.athlete

  // stats do atleta (recent_*_totals ~ últimas 4 semanas)
  let raw: Record<string, unknown> = { athlete }
  try {
    const statsRes = await fetch(`https://www.strava.com/api/v3/athletes/${athlete?.id}/stats`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (statsRes.ok) {
      const s = await statsRes.json()
      // soma run + ride + swim para "recent" e "ytd"
      const sumRecent = ['recent_run_totals', 'recent_ride_totals', 'recent_swim_totals']
        .map(k => s[k]).filter(Boolean)
      const sumYtd = ['ytd_run_totals', 'ytd_ride_totals', 'ytd_swim_totals']
        .map(k => s[k]).filter(Boolean)
      raw = {
        athlete: { id: athlete?.id, username: athlete?.username, firstname: athlete?.firstname },
        recent: {
          count: sumRecent.reduce((a, t) => a + (t.count || 0), 0),
          distance_m: sumRecent.reduce((a, t) => a + (t.distance || 0), 0),
          moving_time_s: sumRecent.reduce((a, t) => a + (t.moving_time || 0), 0),
        },
        ytd: {
          count: sumYtd.reduce((a, t) => a + (t.count || 0), 0),
          distance_m: sumYtd.reduce((a, t) => a + (t.distance || 0), 0),
        },
      }
    }
  } catch { /* segue com athlete só */ }

  const supabase = await createServerSupabase()
  await supabase.from('social_connections').upsert({
    user_id: state,
    platform: 'strava',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: tokens.expires_at ? new Date(tokens.expires_at * 1000).toISOString() : null,
    platform_user_id: String(athlete?.id || ''),
    platform_username: athlete?.username || `${athlete?.firstname || ''}`.trim(),
    raw_data: raw,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  return NextResponse.redirect(new URL('/connect?success=strava', process.env.NEXT_PUBLIC_APP_URL))
}
