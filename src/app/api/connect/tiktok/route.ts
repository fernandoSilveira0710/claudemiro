import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const API = 'https://api.scrapecreators.com'
const KEY = process.env.SCRAPECREATORS_API_KEY!

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  const match = url?.match(/tiktok\.com\/@?([^/?]+)/)
  const username = match?.[1]
  if (!username) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  try {
    const [profileRes, videosRes] = await Promise.all([
      fetch(`${API}/v1/tiktok/profile?handle=${username}`, { headers: { 'x-api-key': KEY } }),
      fetch(`${API}/v3/tiktok/profile/videos?handle=${username}&trim=true`, { headers: { 'x-api-key': KEY } }),
    ])

    const profileJson = await profileRes.json()
    if (!profileJson.success || !profileJson.user) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    const p = profileJson.user
    let followers = 0, following = 0

    // Tentar buscar contagens (podem falhar)
    try {
      const fRes = await fetch(`${API}/v1/tiktok/user/followers?handle=${username}&trim=true`, { headers: { 'x-api-key': KEY } })
      const fJson = await fRes.json()
      followers = fJson.totalCount || fJson.total || fJson.count || 0
    } catch {}
    try {
      const fRes = await fetch(`${API}/v1/tiktok/user/following?handle=${username}&trim=true`, { headers: { 'x-api-key': KEY } })
      const fJson = await fRes.json()
      following = fJson.totalCount || fJson.total || fJson.count || 0
    } catch {}

    // Contar vídeos
    const videosJson = await videosRes.json()
    const videoCount = videosJson.aweme_list?.length || 0

    const profileData = {
      name: p.nickname,
      username: p.uniqueId,
      followers,
      following,
      videos: videoCount,
      verified: p.verified || false,
      bio: p.signature || '',
      avatar_url: p.avatarLarger || p.avatarMedium,
    }

    await supabase.from('social_connections').upsert({
      user_id: user.id,
      platform: 'tiktok',
      platform_user_id: p.id,
      platform_username: username,
      raw_data: profileData,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return NextResponse.json({ success: true, ...profileData })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro: ${err.message}` }, { status: 500 })
  }
}
