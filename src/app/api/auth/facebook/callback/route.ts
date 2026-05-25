import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  let debug = ''

  if (error || !code) {
    debug += `Erro: code=${code} error=${error}\n`
    return new Response(`<html><body style="background:#0D0221;color:#F3E8FF;font:16px monospace;padding:40px;white-space:pre-wrap"><h2>❌</h2><pre>${debug}</pre></body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.FACEBOOK_CLIENT_ID!,
      client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`,
    }),
  })

  debug += `Token status: ${tokenRes.status}\n`
  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    debug += `Token error: ${err}\n`
    return new Response(`<html><body style="background:#0D0221;color:#F3E8FF;font:16px monospace;padding:40px;white-space:pre-wrap"><h2>❌ Token</h2><pre>${debug}</pre></body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  const tokens = await tokenRes.json()

  const profileRes = await fetch(
    `https://graph.facebook.com/v18.0/me?fields=id,name,picture.type(large)&access_token=${tokens.access_token}`
  )
  debug += `Profile status: ${profileRes.status}\n`
  if (!profileRes.ok) {
    const err = await profileRes.text()
    debug += `Profile error: ${err}\n`
    return new Response(`<html><body style="background:#0D0221;color:#F3E8FF;font:16px monospace;padding:40px;white-space:pre-wrap"><h2>❌ Profile</h2><pre>${debug}</pre></body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  const profile = await profileRes.json()
  debug += `name: ${profile.name}\n`

  const supabase = await createServerSupabase()
  const { error: upsertError } = await supabase.from('social_connections').upsert({
    user_id: state,
    platform: 'facebook',
    access_token: tokens.access_token,
    platform_user_id: profile.id,
    platform_username: profile.name,
    raw_data: { ...profile, avatar_url: profile.picture?.data?.url },
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  if (upsertError) {
    debug += `Supabase error: ${upsertError.message} (${upsertError.code})\n`
    return new Response(`<html><body style="background:#0D0221;color:#F3E8FF;font:16px monospace;padding:40px;white-space:pre-wrap"><h2>❌ DB</h2><pre>${debug}</pre></body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }

  debug += 'OK\n'
  return new Response(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/connect?success=facebook"></head><body style="background:#0D0221;color:#A855F7;font:16px monospace;padding:40px"><pre>${debug}</pre></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
