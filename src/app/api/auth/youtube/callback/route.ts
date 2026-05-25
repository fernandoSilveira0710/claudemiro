import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=youtube', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/connect?error=youtube_token', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokens = await tokenRes.json()

  // Buscar dados do canal
  const channelRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  )

  if (!channelRes.ok) {
    return NextResponse.redirect(new URL('/connect?error=youtube_profile', process.env.NEXT_PUBLIC_APP_URL))
  }

  const channelData = await channelRes.json()
  const channel = channelData.items?.[0]

  const supabase = await createServerSupabase()
  await supabase.from('social_connections').upsert({
    user_id: state,
    platform: 'youtube',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    platform_user_id: channel?.id,
    platform_username: channel?.snippet?.title,
    raw_data: channel,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  return NextResponse.redirect(new URL('/connect?success=youtube', process.env.NEXT_PUBLIC_APP_URL))
}
