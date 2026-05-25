import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 })

  const match = url.match(/tiktok\.com\/@?([^/?]+)/)
  const username = match?.[1]
  if (!username) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.scrapecreators.com/v1/tiktok/profile?handle=${username}`,
      { headers: { 'x-api-key': process.env.SCRAPECREATORS_API_KEY! } }
    )

    const json = await res.json()
    if (!json.success || !json.user) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    const d = json.user
    const profileData = {
      name: d.nickname,
      username: d.uniqueId,
      followers: d.followerCount || 0,
      following: d.followingCount || 0,
      likes: d.heartCount || 0,
      videos: d.videoCount || 0,
      verified: d.verified || false,
      bio: d.signature || '',
      avatar_url: d.avatarLarger || d.avatarMedium || d.avatarThumb,
    }

    await supabase.from('social_connections').upsert({
      user_id: user.id,
      platform: 'tiktok',
      platform_user_id: d.id,
      platform_username: username,
      raw_data: profileData,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return NextResponse.json({ success: true, ...profileData, credits: json.credits_remaining })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro: ${err.message}` }, { status: 500 })
  }
}
