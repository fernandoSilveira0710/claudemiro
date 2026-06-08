import { createServerSupabase } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { VeredictCard } from '@/components/card/veredict-card'
import { ShareButtons } from '@/components/share-buttons'
import { ClaudemiroBot } from '@/components/claudemiro-bot'
import { Badge } from '@/components/ui/badge'

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
    .limit(1)
    .maybeSingle()

  const title = v?.veredict_badge ? `${v.veredict_badge} — @${username}` : `@${username} no Claudemiro`
  const description = v?.summary_short || 'O Claudemiro analisou as redes e cravou o veredito. Descubra o seu.'
  const image = v?.card_image_url

  return {
    title,
    description,
    openGraph: {
      title, description, type: 'profile',
      images: image ? [{ url: image, width: 600, height: 900, alt: title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title, description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createServerSupabase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const isPaid = profile.plan === 'FLEX' || profile.plan === 'PRO'

  // Verificar se quem tá vendo é o dono do perfil
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  // Se o dono é FREE e tá logado, redireciona pro /perfil dele
  if (!isPaid && isOwner) {
    redirect('/perfil')
  }

  const { data: veredits } = await supabase
    .from('veredits')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const latestVeredict = veredits?.[0]
  const primary = latestVeredict?.niche_colors?.primary || '#8B5CF6'
  const secondary = latestVeredict?.niche_colors?.secondary || '#EC4899'

  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform, platform_username, raw_data')
    .eq('user_id', profile.id)

  const connectionMap: Record<string, any> = {}
  connections?.forEach(c => { connectionMap[c.platform] = c })

  const steamGames = connectionMap.steam?.raw_data?.games || []
  const topGame = steamGames.sort((a: any, b: any) => (b.playtime_forever || 0) - (a.playtime_forever || 0))[0]

  const profileUrl = `/u/${username}`

  // ══════════ BLOQUEIO TOTAL PRA FREE ══════════
  if (!isPaid) {
    return (
      <div className="min-h-screen bg-[#0D0221] text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 bg-purple-600" />
        </div>

        <div className="relative z-10 max-w-md mx-auto px-4 py-12 text-center space-y-8">
          {/* Ícone */}
          <div className="text-7xl">🔒</div>

          {/* Mensagem */}
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Perfil Bloqueado
            </h1>
            <p className="text-[#F3E8FF]/40 text-sm leading-relaxed">
              <strong className="text-[#F3E8FF]/60">@{username}</strong> ainda
              não liberou o perfil público. O Claudemiro só mostra vereditos
              de usuários com plano <span className="text-purple-400 font-medium">FLEX</span> ou{' '}
              <span className="text-purple-300 font-medium">PRO</span>.
            </p>
          </div>

          {/* Cards de planos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-center space-y-2">
              <p className="text-lg font-black text-purple-400">FLEX</p>
              <p className="text-white font-bold text-xl">R$9,99</p>
              <p className="text-[#F3E8FF]/30 text-[10px]">
                1 veredito + card raro
              </p>
            </div>
            <div className="bg-purple-500/[0.08] border border-purple-500/20 rounded-2xl p-4 text-center space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-purple-500 text-[#0D0221] text-[8px] font-black px-2 py-0.5 rounded-bl-lg">
                POPULAR
              </div>
              <p className="text-lg font-black text-purple-300">PRO</p>
              <p className="text-white font-bold text-xl">R$19,99<span className="text-[#F3E8FF]/30 text-xs font-normal">/mês</span></p>
              <p className="text-[#F3E8FF]/30 text-[10px]">
                Vereditos ilimitados
              </p>
            </div>
          </div>

          {/* CTA principal */}
          <div className="space-y-3">
            <a
              href={`/planos?return=${encodeURIComponent(profileUrl)}`}
              className="block w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(168,85,247,0.3)] text-sm"
            >
              🔓 Liberar meu perfil — a partir de R$3,99
            </a>
            <p className="text-[#F3E8FF]/15 text-[10px]">
              ou{' '}
              <a href="/" className="text-[#F3E8FF]/30 hover:text-[#F3E8FF]/50 underline transition-colors">
                Voltar ao início
              </a>
            </p>
          </div>

          {/* Footer */}
          <p className="text-[#F3E8FF]/10 text-[10px] pt-4">
            #ClaudemiroMeViu · claudemiro.vercel.app
          </p>
        </div>
      </div>
    )
  }

  // ══════════ PAID: Perfil completo ══════════
  return (
    <div className="min-h-screen bg-[#0D0221] text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[150px] opacity-20"
          style={{ background: primary }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[150px] opacity-20"
          style={{ background: secondary }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-[#F3E8FF]/60 hover:text-[#F3E8FF] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-medium">Claudemiro</span>
          </a>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 opacity-60">
              <ClaudemiroBot />
            </div>
          </div>

          <div className="w-[68px]" />
        </div>
      </header>

      {/* Conteúdo */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Header do perfil */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            @{profile.username}
          </h1>
          {latestVeredict?.veredict_badge && (
            <Badge
              className="text-lg px-4 py-1.5 font-bold"
              style={{
                background: `${primary}20`,
                borderColor: `${primary}40`,
                color: primary,
              }}
            >
              {latestVeredict.veredict_badge}
            </Badge>
          )}
        </div>

        {/* Card + conteúdo só se tiver veredito */}
        {latestVeredict ? (
          <>
            <VeredictCard veredict={latestVeredict} plan={profile.plan} />

            {/* Dados vivos */}
            {(topGame || connectionMap.spotify || connectionMap.steam) && (
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {topGame && <DataCard icon="🎮" label="Jogo TOP" value={`${topGame.name} (${Math.round((topGame.playtime_forever || 0) / 60)}h)`} />}
                {connectionMap.spotify && <DataCard icon="🎵" label="Spotify" value={connectionMap.spotify.platform_username} />}
                {connectionMap.steam && <DataCard icon="💻" label="Steam" value={connectionMap.steam.platform_username} />}
              </div>
            )}

            {/* Resumo */}
            {latestVeredict.veredict_text && (
              <div
                className="max-w-md mx-auto rounded-2xl p-5 border"
                style={{ background: `${primary}08`, borderColor: `${primary}15` }}
              >
                <p className="text-[#F3E8FF]/70 text-sm leading-relaxed whitespace-pre-wrap">
                  {latestVeredict.veredict_text}
                </p>
              </div>
            )}

            {/* Tags */}
            {latestVeredict.tags && latestVeredict.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                {latestVeredict.tags.map((tag: any, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border"
                    style={{
                      background: `${primary}10`,
                      borderColor: `${primary}20`,
                      color: '#F3E8FF',
                    }}
                  >
                    {tag.emoji} {tag.name} {tag.percentage}%
                  </span>
                ))}
              </div>
            )}

            {/* Share */}
            <div className="flex justify-center">
              <ShareButtons
                url={profileUrl}
                text={latestVeredict.veredict_badge
                  ? `O Claudemiro classificou @${username} como "${latestVeredict.veredict_badge}" 👀`
                  : `Veja o veredito de @${username} no Claudemiro 👀`}
                cardImageUrl={latestVeredict.card_image_url || latestVeredict.base_image_url}
                username={username}
              />
            </div>
          </>
        ) : (
          /* Sem veredito (PAID mas nunca gerou) */
          <div className="text-center space-y-4 py-12">
            <div className="text-5xl">🔮</div>
            <p className="text-[#F3E8FF]/40 text-sm">
              @{username} ainda não gerou um veredito público.
            </p>
          </div>
        )}

        {/* CTA final */}
        <div className="text-center pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3.5 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(168,85,247,0.3)] text-sm"
          >
            🔮 Quero meu veredito também
          </a>
        </div>

        <p className="text-center text-[#F3E8FF]/15 text-xs pt-8 pb-4">
          #ClaudemiroMeViu · claudemiro.vercel.app
        </p>
      </div>
    </div>
  )
}

function DataCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <p className="text-[#F3E8FF]/40 text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-white font-semibold text-sm truncate mt-0.5">{value}</p>
    </div>
  )
}
