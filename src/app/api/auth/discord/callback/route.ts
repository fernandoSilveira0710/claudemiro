import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/connect?error=discord', process.env.NEXT_PUBLIC_APP_URL))
  }

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/discord/callback`,
    }),
  })

  if (!tokenRes.ok) return NextResponse.redirect(new URL('/connect?error=discord_token', process.env.NEXT_PUBLIC_APP_URL))

  const tokens = await tokenRes.json()

  const profileRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!profileRes.ok) return NextResponse.redirect(new URL('/connect?error=discord_profile', process.env.NEXT_PUBLIC_APP_URL))

  const profile = await profileRes.json()

  // Montar URL do avatar
  const avatarUrl = profile.avatar
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
    : null

  let guilds = []
  try {
    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    guilds = await guildsRes.json()
  } catch {}

  const supabase = await createServerSupabase()
  const { error: upsertError } = await supabase.from('social_connections').upsert({
    user_id: state,
    platform: 'discord',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    platform_user_id: profile.id,
    platform_username: profile.username,
    raw_data: { ...profile, guilds, avatar_url: avatarUrl },
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  if (upsertError) return NextResponse.redirect(new URL('/connect?error=discord_db', process.env.NEXT_PUBLIC_APP_URL))

  return new Response(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/connect?success=discord"></head><body></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
