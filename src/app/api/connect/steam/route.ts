import { createServerSupabase } from '@/lib/supabase/server'
import { getSteamProfile, getSteamGames, resolveVanityUrl } from '@/lib/steam'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { steamId } = await request.json()

  // Pode ser Steam ID64 ou vanity URL
  let resolvedId = steamId
  if (!/^\d{17}$/.test(steamId)) {
    const vanity = await resolveVanityUrl(steamId)
    if (!vanity) return NextResponse.json({ error: 'Perfil Steam não encontrado' }, { status: 400 })
    resolvedId = vanity
  }

  const profile = await getSteamProfile(resolvedId)
  if (!profile) return NextResponse.json({ error: 'Steam ID inválido' }, { status: 400 })

  const games = await getSteamGames(resolvedId)
  const sortedGames = games
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, 20)

  await supabase.from('social_connections').upsert({
    user_id: user.id,
    platform: 'steam',
    platform_user_id: resolvedId,
    platform_username: profile.personaname,
    raw_data: { profile, games: sortedGames },
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  return NextResponse.json({
    success: true,
    username: profile.personaname,
    avatar: profile.avatarfull,
    gameCount: games.length,
    totalHours: games.reduce((sum, g) => sum + (g.playtime_forever || 0), 0) / 60,
  })
}
