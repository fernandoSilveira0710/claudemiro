import { createServerSupabase } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createServerSupabase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: veredits } = await supabase
    .from('veredits')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(5)

  const latestVeredict = veredits?.[0]

  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform, platform_username, raw_data')
    .eq('user_id', profile.id)

  const connectionMap: Record<string, any> = {}
  connections?.forEach(c => { connectionMap[c.platform] = c })

  // Extrair dados vivos
  const steamGames = connectionMap.steam?.raw_data?.games || []
  const topGame = steamGames.sort((a: any, b: any) => (b.playtime_forever || 0) - (a.playtime_forever || 0))[0]

  const primary = latestVeredict?.niche_colors?.primary || '#8B5CF6'
  const secondary = latestVeredict?.niche_colors?.secondary || '#EC4899'

  return (
    <div
      className="min-h-screen"
      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
    >
      <div className="max-w-2xl mx-auto p-8 text-white">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black">@{profile.username}</h1>
          {latestVeredict?.veredict_badge && (
            <Badge className="mt-2 text-lg bg-white/20 text-white border-white/20 px-4 py-2">
              {latestVeredict.veredict_badge}
            </Badge>
          )}
          <p className="text-white/50 mt-2">{profile.plan === 'PRO' ? '⭐ PRO' : 'Usuário Claudemiro'}</p>
        </div>

        {/* Card */}
        {latestVeredict?.card_image_url && (
          <div className="rounded-2xl overflow-hidden shadow-2xl mb-8">
            <img src={latestVeredict.card_image_url} alt="Card" className="w-full" />
          </div>
        )}

        {/* Tags */}
        {latestVeredict?.tags && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {latestVeredict.tags.map((tag: any, i: number) => (
              <Badge key={i} className="bg-white/10 text-white border-white/20 px-3 py-1">
                {tag.emoji} {tag.name} {tag.percentage}%
              </Badge>
            ))}
          </div>
        )}

        {/* Dados vivos */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {topGame && (
            <DataCard icon="🎮" label="Jogo TOP" value={`${topGame.name} (${Math.round((topGame.playtime_forever || 0) / 60)}h)`} />
          )}
          {connectionMap.spotify && (
            <DataCard icon="🎵" label="Spotify" value={connectionMap.spotify.platform_username} />
          )}
          {connectionMap.steam && (
            <DataCard icon="💻" label="Steam" value={connectionMap.steam.platform_username} />
          )}
        </div>

        {/* Resumo */}
        {latestVeredict?.veredict_text && (
          <div className="bg-white/10 rounded-2xl p-6 mb-8">
            <p className="text-white/90 leading-relaxed">{latestVeredict.veredict_text}</p>
          </div>
        )}

        {/* Politica */}
        {latestVeredict?.political_stance && (
          <div className="bg-white/10 rounded-xl p-4 text-center mb-8">
            <p className="font-bold text-lg">{latestVeredict.political_stance.label}</p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12 pt-8 border-t border-white/10">
          <p className="text-white/70 mb-4">Quer o seu também?</p>
          <a
            href="/"
            className="inline-block bg-white text-gray-900 font-bold px-8 py-4 rounded-2xl text-lg"
          >
            Descobrir meu Claudemiro → a partir de R$3,99
          </a>
        </div>
      </div>
    </div>
  )
}

function DataCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-white/50 text-xs">{label}</p>
      <p className="text-white font-bold text-sm truncate">{value}</p>
    </div>
  )
}
