import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VeredictCard } from '@/components/card/veredict-card'
import { VeredictDetails } from '@/components/card/veredict-details'
import { ReactionButtons } from '@/components/card/reaction-buttons'
import { GoalsPanel } from '@/components/card/goals-panel'

export default async function PerfilPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/')

  const { data: veredits } = await supabase
    .from('veredits')
    .select('id, veredict_badge, overall, main_trait, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: latestVeredict } = veredits?.length
    ? await supabase.from('veredits').select('*').eq('id', veredits[0].id).single()
    : { data: null }

  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform, platform_username')
    .eq('user_id', user.id)

  const primary = latestVeredict?.niche_colors?.primary || '#8B5CF6'
  const secondary = latestVeredict?.niche_colors?.secondary || '#EC4899'
  const history = (veredits || []).slice(1, 6)

  return (
    <div className="min-h-screen bg-[#0D0221] text-white relative overflow-hidden pb-28">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[150px] opacity-20" style={{ background: primary }} />
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-10" style={{ background: secondary }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Meu Perfil</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${primary}20`, color: primary }}>{profile.plan}</span>
            <a href={`/u/${profile.username}`} className="text-[#F3E8FF]/40 hover:text-[#F3E8FF] text-xs transition-colors">Ver público →</a>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Identidade */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-black text-white shrink-0">
            {profile.display_name?.[0] || profile.username?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{profile.display_name || profile.username}</h2>
            <p className="text-[#F3E8FF]/40 text-sm">@{profile.username}</p>
          </div>
        </div>

        {!latestVeredict ? (
          <div className="text-center space-y-4 py-12">
            <div className="text-5xl">🔮</div>
            <p className="text-[#F3E8FF]/40 text-sm">Nenhum veredito ainda.</p>
            <a href="/chat" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-2xl transition-colors text-sm">
              💬 Fazer meu primeiro veredito
            </a>
          </div>
        ) : (
          /* Layout 2 colunas no desktop */
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-8 items-start">
            {/* COLUNA ESQUERDA: card sticky + reações + download */}
            <div className="lg:sticky lg:top-8 space-y-4 flex flex-col items-center">
              <VeredictCard veredict={latestVeredict} plan={profile.plan} />
              <ReactionButtons
                veredictId={latestVeredict.id}
                initialLikes={latestVeredict.likes_count || 0}
                initialDislikes={latestVeredict.dislikes_count || 0}
              />
            </div>

            {/* COLUNA DIREITA: metas no topo, depois análise/mapa/música/histórico */}
            <div className="space-y-6 min-w-0">
              {/* METAS — destaque no topo */}
              {(latestVeredict.goals?.length || latestVeredict.progression) && (
                <GoalsPanel goals={latestVeredict.goals} progression={latestVeredict.progression} primary={primary} />
              )}

              {/* Análise, mapa, música */}
              <VeredictDetails veredict={latestVeredict} isOwner={true} />

              {/* Histórico */}
              {history.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[#F3E8FF]/30 text-xs font-medium uppercase tracking-wider">Histórico</h3>
                  <div className="space-y-1">
                    {history.map(v => (
                      <a key={v.id} href={`/resultado/${v.id}`}
                        className="flex items-center gap-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] rounded-lg px-3 py-2 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate group-hover:text-purple-300 transition-colors">
                            {v.main_trait || v.veredict_badge || 'Veredito'}
                          </p>
                          <p className="text-[#F3E8FF]/25 text-[10px]">{new Date(v.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        {v.overall && (
                          <span className="text-white font-black text-sm tabular-nums shrink-0"
                            style={{ color: v.overall >= 75 ? '#FCD34D' : v.overall >= 65 ? '#D1D5DB' : '#CD7F32' }}>
                            {v.overall}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Redes conectadas */}
              {connections && connections.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[#F3E8FF]/30 text-xs font-medium uppercase tracking-wider">Redes conectadas</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {connections.map(c => (
                      <div key={c.platform} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 flex items-center gap-2">
                        <span className="text-lg shrink-0">{ICONS[c.platform] || '🔗'}</span>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium capitalize truncate">{c.platform}</p>
                          {c.platform_username && <p className="text-[#F3E8FF]/30 text-[10px] truncate">@{c.platform_username}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <a href="/connect" className="inline-block text-[#F3E8FF]/25 hover:text-[#F3E8FF]/50 text-xs transition-colors">+ Gerenciar redes</a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const ICONS: Record<string, string> = {
  spotify: '🎵', steam: '🎮', discord: '💬', twitch: '📺',
  youtube: '▶️', instagram: '📷', tiktok: '🎬', x: '🐦',
  github: '💻', reddit: '🤖', trakt: '🎬', hardcover: '📚',
}
