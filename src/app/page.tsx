import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetupUsername } from './setup-username'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.username) return <SetupUsername />

  const { count: vereditsCount } = await supabase
    .from('veredits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: connectionsCount } = await supabase
    .from('social_connections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <main className="min-h-screen bg-[#0D0221] text-white">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-[128px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-600/10 rounded-full blur-[128px]" />
      </div>

      <header className="relative border-b border-white/[0.06] p-4 flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          CLAUDEMIRO
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-purple-500/15 text-purple-300 px-3 py-1 rounded-full font-medium">
            {profile.plan}
          </span>
          <span className="text-[#F3E8FF]/40 text-sm">@{profile.username}</span>
        </div>
      </header>

      <div className="relative max-w-4xl mx-auto p-8">
        <div className="text-center space-y-6 mb-12 pt-8">
          <h2
            className="text-4xl sm:text-5xl font-black text-white"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            E aí, {profile.display_name?.split(' ')[0]} 👋
          </h2>
          <p className="text-[#F3E8FF]/50 max-w-md mx-auto">
            {!vereditsCount
              ? 'Pronto pra descobrir o que suas redes revelam sobre você?'
              : 'Pronto pra mais um veredito? Claudemiro tá te esperando.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <a
              href="/connect"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.10] text-white font-semibold px-6 py-3 rounded-2xl transition-all"
            >
              🔌 {connectionsCount ? `${connectionsCount} redes conectadas` : 'Conectar Redes'}
            </a>
            <a
              href="/chat"
              className="inline-flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-3 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)] transition-all"
            >
              🧿 Falar com Claudemiro
            </a>
          </div>
        </div>

        {/* Recent veredits */}
        {vereditsCount && vereditsCount > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#F3E8FF]/60">Seus vereditos</h3>
            {/* Veredits list coming soon */}
            <p className="text-[#F3E8FF]/30 text-sm">
              {vereditsCount} veredito{vereditsCount > 1 ? 's' : ''} gerado{vereditsCount > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
