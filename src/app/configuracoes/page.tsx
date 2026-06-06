import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClaudemiroBot } from '@/components/claudemiro-bot'

export default async function ConfiguracoesPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')

  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform')
    .eq('user_id', user.id)

  const connectionsCount = connections?.length || 0

  return (
    <div className="min-h-screen bg-[#0D0221] text-white relative overflow-hidden pb-24">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[150px] opacity-15 bg-purple-600" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Configurações
          </h1>
          <div className="w-8 h-8 opacity-40">
            <ClaudemiroBot />
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* ─── Conta ─── */}
        <Section title="Conta">
          <ConfigRow label="Email" value={user.email || '—'} />
          <ConfigRow label="Username" value={`@${profile.username || 'não definido'}`} />
          <ConfigRow label="Nome" value={profile.display_name || '—'} />
          <ConfigRow label="Plano" value={profile.plan || 'FREE'} highlight />
          <ConfigRow label="Membro desde" value={new Date(profile.created_at).toLocaleDateString('pt-BR')} />
        </Section>

        {/* ─── Plano ─── */}
        <Section title="Plano">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#F3E8FF]/60 text-sm">Plano atual</span>
              <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                profile.plan === 'PRO' ? 'bg-purple-500/15 text-purple-300' :
                profile.plan === 'FLEX' ? 'bg-blue-500/15 text-blue-300' :
                'bg-white/5 text-[#F3E8FF]/50'
              }`}>
                {profile.plan}
              </span>
            </div>

            {profile.plan === 'FREE' && (
              <div className="space-y-2">
                <p className="text-[#F3E8FF]/30 text-xs">
                  Upgrade para desbloquear: perfil público, card raro, veredito ilimitado.
                </p>
                <a
                  href="/planos"
                  className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-sm transition-colors"
                >
                  Ver planos
                </a>
              </div>
            )}

            {profile.plan === 'FLEX' && (
              <div className="space-y-2">
                <p className="text-[#F3E8FF]/30 text-xs">
                  Você tem card raro e perfil público. O PRO libera geração ilimitada.
                </p>
                <a
                  href="/planos"
                  className="block w-full text-center bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-300 font-bold py-2 rounded-xl text-sm transition-colors"
                >
                  Fazer upgrade → PRO
                </a>
              </div>
            )}

            {profile.plan === 'PRO' && (
              <p className="text-green-400/70 text-xs flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Tudo liberado — sem limites.
              </p>
            )}
          </div>
        </Section>

        {/* ─── Redes ─── */}
        <Section title="Redes sociais">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#F3E8FF]/60 text-sm">
                {connectionsCount} rede{connectionsCount !== 1 ? 's' : ''} conectada{connectionsCount !== 1 ? 's' : ''}
              </span>
            </div>
            <a
              href="/connect"
              className="inline-flex items-center gap-1.5 text-[#F3E8FF]/40 hover:text-[#F3E8FF]/70 text-xs transition-colors"
            >
              + Gerenciar conexões
            </a>
          </div>
        </Section>

        {/* ─── Perigo ─── */}
        <Section title="Zona de perigo" danger>
          <div className="p-3 space-y-2">
            <LogoutButton />
            <p className="text-[#F3E8FF]/15 text-[10px]">
              Ao sair, você precisará fazer login novamente. Seus dados continuam salvos.
            </p>
          </div>
        </Section>

        <p className="text-center text-[#F3E8FF]/10 text-[10px] pt-4 pb-2">
          Claudemiro v1.8 · #ClaudemiroMeViu
        </p>
      </div>
    </div>
  )
}

// ─── Sub-componentes ───

function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border ${danger ? 'border-red-500/10' : 'border-white/[0.06]'} bg-white/[0.02] overflow-hidden`}>
      <div className={`px-4 py-2.5 border-b ${danger ? 'border-red-500/10' : 'border-white/[0.04]'}`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${danger ? 'text-red-400/60' : 'text-[#F3E8FF]/30'}`}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

function ConfigRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.03] last:border-b-0">
      <span className="text-[#F3E8FF]/40 text-xs">{label}</span>
      <span className={`text-sm ${highlight ? 'font-bold text-purple-300' : 'text-[#F3E8FF]/70'}`}>
        {value}
      </span>
    </div>
  )
}

function LogoutButton() {
  return (
    <form action="/auth/logout" method="POST">
      <button
        type="submit"
        className="w-full text-left text-red-400/70 hover:text-red-400 text-sm font-medium transition-colors py-1"
      >
        Sair da conta
      </button>
    </form>
  )
}
