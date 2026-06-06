'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CardHoloEffects } from '@/components/card/card-holo-effects'
import { RARITIES, type CardRarity } from '@/lib/card-rarity'

// Drop rates por plano (espelha rollRarity)
const FREE_DROPS: { rarity: CardRarity; pct: number }[] = [
  { rarity: 'COMMON', pct: 45 },
  { rarity: 'UNCOMMON', pct: 45 },
  { rarity: 'REVERSE_HOLO', pct: 10 },
]
const FLEX_DROPS: { rarity: CardRarity; pct: number }[] = [
  { rarity: 'RARE_HOLO', pct: 25 },
  { rarity: 'GALAXY', pct: 25 },
  { rarity: 'RAINBOW', pct: 20 },
  { rarity: 'GOLD', pct: 15 },
  { rarity: 'RADIANT', pct: 10 },
]

const ACCENT: Record<CardRarity, string> = {
  COMMON: '#9CA3AF', UNCOMMON: '#A3E0E8', REVERSE_HOLO: '#C084FC',
  RARE_HOLO: '#EC4899', GALAXY: '#A855F7', RAINBOW: '#F472B6', GOLD: '#F5D76E', RADIANT: '#82FFD5',
}

interface HoloShowcaseProps {
  plan: 'FREE' | 'FLEX' | 'PRO'
  name?: string
  emoji?: string
}

export function HoloShowcase({ plan, name = 'SEU NOME', emoji = '🦾' }: HoloShowcaseProps) {
  const drops = plan === 'FREE' ? FREE_DROPS : FLEX_DROPS
  const [idx, setIdx] = useState(0)
  const current = drops[idx].rarity
  const meta = RARITIES[current]
  const accent = ACCENT[current]

  // Cicla automaticamente entre os estilos do plano a cada 2.6s
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % drops.length), 2600)
    return () => clearInterval(t)
  }, [drops.length])

  return (
    <div className="flex flex-col items-center">
      {/* Card de exemplo grande, holográfico de verdade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, rotateY: -14, scale: 0.94 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: 14, scale: 0.94 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative"
          style={{ width: 220, aspectRatio: '9/13' }}
        >
          <div className="relative w-full h-full rounded-3xl overflow-hidden border-2"
            style={{ background: 'linear-gradient(160deg,#1A0A33,#0D0221)', borderColor: `${accent}40` }}>
            {/* conteúdo do card */}
            <div className="relative z-[6] h-full p-4 flex flex-col">
              <div className="relative h-[42%] rounded-xl flex items-center justify-center overflow-hidden"
                style={{ background: `radial-gradient(circle at 50% 40%, ${accent}22, rgba(13,2,33,0.05))` }}>
                <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-black tracking-[0.16em] px-2.5 py-1 rounded-full whitespace-nowrap z-[7]"
                  style={{ background: 'rgba(0,0,0,0.5)', color: accent, border: `1px solid ${accent}55` }}>
                  {meta.label.toUpperCase()}
                </span>
                <span className="text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{emoji}</span>
              </div>
              <div className="text-center mt-3">
                <p className="font-black text-white text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{name}</p>
                <p className="text-[10px]" style={{ color: accent }}>{meta.emoji} Edição {meta.label}</p>
              </div>
              <div className="mt-auto space-y-1.5">
                {[['🎮 Gamer', 92], ['⚽ Torcedor', 80], ['🎵 Música', 67]].map(([l, p]) => (
                  <div key={l as string}>
                    <div className="flex justify-between text-[8px] text-white/60 mb-0.5"><span>{l}</span><span>{p}%</span></div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p}%`, background: `linear-gradient(90deg, ${accent}, #ffffff66)` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* CAMADA HOLOGRÁFICA REAL (segue o mouse) */}
            <CardHoloEffects rarity={current} />
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="text-[10px] text-[#F3E8FF]/30 mt-3 italic">passa o mouse pra ver o brilho ✨</p>

      {/* DROP RATES */}
      <div className="w-full mt-4">
        <p className="text-[10px] font-bold text-[#F3E8FF]/50 uppercase tracking-wider mb-2 text-center">
          {plan === 'FREE' ? 'Cartas que podem sair (grátis)' : 'Cartas garantidas premium'}
        </p>
        <div className="space-y-1.5">
          {drops.map((d, i) => {
            const m = RARITIES[d.rarity]
            const a = ACCENT[d.rarity]
            const isShowing = i === idx
            return (
              <button key={d.rarity} onClick={() => setIdx(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${isShowing ? 'bg-white/[0.06] border-white/20' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'}`}>
                <span className="text-base">{m.emoji}</span>
                <span className="text-xs font-bold flex-1 text-left" style={{ color: a }}>{m.label}</span>
                {/* barra de probabilidade */}
                <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: a }} />
                </div>
                <span className="text-[11px] font-black text-white/80 w-9 text-right">{d.pct}%</span>
              </button>
            )
          })}
        </div>
        {plan === 'FREE' && (
          <p className="text-[10px] text-[#F3E8FF]/35 mt-2.5 text-center leading-relaxed">
            No grátis sai comum, incomum ou — com sorte — a <span style={{ color: '#C084FC' }}>Reverse Holo (10%)</span>.<br />
            As <span className="text-amber-400">premium</span> (Galáxia, Ouro, Radiante…) só no FLEX.
          </p>
        )}
      </div>
    </div>
  )
}
