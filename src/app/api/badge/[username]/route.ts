import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const supabase = await createServerSupabase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (!profile) return new Response('Not Found', { status: 404 })

  const { data: veredits } = await supabase
    .from('veredits')
    .select('veredict_badge, niche_colors')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const primary = veredits?.niche_colors?.primary || '#8B5CF6'
  const badge = veredits?.veredict_badge || 'Usuário Claudemiro'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="140" viewBox="0 0 320 140">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primary}"/>
      <stop offset="100%" style="stop-color:${veredits?.niche_colors?.secondary || '#EC4899'}"/>
    </linearGradient>
  </defs>
  <rect width="320" height="140" rx="16" fill="url(#bg)"/>
  <text x="160" y="50" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="14" font-family="sans-serif" font-weight="bold">claudemiro.app/@${username}</text>
  <text x="160" y="95" text-anchor="middle" fill="white" font-size="26" font-family="sans-serif" font-weight="900">${badge}</text>
  <text x="160" y="125" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="10" font-family="sans-serif">#ClaudemiroMeViu</text>
</svg>`

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
