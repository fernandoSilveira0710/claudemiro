import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 })

  // Extrair username da URL
  const match = url.match(/instagram\.com\/([^/?]+)/)
  const username = match?.[1]
  if (!username) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  try {
    // Scraping do perfil público do Instagram
    const res = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!res.ok) {
      // Fallback: tentar outro endpoint
      const fallbackRes = await fetch(`https://www.instagram.com/${username}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      })
      const html = await fallbackRes.text()

      // Extrair dados do JSON embutido
      const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1])
        await supabase.from('social_connections').upsert({
          user_id: user.id,
          platform: 'instagram',
          platform_user_id: username,
          platform_username: username,
          raw_data: { name: data.name, bio: data.description, followers: data.interactionStatistic?.[0]?.userInteractionCount, avatar_url: data.image },
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id,platform' })

        return NextResponse.json({
          success: true,
          username,
          name: data.name,
          bio: data.description,
          avatar_url: data.image,
        })
      }
    } else {
      const data = await res.json()
      const userData = data.graphql?.user || data

      await supabase.from('social_connections').upsert({
        user_id: user.id,
        platform: 'instagram',
        platform_user_id: username,
        platform_username: username,
        raw_data: {
          name: userData.full_name,
          bio: userData.biography,
          followers: userData.edge_followed_by?.count,
          following: userData.edge_follow?.count,
          posts: userData.edge_owner_to_timeline_media?.count,
          avatar_url: userData.profile_pic_url_hd || userData.profile_pic_url,
        },
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform' })

      return NextResponse.json({
        success: true,
        username,
        name: userData.full_name,
        bio: userData.biography,
        followers: userData.edge_followed_by?.count,
        avatar_url: userData.profile_pic_url_hd || userData.profile_pic_url,
      })
    }

    return NextResponse.json({ error: 'Perfil não encontrado ou privado' }, { status: 404 })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro ao buscar: ${err.message}` }, { status: 500 })
  }
}
