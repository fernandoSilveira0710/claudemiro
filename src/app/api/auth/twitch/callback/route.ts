import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  let debug = ''

  if (error || !code) {
    debug += `Erro inicial: code=${code} error=${error}\n`
    return new Response(`<html><body style="background:#0D0221;color:#F3E8FF;font:16px monospace;padding:40px;white-space:pre-wrap"><h2>❌ Erro</h2><pre>${debug}</pre></body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  debug += `code: OK\n`

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

  debug += `Token status: ${tokenRes.status}\n`

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    debug += `Token error: ${err}\n`
    return new Response(`<html><body style="background:#0D0221;color:#F3E8FF;font:16px monospace;padding:40px;white-space:pre-wrap"><h2>❌ Token</h2><pre>${debug}</pre></body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  const tokens = await tokenRes.json()
  debug += `access_token: ${tokens.access_token ? 'SIM' : 'NÃO'}\n`

  const profileRes = await fetch('https://api.twitch.tv/helix/users', {
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Client-Id': process.env.TWITCH_CLIENT_ID! },
  })

  debug += `Profile status: ${profileRes.status}\n`

  if (!profileRes.ok) {
    const err = await profileRes.text()
    debug += `Profile error: ${err}\n`
    return new Response(`<html><body style="background:#0D0221;color:#F3E8FF;font:16px monospace;padding:40px;white-space:pre-wrap"><h2>❌ Profile</h2><pre>${debug}</pre></body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  const profileData = await profileRes.json()
  const profile = profileData.data?.[0]
  debug += `username: ${profile?.display_name || 'NULO'}\nid: ${profile?.id || 'NULO'}\n`

  let follows: any[] = []
  try {
    const followsRes = await fetch(
      `https://api.twitch.tv/helix/channels/followed?user_id=${profile?.id}`,
      { headers: { Authorization: `Bearer ${tokens.access_token}`, 'Client-Id': process.env.TWITCH_CLIENT_ID! } }
    )
    const followsData = await followsRes.json()
    follows = followsData.data || []
    debug += `follows: ${follows.length}\n`
  } catch (e: any) {
    debug += `follows error: ${e.message}\n`
  }

  const supabase = await createServerSupabase()
  debug += `user_id (state): ${state}\n`

  const { error: upsertError } = await supabase.from('social_connections').upsert({
    user_id: state,
    platform: 'twitch',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    platform_user_id: profile?.id,
    platform_username: profile?.display_name,
    raw_data: { ...profile, follows, avatar_url: profile?.profile_image_url },
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  if (upsertError) {
    debug += `Supabase error: ${upsertError.message} (${upsertError.code})\n`
    return new Response(`<html><body style="background:#0D0221;color:#F3E8FF;font:16px monospace;padding:40px;white-space:pre-wrap"><h2>❌ Supabase</h2><pre>${debug}</pre></body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  debug += 'Supabase: OK\n'

  return new Response(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="1;url=/connect?success=twitch"></head><body style="background:#0D0221;color:#A855F7;font:16px monospace;padding:40px"><h2>✅ SUCESSO</h2><pre>${debug}</pre></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
