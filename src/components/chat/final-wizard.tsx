'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClaudemiroBot } from '@/components/claudemiro-bot'
import { VeredictCard } from '@/components/card/veredict-card'

// ── Tipos ──────────────────────────────────────────────
type Plan = 'PRO' | 'FLEX' | 'FREE'
type FrameType = 'brilhante' | 'dourada' | 'cinza'
type Step = 1 | 2 | 3 | 4

interface SocialImage {
  platform: string
  label: string
  url: string
}

interface TrackInfo {
  name: string
  artist: string
  spotifyUrl?: string
}

interface WizardProps {
  sessionId: string
  plan: Plan
  socialImages: SocialImage[]
  aiTrack: TrackInfo | null
  onClose: () => void
}

// ── Streaming de pensamentos simulados ─────────────────
const FAKE_THOUGHTS = [
  'Vasculhando os dados das redes...',
  'Cruzando Spotify com Steam...',
  'Isso explica muita coisa...',
  'Montando o veredito...',
  'Achando o tom certo...',
]

// ── Componente ─────────────────────────────────────────
export function FinalWizard({ sessionId, plan, socialImages, aiTrack, onClose }: WizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [selectedPlan, setSelectedPlan] = useState<Plan>(plan)
  const [selectedFrame, setSelectedFrame] = useState<FrameType>(plan === 'PRO' ? 'brilhante' : plan === 'FLEX' ? 'dourada' : 'cinza')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<TrackInfo | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [thoughts, setThoughts] = useState<string[]>([])
  const [currentThought, setCurrentThought] = useState('')
  const [veredict, setVeredict] = useState<any>(null)
  const [showCard, setShowCard] = useState(false)
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null)

  const thoughtsTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Gate temporal: verificar se pode gerar ─────────────
  useEffect(() => {
    if (plan === 'FREE') {
      fetch('/api/user/can-generate').then(r => r.json()).then(d => {
        if (!d.allowed) setCooldownMessage(d.reason === 'free_cooldown'
          ? `Você já gerou um veredito grátis. Próximo disponível em ${new Date(d.nextAt).toLocaleDateString('pt-BR')}.`
          : 'Você não pode gerar vereditos agora.')
      })
    }
  }, [plan])

  // ── Etapa 1: Moldura ──────────────────────────────────
  const frames: { type: FrameType; plan: Plan; icon: string; label: string; desc: string; price: string; color: string }[] = [
    { type: 'brilhante', plan: 'PRO', icon: '✨', label: 'BRILHANTE', desc: 'Shimmer animado', price: 'R$ 19,99/mês', color: 'from-purple-400 via-pink-400 to-purple-400' },
    { type: 'dourada', plan: 'FLEX', icon: '👑', label: 'DOURADA', desc: 'Dourado sólido', price: 'R$ 9,99', color: 'from-amber-400 to-yellow-500' },
    { type: 'cinza', plan: 'FREE', icon: '⬜', label: 'CINZA', desc: 'Fosco', price: 'FREE', color: 'from-gray-500 to-gray-400' },
  ]

  // ── Etapa 4: Gerar veredito ───────────────────────────
  const generateVeredict = async () => {
    setIsGenerating(true)
    setStep(4)

    // Simula streaming de pensamentos
    for (let i = 0; i < FAKE_THOUGHTS.length; i++) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
      setThoughts(prev => [...prev, FAKE_THOUGHTS[i]])
      setCurrentThought(FAKE_THOUGHTS[i])
    }

    // Chama a API pra gerar o veredito real
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestVeredict: true, sessionId }),
      })
      const data = await res.json()
      if (data.type === 'veredict') {
        // Enriquece com dados do wizard
        setVeredict({
          ...data.veredict,
          frame_type: selectedFrame,
          base_image_url: selectedImage || data.veredict?.card_image_url,
          music_track: selectedTrack || data.veredict?.music_track,
        })
        // Pequeno delay pra transição
        await new Promise(r => setTimeout(r, 500))
        setShowCard(true)
      }
    } catch (err) {
      console.error('Erro ao gerar veredito:', err)
    }
    setIsGenerating(false)
  }

  // ── Compartilhar / Baixar ─────────────────────────────
  const handleShare = async () => {
    if (!veredict) return
    const text = `${veredict.veredict_badge}\n\nDescubra o seu: claudemiro.app`
    if (navigator.share) {
      await navigator.share({ text, title: 'Meu Claudemiro' })
    } else {
      await navigator.clipboard.writeText(text)
      alert('Link copiado!')
    }
  }

  const handleDownload = () => {
    if (!veredict?.card_image_url) return
    const a = document.createElement('a')
    a.href = veredict.card_image_url
    a.download = `claudemiro-${veredict.veredict_badge?.replace(/\s/g, '-') || 'card'}.png`
    a.click()
  }

  // ── Cleanup ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (thoughtsTimerRef.current) clearTimeout(thoughtsTimerRef.current)
    }
  }, [])

  // ── RENDER ────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D0221]/95 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card border border-purple-500/20 shadow-[0_0_60px_rgba(168,85,247,0.15)] rounded-3xl p-6 mx-4 relative"
        >
          {/* Fechar */}
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-[#F3E8FF]/40 hover:text-white z-10 text-sm">✕</button>

          {/* Robozinho */}
          <div className="flex justify-center mb-4">
            <motion.div
              animate={isGenerating ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-20 h-20 claude-bot-glow"
            >
              <ClaudemiroBot />
            </motion.div>
          </div>

          {/* ─── ETAPA 1: Moldura ──────────────────────── */}
          {step === 1 && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-xl font-black text-white text-center mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Escolhe a moldura</h2>
              <p className="text-[#F3E8FF]/40 text-sm text-center mb-6">Define o estilo do teu card</p>
              <div className="grid grid-cols-3 gap-3">
                {frames.map(f => {
                  const canSelect = f.plan === 'FREE' ? true : plan === f.plan || plan === 'PRO'
                  const isSelected = selectedFrame === f.type
                  return (
                    <motion.button
                      key={f.type}
                      whileHover={canSelect ? { scale: 1.03, y: -2 } : {}}
                      whileTap={canSelect ? { scale: 0.97 } : {}}
                      onClick={() => canSelect && setSelectedFrame(f.type)}
                      className={`relative p-4 rounded-2xl border transition-all text-center ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                          : canSelect
                          ? 'bg-white/[0.02] border-white/[0.06] hover:border-purple-500/20'
                          : 'bg-white/[0.01] border-white/[0.03] opacity-40 cursor-not-allowed'
                      }`}
                    >
                      {!canSelect && (
                        <span className="absolute top-1 right-1 text-xs">🔒</span>
                      )}
                      <span className="text-2xl block mb-1">{f.icon}</span>
                      <p className={`text-sm font-bold ${f.type === 'brilhante' ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent' : f.type === 'dourada' ? 'text-amber-400' : 'text-gray-400'}`}>
                        {f.label}
                      </p>
                      <p className="text-[10px] text-[#F3E8FF]/30 mt-0.5">{f.desc}</p>
                      <p className="text-xs font-bold text-white mt-1.5">{f.price}</p>
                    </motion.button>
                  )
                })}
              </div>
              <div className="flex justify-center mt-6">
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStep(2)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-10 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm"
                >
                  Avançar
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ─── ETAPA 2: Imagem ───────────────────────── */}
          {step === 2 && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-xl font-black text-white text-center mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Escolhe a imagem base</h2>
              <p className="text-[#F3E8FF]/40 text-sm text-center mb-6">Pro teu cartoon</p>
              <div className="grid grid-cols-4 gap-3">
                {socialImages.map((img, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                      selectedImage === img.url
                        ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                        : 'border-white/[0.06] hover:border-purple-500/30'
                    }`}
                  >
                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">{img.label}</span>
                  </motion.button>
                ))}
                {/* Upload bloqueado pra não-PRO */}
                <motion.div
                  className={`relative aspect-square rounded-2xl border-2 border-white/[0.06] flex flex-col items-center justify-center bg-white/[0.01] ${
                    plan === 'PRO' ? 'cursor-pointer hover:border-purple-500/30' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl mb-1">{plan === 'PRO' ? '📤' : '🔒'}</span>
                  <span className="text-[10px] text-[#F3E8FF]/30 text-center px-1">Upload{plan !== 'PRO' && ' PRO'}</span>
                  {plan !== 'PRO' && <span className="absolute top-1 right-1 text-xs">💰</span>}
                </motion.div>
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <button onClick={() => setStep(1)} className="bg-white/[0.03] hover:bg-white/[0.06] text-[#F3E8FF]/40 py-3 px-6 rounded-2xl border border-white/[0.04] text-sm">← Voltar</button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStep(3)}
                  disabled={!selectedImage}
                  className={`font-bold py-3 px-10 rounded-2xl text-sm ${
                    selectedImage
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                      : 'bg-white/[0.03] text-[#F3E8FF]/20 cursor-not-allowed'
                  }`}
                >
                  Avançar
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ─── ETAPA 3: Música ───────────────────────── */}
          {step === 3 && !isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-xl font-black text-white text-center mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Música do card</h2>
              <p className="text-[#F3E8FF]/40 text-sm text-center mb-6">Trilha sonora do teu veredito</p>

              <div className="space-y-3">
                {/* Free: só "seguir sem música" ou cooldown */}
                {plan === 'FREE' && cooldownMessage ? (
                  <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
                    <p className="text-red-400 font-bold text-sm mb-1">⏳ Cooldown</p>
                    <p className="text-[#F3E8FF]/40 text-xs">{cooldownMessage}</p>
                    <button onClick={onClose} className="mt-3 text-[#F3E8FF]/30 hover:text-white text-xs underline">Fechar</button>
                  </div>
                ) : plan === 'FREE' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedTrack(null); generateVeredict() }}
                    className="w-full p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center hover:bg-white/[0.04]"
                  >
                    <p className="text-white font-bold text-sm">Seguir sem música</p>
                    <p className="text-[10px] text-[#F3E8FF]/20 mt-0.5">Gratuito</p>
                  </motion.button>
                )}

                {/* PRO: música da IA + busca Spotify */}
                {plan === 'PRO' && aiTrack && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedTrack(aiTrack); generateVeredict() }}
                      className="w-full p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎵</span>
                        <div>
                          <p className="text-white font-bold text-sm">{aiTrack.name}</p>
                          <p className="text-[#F3E8FF]/40 text-xs">{aiTrack.artist}</p>
                        </div>
                        <span className="ml-auto text-xs text-purple-400">✓ incluído</span>
                      </div>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="w-full p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center hover:bg-white/[0.04]"
                    >
                      <p className="text-white font-bold text-sm">🎧 Buscar no Spotify</p>
                      <p className="text-[10px] text-[#F3E8FF]/20 mt-0.5">Escolhe qualquer música</p>
                    </motion.button>
                  </>
                )}

                {/* FLEX: música borrada com 🔒 */}
                {plan === 'FLEX' && aiTrack && (
                  <div className="relative">
                    <div className="w-full p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center gap-3 blur-[3px] select-none">
                        <span className="text-2xl">🎵</span>
                        <div>
                          <p className="text-white font-bold text-sm">{aiTrack.name}</p>
                          <p className="text-[#F3E8FF]/40 text-xs">{aiTrack.artist}</p>
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl">🔒</span>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'per_generation' }) })
                          const data = await res.json()
                          if (data.qrCodeBase64) {
                            alert('PIX gerado! Escaneie o QR code para liberar a música.')
                            setSelectedTrack(aiTrack)
                            generateVeredict()
                          }
                        } catch { alert('Erro ao gerar pagamento') }
                      }}
                      className="w-full mt-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold py-2.5 rounded-xl border border-amber-500/30 text-sm"
                    >
                      🔓 Incluir música — R$ 3,99
                    </motion.button>
                  </div>
                )}

                {plan !== 'FREE' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedTrack(null); generateVeredict() }}
                    className="w-full p-3 rounded-2xl border border-white/[0.04] bg-white/[0.01] text-center hover:bg-white/[0.03]"
                  >
                    <p className="text-[#F3E8FF]/30 text-sm">Seguir sem música</p>
                  </motion.button>
                )}
              </div>

              <div className="flex justify-center mt-6">
                <button onClick={() => setStep(2)} className="bg-white/[0.03] hover:bg-white/[0.06] text-[#F3E8FF]/40 py-3 px-6 rounded-2xl border border-white/[0.04] text-sm">← Voltar</button>
              </div>
            </motion.div>
          )}

          {/* ─── ETAPA 4: Loading + Resultado ───────────── */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Loading: pensamentos em streaming */}
              {isGenerating && (
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-28 h-28 mx-auto claude-bot-glow mb-4"
                  >
                    <ClaudemiroBot />
                  </motion.div>
                  <div className="space-y-2 max-w-md mx-auto">
                    {thoughts.map((t, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[#F3E8FF]/40 font-mono text-xs text-left"
                      >
                        &gt; {t}
                      </motion.p>
                    ))}
                    {currentThought && !thoughts.includes(currentThought) && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-purple-400 font-mono text-xs text-left"
                      >
                        &gt; <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                        >
                          ▮
                        </motion.span> {currentThought}
                      </motion.p>
                    )}
                  </div>
                </div>
              )}

              {/* Resultado: Resumo + Card */}
              {veredict && showCard && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  {/* Badge + resumo */}
                  <div className="text-center mb-4">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/15 text-purple-300 text-sm font-bold mb-3">
                      {veredict.veredict_badge}
                    </span>
                    <p className="text-[#F3E8FF]/60 text-sm leading-relaxed max-w-md mx-auto">
                      {veredict.veredict_text}
                    </p>
                  </div>

                  {/* Card renderizado */}
                  <div className="flex justify-center mb-6">
                    <div className="w-72 rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_0_40px_rgba(168,85,247,0.1)]">
                      <VeredictCard veredict={veredict} />
                    </div>
                  </div>

                  {/* Botões compartilhar / baixar */}
                  <div className="flex justify-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={handleShare}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm"
                    >
                      📤 Compartilhar
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={handleDownload}
                      className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold py-3 px-6 rounded-2xl border border-white/[0.08] text-sm"
                    >
                      ⬇️ Baixar
                    </motion.button>
                  </div>

                  {/* Fechar */}
                  <div className="text-center mt-4">
                    <button onClick={onClose} className="text-[#F3E8FF]/30 hover:text-[#F3E8FF]/60 text-xs">Fechar</button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── Indicador de etapas ────────────────────── */}
          {!isGenerating && !showCard && (
            <div className="flex justify-center gap-2 mt-4">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === s ? 'bg-purple-500 w-4' : step > s ? 'bg-purple-500/40' : 'bg-white/[0.06]'
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
