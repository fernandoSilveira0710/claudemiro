import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VeredictCard } from '@/components/card/veredict-card'
import { ClaudemiroBot } from '@/components/claudemiro-bot'

export default async function PerfilPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')

  const { data: veredits } = await supabase
    .from('veredits')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform, platform_username')
    .eq('user_id', user.id)

  const latestVeredict = veredits?.[0]
  const primary = latestVeredict?.niche_colors?.primary || '#8B5CF6'
  const secondary = latestVeredict?.niche_colors?.secondary || '#EC4899'

  return (
    <div className="min-h-screen bg-[#0D0221] text-white relative overflow-hidden pb-24">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[150px] opacity-20"
          style={{ background: primary }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Meu Perfil
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: `${primary}20`, color: primary }}
            >
              {profile.plan}
            </span>
            <a href={`/u/${profile.username}`} className="text-[#F3E8FF]/40 hover:text-[#F3E8FF] text-xs transition-colors">
              Ver público →
            </a>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Info do usuário */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-black text-white">
            {profile.display_name?.[0] || profile.username?.[0] || '?'}
          </div>
          <h2 className="text-xl font-bold text-white">
            {profile.display_name || profile.username}
          </h2>
          <p className="text-[#F3E8FF]/40 text-sm">@{profile.username}</p>
        </div>

        {/* Último veredito */}
        {latestVeredict && (
          <div className="space-y-4">
            <h3 className="text-[#F3E8FF]/50 text-xs font-medium uppercase tracking-wider text-center">
              Último veredito
            </h3>
            <VeredictCard veredict={latestVeredict} plan={profile.plan} />
            <div className="text-center">
              <a
                href={`/resultado/${latestVeredict.id}`}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
              >
                Ver completo →
              </a>
            </div>
          </div>
        )}

        {/* Redes conectadas */}
        {connections && connections.length > 0 && (
          <div className="max-w-md mx-auto space-y-3">
            <h3 className="text-[#F3E8FF]/50 text-xs font-medium uppercase tracking-wider text-center">
              Redes conectadas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {connections.map(c => (
                <div
                  key={c.platform}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 flex items-center gap-2"
                >
                  <span className="text-lg">
                    {ICONS[c.platform] || '🔗'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium capitalize truncate">{c.platform}</p>
                    {c.platform_username && (
                      <p className="text-[#F3E8FF]/30 text-[10px] truncate">@{c.platform_username}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <a href="/connect" className="text-[#F3E8FF]/25 hover:text-[#F3E8FF]/50 text-xs transition-colors">
                + Gerenciar redes
              </a>
            </div>
          </div>
        )}

        {/* Histórico de vereditos */}
        {veredits && veredits.length > 1 && (
          <div className="max-w-md mx-auto space-y-3">
            <h3 className="text-[#F3E8FF]/50 text-xs font-medium uppercase tracking-wider text-center">
              Histórico ({veredits.length})
            </h3>
            <div className="space-y-2">
              {veredits.slice(1, 6).map(v => (
                <a
                  key={v.id}
                  href={`/resultado/${v.id}`}
                  className="flex items-center gap-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] rounded-xl px-3 py-2.5 transition-colors"
                >
                  <span className="text-lg">
                    {v.frame_type === 'brilhante' ? '⭐' : v.frame_type === 'dourada' ? '🟡' : '🔮'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {v.veredict_badge || 'Veredito'}
                    </p>
                    <p className="text-[#F3E8FF]/30 text-[10px]">
                      {new Date(v.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#F3E8FF]/20">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Sem vereditos */}
        {(!veredits || veredits.length === 0) && (
          <div className="text-center space-y-4 py-12">
            <div className="text-5xl">🔮</div>
            <p className="text-[#F3E8FF]/40 text-sm">Nenhum veredito ainda.</p>
            <a
              href="/chat"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-2xl transition-colors text-sm"
            >
              💬 Fazer meu primeiro veredito
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

const ICONS: Record<string, string> = {
  spotify: '🎵', steam: '🎮', discord: '💬', twitch: '📺',
  youtube: '▶️', instagram: '📷', tiktok: '🎬', x: '🐦',
  github: '💻', reddit: '🤖',
}
