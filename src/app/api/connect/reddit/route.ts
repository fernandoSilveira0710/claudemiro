import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  const match = url?.match(/reddit\.com\/u(?:ser)?\/([^/?]+)/)
  const username = match?.[1]
  if (!username) return NextResponse.json({ error: 'URL inválida. Use reddit.com/u/fulano' }, { status: 400 })

  try {
    const res = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
      headers: { 'User-Agent': 'Claudemiro/1.0' },
    })

    if (!res.ok) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const json = await res.json()
    const d = json.data

    const profileData = {
      name: d.name || d.subreddit?.title || username,
      username,
      followers: d.total_karma || 0,
      following: 0,
      bio: d.subreddit?.public_description || '',
      avatar_url: d.icon_img || d.snoovatar_img || '',
      link_karma: d.link_karma || 0,
      comment_karma: d.comment_karma || 0,
      created_utc: d.created_utc,
    }

    await supabase.from('social_connections').upsert({
      user_id: user.id,
      platform: 'reddit',
      platform_user_id: d.id,
      platform_username: username,
      raw_data: profileData,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return NextResponse.json({ success: true, ...profileData })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro: ${err.message}` }, { status: 500 })
  }
}
