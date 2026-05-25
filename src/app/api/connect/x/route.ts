import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 })

  const match = url.match(/(?:twitter\.com|x\.com)\/([^/?]+)/)
  const username = match?.[1]
  if (!username) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.scrapecreators.com/v1/twitter/profile?handle=${username}`,
      { headers: { 'x-api-key': process.env.SCRAPECREATORS_API_KEY! } }
    )

    const json = await res.json()
    if (!json.success) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    const legacy = json.legacy || {}
    const profileData = {
      name: legacy.name || json.name,
      username: legacy.screen_name || username,
      followers: legacy.followers_count || 0,
      following: legacy.friends_count || 0,
      tweets: legacy.statuses_count || 0,
      verified: legacy.verified || false,
      bio: legacy.description || '',
      avatar_url: json.profile_image_url_https || legacy.profile_image_url_https,
    }

    await supabase.from('social_connections').upsert({
      user_id: user.id,
      platform: 'x',
      platform_user_id: json.rest_id || legacy.id_str,
      platform_username: username,
      raw_data: profileData,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return NextResponse.json({ success: true, ...profileData, credits: json.credits_remaining })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro: ${err.message}` }, { status: 500 })
  }
}
