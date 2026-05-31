import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform, platform_username, raw_data')
    .eq('user_id', user.id)

  if (!connections) return NextResponse.json({ images: [] })

  const images: { platform: string; label: string; url: string }[] = []

  for (const conn of connections) {
    let url: string | null = null
    const rd = conn.raw_data || {}

    switch (conn.platform) {
      case 'instagram':
        url = rd?.profile_pic_url_hd || rd?.avatar_url
        break
      case 'steam':
        url = rd?.avatarfull || rd?.avatar_url
        break
      case 'youtube':
        url = rd?.avatar_url || rd?.channel?.snippet?.thumbnails?.default?.url
        break
      case 'spotify':
        url = rd?.images?.[0]?.url || rd?.avatar_url
        break
      case 'tiktok':
        url = rd?.avatarLarger || rd?.avatar_url
        break
      case 'x':
      case 'twitter':
        url = rd?.profile_image_url_https || rd?.avatar_url
        break
      case 'github':
        url = rd?.avatar_url
        break
      case 'discord':
        url = rd?.avatar_url || (rd?.avatar ? `https://cdn.discordapp.com/avatars/${rd.id}/${rd.avatar}.png` : null)
        break
    }

    if (url) {
      // Proxy Instagram images
      const finalUrl = conn.platform === 'instagram'
        ? `/api/proxy?url=${encodeURIComponent(url)}`
        : url

      images.push({
        platform: conn.platform,
        label: conn.platform.charAt(0).toUpperCase() + conn.platform.slice(1),
        url: finalUrl,
      })
    }
  }

  return NextResponse.json({ images })
}
