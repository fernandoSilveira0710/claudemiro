import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=twitch', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitch/callback`,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/connect?error=twitch_token', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokens = await tokenRes.json()

  // Buscar dados do usuário Twitch
  const profileRes = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID!,
    },
  })

  if (!profileRes.ok) {
    return NextResponse.redirect(new URL('/connect?error=twitch_profile', process.env.NEXT_PUBLIC_APP_URL))
  }

  const profileData = await profileRes.json()
  const profile = profileData.data?.[0]

  // Buscar streams seguidos
  let follows = []
  try {
    const followsRes = await fetch(
      `https://api.twitch.tv/helix/channels/followed?user_id=${profile?.id}`,
      { headers: { Authorization: `Bearer ${tokens.access_token}`, 'Client-Id': process.env.TWITCH_CLIENT_ID! } }
    )
    const followsData = await followsRes.json()
    follows = followsData.data || []
  } catch {}

  const supabase = await createServerSupabase()
  await supabase.from('social_connections').upsert({
    user_id: state,
    platform: 'twitch',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    platform_user_id: profile?.id,
    platform_username: profile?.display_name,
    raw_data: { ...profile, follows },
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  return NextResponse.redirect(new URL('/connect?success=twitch', process.env.NEXT_PUBLIC_APP_URL))
}
