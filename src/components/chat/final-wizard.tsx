'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClaudemiroBot } from '@/components/claudemiro-bot'
import { VeredictCard } from '@/components/card/veredict-card'
import { HoloShowcase } from '@/components/chat/holo-showcase'

type Plan = 'PRO' | 'FLEX' | 'FREE'
type FrameType = 'brilhante' | 'dourada' | 'cinza'
type Step = 1 | 2 | 3 | 4

interface SocialImage { platform: string; label: string; url: string }
interface TrackInfo { name: string; artist: string; spotifyUrl?: string }
interface WizardProps {
  sessionId: string
  plan: Plan
  socialImages: SocialImage[]
  aiTrack: TrackInfo | null
  onClose: () => void
  onUpgrade: () => void
}

export function FinalWizard({ sessionId, plan, socialImages, aiTrack, onClose, onUpgrade }: WizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [selectedFrame, setSelectedFrame] = useState<FrameType>('cinza')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<TrackInfo | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [thoughts, setThoughts] = useState<string[]>([])
  const [veredict, setVeredict] = useState<any>(null)
  const [showCard, setShowCard] = useState(false)
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null)
  const [resolvedTrack, setResolvedTrack] = useState<TrackInfo | null>(aiTrack)
  const [loadingTrack, setLoadingTrack] = useState(false)

  const connectSpotifyAndPick = async () => {
    setLoadingTrack(true)
    try {
      const res = await fetch('/api/user/spotify-top')
      const data = await res.json()
      if (data.connected === false && data.authUrl) {
        window.location.href = data.authUrl
        return
      }
      const tracks: TrackInfo[] = data.tracks || []
      if (tracks.length) {
        const pick = tracks[Math.floor(Math.random() * tracks.length)]
        setResolvedTrack(pick)
      }
    } catch { /* segue sem música */ }
    setLoadingTrack(false)
  }

  useEffect(() => {
    const f: FrameType = plan === 'PRO' ? 'brilhante' : plan === 'FLEX' ? 'dourada' : 'cinza'
    setSelectedFrame(f)
  }, [plan])

  useEffect(() => {
    if (plan === 'FREE') {
      fetch('/api/user/can-generate').then(r => r.json()).then(d => {
        if (!d.allowed && d.reason === 'free_cooldown') {
          setCooldownMessage(`Você já gerou um veredito grátis. Próximo em ${new Date(d.nextAt).toLocaleDateString('pt-BR')}.`)
        }
      }).catch(() => {})
    }
  }, [plan])

  const frames: { type: FrameType; plan: Plan; icon: string; label: string; desc: string; price: string; paid: boolean }[] = [
    { type: 'brilhante', plan: 'PRO', icon: '✨', label: 'BRILHANTE', desc: 'Shimmer animado', price: 'R$ 19,99/mês', paid: true },
    { type: 'dourada', plan: 'FLEX', icon: '👑', label: 'DOURADA', desc: 'Dourado sólido', price: 'R$ 9,99', paid: true },
    { type: 'cinza', plan: 'FREE', icon: '⬜', label: 'CINZA', desc: 'Fosco', price: 'FREE', paid: false },
  ]

  const canUseFrame = (f: typeof frames[number]) => f.plan === 'FREE' || plan === f.plan || plan === 'PRO'
  const handleFrameClick = (f: typeof frames[number]) => { if (canUseFrame(f)) setSelectedFrame(f.type); else onUpgrade() }

  const generateVeredict = async () => {
    setIsGenerating(true); setStep(4); setThoughts([])
    try {
      const res = await fetch('/api/chat/thoughts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) })
      if (res.ok && res.body) {
        const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
        while (true) {
          const { done, value } = await reader.read(); if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n'); buffer = lines.pop() || ''
          for (const line of lines) { const t = line.trim(); if (t) setThoughts(prev => [...prev, t]) }
        }
        if (buffer.trim()) setThoughts(prev => [...prev, buffer.trim()])
      } else throw new Error('no stream')
    } catch {
      for (const t of ['Vasculhando os dados das redes...', 'Cruzando tudo...', 'Montando o veredito...']) {
        await new Promise(r => setTimeout(r, 700)); setThoughts(prev => [...prev, t])
      }
    }
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestVeredict: true, sessionId, frameType: selectedFrame, baseImageUrl: selectedImage, track: selectedTrack }) })
      const data = await res.json(); const v = data.veredict || data
      setVeredict({ ...v, frame_type: selectedFrame, card_image_url: v?.card_image_url || null, base_image_url: selectedImage, music_track: selectedTrack || v?.music_track })
      await new Promise(r => setTimeout(r, 400)); setShowCard(true)
    } catch (err) { console.error(err); setThoughts(prev => [...prev, '⚠️ Algo deu errado. Tenta de novo.']) }
    setIsGenerating(false)
  }

  const handleShare = async () => {
    if (!veredict) return
    const trackLine = veredict.music_track ? `\n🎵 ${veredict.music_track.name} — ${veredict.music_track.artist}` : ''
    const text = `${veredict.veredict_badge}${trackLine}\n\nDescobre o teu: claudemiro.app`
    try {
      if (navigator.share && veredict.card_image_url) {
        const blob = await (await fetch(veredict.card_image_url)).blob()
        const file = new File([blob], 'claudemiro.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) { await navigator.share({ text, title: 'Meu Claudemiro', files: [file] }); return }
      }
      if (navigator.share) { await navigator.share({ text, title: 'Meu Claudemiro' }); return }
      await navigator.clipboard.writeText(text); alert('Link copiado!')
    } catch {}
  }

  const handleDownload = () => {
    if (!veredict?.card_image_url) return
    const a = document.createElement('a'); a.href = veredict.card_image_url
    a.download = `claudemiro-${(veredict.veredict_badge || 'card').replace(/\s/g, '-')}.png`; a.click()
  }

  const Bot = ({ size, pulsing }: { size: number; pulsing?: boolean }) => (
    <div className="flex justify-center w-full">
      <motion.div animate={pulsing ? { scale: [1, 1.06, 1] } : {}} transition={{ repeat: Infinity, duration: 1.4 }}
        className="claude-bot-glow" style={{ width: size, height: size }}>
        <ClaudemiroBot />
      </motion.div>
    </div>
  )

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D0221]/95 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
          className="w-full max-w-2xl max-h-[92vh] overflow-y-auto glass-card border border-purple-500/20 shadow-[0_0_60px_rgba(168,85,247,0.15)] rounded-3xl p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-[#F3E8FF]/40 hover:text-white z-10 text-sm">✕</button>

          {step === 1 && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Bot size={64} />
              <h2 className="text-xl font-black text-white text-center mt-3 mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {plan === 'FREE' ? 'O que pode sair pra você' : 'Suas cartas premium'}
              </h2>
              <p className="text-[#F3E8FF]/40 text-sm text-center mb-5">
                {plan === 'FREE' ? 'Cada geração é uma carta sorteada' : 'No seu plano, só vêm as raras ✨'}
              </p>

              {/* Showcase holográfico do plano atual */}
              <HoloShowcase plan={plan} />

              {/* Upsell pro FREE */}
              {plan === 'FREE' && (
                <button onClick={onUpgrade}
                  className="w-full mt-5 p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-purple-500/10 hover:from-amber-500/20 hover:to-purple-500/20 transition-all text-center group">
                  <p className="text-sm font-black text-white">Quer as cartas <span className="text-amber-400">premium</span>? 👑</p>
                  <p className="text-[11px] text-[#F3E8FF]/50 mt-0.5">Galáxia, Arco-Íris, Ouro Secreto e Radiante — desbloqueie no FLEX</p>
                  <span className="inline-block mt-2 text-[11px] font-bold text-amber-400 group-hover:underline">Ver planos →</span>
                </button>
              )}

              <div className="flex justify-center mt-6">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setStep(2)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-12 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm">Avançar →</motion.button>
              </div>
            </motion.div>
          )}

          {step === 2 && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Bot size={80} />
              <h2 className="text-xl font-black text-white text-center mt-4 mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Escolhe a imagem base</h2>
              <p className="text-[#F3E8FF]/40 text-sm text-center mb-6">Pro teu cartoon</p>
              <div className="grid grid-cols-3 gap-3">
                {socialImages.filter(img => img.url).map((img, i) => (
                  <motion.button key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedImage(img.url)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === img.url ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'border-white/[0.08] hover:border-purple-500/30'}`}>
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">{img.label}</span>
                  </motion.button>
                ))}
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { if (plan !== 'PRO') onUpgrade() }}
                  className="relative aspect-square rounded-2xl border-2 border-white/[0.08] flex flex-col items-center justify-center bg-white/[0.01] hover:border-purple-500/30 overflow-hidden">
                  <span className="text-2xl mb-1">📤</span>
                  <span className="text-[10px] text-[#F3E8FF]/40 text-center px-1">Upload</span>
                  {plan !== 'PRO' && (<div className="absolute top-3 -right-7 rotate-45 bg-gradient-to-r from-purple-400 to-pink-500 text-white text-[9px] font-black py-0.5 px-7 shadow-md pointer-events-none">$ PRO</div>)}
                </motion.button>
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <button onClick={() => setStep(1)} className="bg-white/[0.03] hover:bg-white/[0.06] text-[#F3E8FF]/40 py-3 px-6 rounded-2xl border border-white/[0.04] text-sm">← Voltar</button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setStep(3)} disabled={!selectedImage}
                  className={`font-bold py-3 px-10 rounded-2xl text-sm ${selectedImage ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-white/[0.03] text-[#F3E8FF]/20 cursor-not-allowed'}`}>Avançar</motion.button>
              </div>
            </motion.div>
          )}

          {step === 3 && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Bot size={80} />
              <h2 className="text-xl font-black text-white text-center mt-4 mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Música do card</h2>
              <p className="text-[#F3E8FF]/40 text-sm text-center mb-6">Trilha sonora do teu veredito</p>
              {cooldownMessage ? (
                <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
                  <p className="text-red-400 font-bold text-sm mb-1">⏳ Cooldown</p>
                  <p className="text-[#F3E8FF]/40 text-xs">{cooldownMessage}</p>
                  <button onClick={onUpgrade} className="mt-3 text-amber-400 hover:text-amber-300 text-xs underline">Ver planos pra gerar agora</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Sem música resolvida ainda → conectar Spotify */}
                  {!resolvedTrack && (
                    <button
                      onClick={connectSpotifyAndPick}
                      disabled={loadingTrack}
                      className="w-full p-4 rounded-2xl border border-green-500/30 bg-green-500/10 text-center hover:bg-green-500/20 transition-colors disabled:opacity-60"
                    >
                      {loadingTrack ? (
                        <p className="text-white font-bold text-sm">Processando suas músicas...</p>
                      ) : (
                        <>
                          <p className="text-white font-bold text-sm">🎧 Conectar Spotify</p>
                          <p className="text-[10px] text-[#F3E8FF]/40 mt-0.5">Pego suas 10 mais ouvidas e escolho uma</p>
                        </>
                      )}
                    </button>
                  )}

                  {/* Música resolvida → comportamento por plano */}
                  {resolvedTrack && plan === 'PRO' && (
                    <>
                      <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
                        <div className="flex items-center gap-3"><span className="text-2xl">🎵</span><div><p className="text-white font-bold text-sm">{resolvedTrack.name}</p><p className="text-[#F3E8FF]/40 text-xs">{resolvedTrack.artist}</p></div><span className="ml-auto text-[10px] text-purple-400">sugestão</span></div>
                      </div>
                      <button onClick={() => { setSelectedTrack(resolvedTrack); generateVeredict() }} className="w-full p-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors">Usar essa música</button>
                      <button onClick={connectSpotifyAndPick} disabled={loadingTrack} className="w-full p-3 rounded-2xl border border-green-500/20 bg-green-500/5 text-center hover:bg-green-500/10 text-sm text-white/80">🔀 Sortear outra</button>
                    </>
                  )}

                  {resolvedTrack && plan === 'FLEX' && (
                    <div className="relative p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                      <div className="flex items-center gap-3"><span className="text-2xl">🎵</span><div><p className="text-white font-bold text-sm">{resolvedTrack.name}</p><p className="text-[#F3E8FF]/40 text-xs">{resolvedTrack.artist}</p></div><span className="ml-auto bg-gradient-to-r from-amber-400 to-yellow-600 text-[#0D0221] text-[10px] font-black py-0.5 px-2 rounded-full">$</span></div>
                      <p className="text-[10px] text-amber-400/70 mt-2">A música que carregou — incluída no seu pagamento</p>
                      <button onClick={() => { setSelectedTrack(resolvedTrack); generateVeredict() }} className="w-full mt-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold py-2.5 rounded-xl border border-amber-500/30 text-sm transition-colors">Incluir e gerar</button>
                    </div>
                  )}

                  {resolvedTrack && plan === 'FREE' && (
                    <div className="relative p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                      <div className="flex items-center gap-3 blur-[4px] select-none pointer-events-none"><span className="text-2xl">🎵</span><div><p className="text-white font-bold text-sm">{resolvedTrack.name}</p><p className="text-[#F3E8FF]/40 text-xs">{resolvedTrack.artist}</p></div></div>
                      <button onClick={onUpgrade} className="absolute inset-0 flex items-center justify-center bg-[#0D0221]/30"><span className="bg-gradient-to-r from-purple-400 to-pink-500 text-white text-xs font-black py-1.5 px-4 rounded-full shadow-md">🔓 Liberar música</span></button>
                    </div>
                  )}

                  {/* Seguir sem música — sempre disponível */}
                  <button onClick={() => { setSelectedTrack(null); generateVeredict() }} className="w-full p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center hover:bg-white/[0.04] transition-colors">
                    <p className="text-white font-bold text-sm">Seguir sem música</p><p className="text-[10px] text-[#F3E8FF]/20 mt-0.5">Gratuito</p>
                  </button>
                </div>
              )}
              <div className="flex justify-center mt-6">
                <button onClick={() => setStep(2)} className="bg-white/[0.03] hover:bg-white/[0.06] text-[#F3E8FF]/40 py-3 px-6 rounded-2xl border border-white/[0.04] text-sm">← Voltar</button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!showCard && (
                <div className="text-center py-4">
                  <Bot size={112} pulsing />
                  <div className="space-y-2 max-w-md mx-auto mt-6 min-h-[80px]">
                    {thoughts.map((t, i) => (
                      <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-[#F3E8FF]/50 font-mono text-xs text-left">
                        &gt; {t}
                      </motion.p>
                    ))}
                    <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.7 }} className="text-purple-400 font-mono text-xs">▮</motion.span>
                  </div>
                </div>
              )}
              {veredict && showCard && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <VeredictCard veredict={veredict} />
                  <div className="flex justify-center gap-3 mt-6">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleShare} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm">📷 Compartilhar</motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleDownload} className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold py-3 px-6 rounded-2xl border border-white/[0.08] text-sm">⬇️ Baixar</motion.button>
                  </div>
                  <div className="text-center mt-4"><button onClick={onClose} className="text-[#F3E8FF]/30 hover:text-[#F3E8FF]/60 text-xs">Fechar</button></div>
                </motion.div>
              )}
            </motion.div>
          )}

          {!isGenerating && !showCard && step < 4 && (
            <div className="flex justify-center gap-2 mt-5">
              {[1, 2, 3].map(s => (<div key={s} className={`h-2 rounded-full transition-all ${step === s ? 'bg-purple-500 w-4' : step > s ? 'bg-purple-500/40 w-2' : 'bg-white/[0.06] w-2'}`} />))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
