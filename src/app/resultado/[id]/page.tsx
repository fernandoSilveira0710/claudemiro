import { createServerSupabase } from '@/lib/supabase/server'
import { VeredictCard } from '@/components/card/veredict-card'
import { ShareButtons } from '@/components/share-buttons'
import { ClaudemiroBot } from '@/components/claudemiro-bot'
import { Badge } from '@/components/ui/badge'

export default async function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()

  // Verificar se usuário tá logado (opcional — tela pública)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: veredict } = await supabase
    .from('veredits')
    .select('*, profiles!inner(username, display_name, plan, avatar_url)')
    .eq('id', id)
    .single()

  if (!veredict) {
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔮</div>
          <h1 className="text-2xl font-black text-white">Veredito não encontrado</h1>
          <p className="text-[#F3E8FF]/50">Esse veredito não existe ou foi removido.</p>
          <a href="/" className="inline-block mt-4 text-purple-400 hover:text-purple-300 font-medium">
            ← Voltar ao início
          </a>
        </div>
      </div>
    )
  }

  const profile = veredict.profiles
  const profileUrl = profile?.username ? `/u/${profile.username}` : null
  const isPaid = profile?.plan === 'FLEX' || profile?.plan === 'PRO'
  const isOwner = user?.id === veredict.user_id

  const primary = veredict.niche_colors?.primary || '#8B5CF6'
  const secondary = veredict.niche_colors?.secondary || '#EC4899'

  // Verificar se é o primeiro veredito do usuário
  let isFirstVeredict = false
  if (isOwner) {
    const { count } = await supabase
      .from('veredits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
    isFirstVeredict = count === 1
  }

  return (
    <div className="min-h-screen bg-[#0D0221] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[150px] opacity-20"
          style={{ background: primary }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20"
          style={{ background: secondary }} />
      </div>

      {/* Matrix particles — sutil */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(168,85,247,0.3) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(236,72,153,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href={isOwner ? '/' : '/'} className="flex items-center gap-2 text-[#F3E8FF]/60 hover:text-[#F3E8FF] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-medium">{isOwner ? 'Início' : 'Claudemiro'}</span>
          </a>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 opacity-60">
              <ClaudemiroBot />
            </div>
            <span className="text-[#F3E8FF]/40 text-xs font-medium uppercase tracking-wider">
              Resultado
            </span>
          </div>

          <div className="w-[68px]" /> {/* spacer pra centralizar */}
        </div>
      </header>

      {/* Conteúdo */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Título */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {isOwner ? 'Seu Veredito' : 'Veredito'}
          </h1>
          {profile?.display_name && (
            <p className="text-[#F3E8FF]/50 text-sm">
              {isOwner ? 'O Claudemiro analisou suas redes e essa foi a conclusão:' : `Análise de @${profile.username}`}
            </p>
          )}
          {isFirstVeredict && (
            <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/20 mt-2">
              🎉 Primeiro veredito!
            </Badge>
          )}
        </div>

        {/* Card */}
        <VeredictCard veredict={veredict} plan={profile?.plan || 'FREE'} />

        {/* Link do perfil */}
        {profileUrl && (
          <div className="w-full max-w-md mx-auto space-y-3">
            {isPaid ? (
              <div className="bg-green-500/[0.06] border border-green-500/15 rounded-2xl p-4 text-center space-y-1">
                <p className="text-green-400 text-sm font-medium flex items-center justify-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Perfil público ativo
                </p>
                <a href={profileUrl} className="text-[#F3E8FF]/50 hover:text-[#F3E8FF] text-xs font-mono transition-colors">
                  claudemiro.vercel.app{profileUrl}
                </a>
              </div>
            ) : (
              <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">🔒</span>
                  <div>
                    <p className="text-amber-400 text-sm font-semibold">Perfil com tarja</p>
                    <p className="text-[#F3E8FF]/40 text-xs mt-0.5">
                      Seu perfil público está oculto no plano FREE.
                    </p>
                  </div>
                </div>
                <a
                  href={`/planos?return=${encodeURIComponent(profileUrl)}`}
                  className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-[#0D0221] font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
                >
                  Liberar perfil — a partir de R$3,99
                </a>
              </div>
            )}
          </div>
        )}

        {/* Share buttons */}
        <div className="flex justify-center">
          <ShareButtons
            url={profileUrl || `/resultado/${id}`}
            text={veredict.veredict_badge
              ? `O Claudemiro me classificou como "${veredict.veredict_badge}" 👀\nDescubra o seu!`
              : 'O Claudemiro me viu! Descubra o seu 👀'}
            cardImageUrl={veredict.card_image_url || veredict.base_image_url}
            username={profile?.username}
          />
        </div>

        {/* CTA inferior */}
        <div className="text-center pt-4 space-y-3">
          {isOwner ? (
            <>
              <a
                href="/chat"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3.5 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(168,85,247,0.3)]"
              >
                💬 Fazer novo veredito
              </a>
              {isFirstVeredict && (
                <p className="text-[#F3E8FF]/30 text-xs">
                  Agora você tem acesso ao seu perfil e configurações!
                </p>
              )}
            </>
          ) : (
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-[#0D0221] font-bold px-8 py-3.5 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
            >
              🔮 Quero meu veredito também
            </a>
          )}
        </div>

        {/* Footer sutil */}
        <p className="text-center text-[#F3E8FF]/15 text-xs pt-8 pb-4">
          #ClaudemiroMeViu · claudemiro.vercel.app
        </p>
      </div>
    </div>
  )
}
