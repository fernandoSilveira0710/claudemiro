import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  const match = url?.match(/linkedin\.com\/in\/([^/?\s]+)/)
  const username = match?.[1]
  if (!username) return NextResponse.json({ error: 'URL inválida. Use linkedin.com/in/fulano' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.scrapecreators.com/v1/linkedin/profile?url=${encodeURIComponent(`https://linkedin.com/in/${username}`)}`,
      { headers: { 'x-api-key': process.env.SCRAPECREATORS_API_KEY! } }
    )

    const json = await res.json()
    if (!json.success) {
      if (json.message?.includes('private')) {
        return NextResponse.json({ error: 'Perfil privado ou não disponível publicamente', needsManual: true }, { status: 422 })
      }
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    const d = json.data
    const profileData = {
      name: d.full_name || d.name || username,
      username,
      followers: d.followers_count || d.connections_count || 0,
      following: 0,
      bio: d.headline || d.summary || '',
      company: d.current_company?.name || '',
      avatar_url: d.profile_picture || d.profile_pic_url || '',
    }

    await supabase.from('social_connections').upsert({
      user_id: user.id,
      platform: 'linkedin',
      platform_user_id: username,
      platform_username: username,
      raw_data: profileData,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' })

    return NextResponse.json({ success: true, ...profileData })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro: ${err.message}` }, { status: 500 })
  }
}
