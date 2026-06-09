import { createServerSupabase } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { VeredictCard } from '@/components/card/veredict-card'
import { VeredictDetails } from '@/components/card/veredict-details'
import { ReactionButtons } from '@/components/card/reaction-buttons'
import { GoalsPanel } from '@/components/card/goals-panel'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const supabase = await createServerSupabase()
  const { data: profile } = await supabase.from('profiles').select('id, username, display_name').eq('username', username).single()
  if (!profile) return { title: 'Claudemiro' }

  const { data: v } = await supabase
    .from('veredits')
    .select('veredict_badge, card_image_url, summary_short')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()

  const title = v?.veredict_badge ? `${v.veredict_badge} — @${username}` : `@${username} no Claudemiro`
  const description = v?.summary_short || 'O Claudemiro analisou as redes e cravou o veredito. Descubra o seu.'
  const image = v?.card_image_url
  return {
    title, description,
    openGraph: { title, description, type: 'profile', images: image ? [{ url: image, width: 600, height: 900, alt: title }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createServerSupabase()

  const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single()
  if (!profile) notFound()

  const isPaid = profile.plan === 'FLEX' || profile.plan === 'PRO'
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  if (!isPaid && isOwner) redirect('/perfil')

  const { data: veredits } = await supabase
    .from('veredits')
    .select('id, veredict_badge, overall, main_trait, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const { data: latestVeredict } = veredits?.length
    ? await supabase.from('veredits').select('*').eq('id', veredits[0].id).single()
    : { data: null }

  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform, platform_username')
    .eq('user_id', profile.id)

  const primary = latestVeredict?.niche_colors?.primary || '#8B5CF6'
  const secondary = latestVeredict?.niche_colors?.secondary || '#EC4899'
  const history = (veredits || []).slice(1, 6)

  if (!isPaid) {
    return (
      <div className="min-h-screen bg-[#0D0221] text-white flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 bg-purple-600" />
        </div>
        <div className="relative z-10 max-w-md mx-auto px-4 py-12 text-center space-y-8">
          <div className="text-7xl">🔒</div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Perfil Bloqueado</h1>
            <p className="text-[#F3E8FF]/40 text-sm leading-relaxed">
              <strong className="text-[#F3E8FF]/60">@{username}</strong> ainda não liberou o perfil público.
              O Claudemiro só mostra vereditos de usuários com plano <span className="text-purple-400 font-medium">FLEX</span> ou <span className="text-purple-300 font-medium">PRO</span>.
            </p>
          </div>
          <a href={`/planos?return=/u/${username}`} className="block w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-2xl transition-all text-sm">
            🔓 Liberar meu perfil — a partir de R$3,99
          </a>
          <p className="text-[#F3E8FF]/10 text-[10px] pt-4">#ClaudemiroMeViu · claudemiro.vercel.app</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0221] text-white relative overflow-hidden pb-28">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[150px] opacity-20" style={{ background: primary }} />
        <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-10" style={{ background: secondary }} />
      </div>

      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-[#F3E8FF]/60 hover:text-[#F3E8FF] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="text-sm font-medium">Claudemiro</span>
          </a>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${primary}20`, color: primary }}>{profile.plan}</span>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-black text-white shrink-0">
            {profile.display_name?.[0] || profile.username?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white truncate">@{profile.username}</h2>
            {profile.display_name && <p className="text-[#F3E8FF]/40 text-sm">{profile.display_name}</p>}
          </div>
        </div>

        {!latestVeredict ? (
          <div className="text-center space-y-4 py-12">
            <div className="text-5xl">🔮</div>
            <p className="text-[#F3E8FF]/40 text-sm">@{username} ainda não gerou um veredito.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-8 items-start">
            <div className="lg:sticky lg:top-8 space-y-4 flex flex-col items-center">
              <VeredictCard veredict={latestVeredict} plan={profile.plan} />
              <ReactionButtons veredictId={latestVeredict.id} initialLikes={latestVeredict.likes_count || 0} initialDislikes={latestVeredict.dislikes_count || 0} />
            </div>
            <div className="space-y-6 min-w-0">
              {(latestVeredict.goals?.length || latestVeredict.progression) && (
                <GoalsPanel goals={latestVeredict.goals} progression={latestVeredict.progression} primary={primary} />
              )}
              <VeredictDetails veredict={latestVeredict} isOwner={isOwner} />
              {history.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[#F3E8FF]/30 text-xs font-medium uppercase tracking-wider">Histórico</h3>
                  <div className="space-y-1">
                    {history.map(v => (
                      <a key={v.id} href={`/resultado/${v.id}`} className="flex items-center gap-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] rounded-lg px-3 py-2 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate group-hover:text-purple-300">{v.main_trait || v.veredict_badge || 'Veredito'}</p>
                          <p className="text-[#F3E8FF]/25 text-[10px]">{new Date(v.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        {v.overall && <span className="text-white font-black text-sm tabular-nums shrink-0" style={{ color: v.overall >= 75 ? '#FCD34D' : v.overall >= 65 ? '#D1D5DB' : '#CD7F32' }}>{v.overall}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}
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
