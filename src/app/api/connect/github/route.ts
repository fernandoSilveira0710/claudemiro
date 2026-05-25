import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  const match = url?.match(/github\.com\/([^/?]+)/)
  const username = match?.[1]
  if (!username) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: { 'User-Agent': 'Claudemiro/1.0' },
    })

    if (!res.ok) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const d = await res.json()

    const profileData = {
      name: d.name || d.login,
      username: d.login,
      followers: d.followers || 0,
      following: d.following || 0,
      repos: d.public_repos || 0,
      bio: d.bio || '',
      company: d.company || '',
      blog: d.blog || '',
      avatar_url: d.avatar_url,
      updated_at: d.updated_at,
    }

    await supabase.from('social_connections').upsert({
      user_id: user.id,
      platform: 'github',
      platform_user_id: String(d.id),
      platform_username: username,
      raw_data: profileData,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return NextResponse.json({ success: true, ...profileData })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro: ${err.message}` }, { status: 500 })
  }
}
