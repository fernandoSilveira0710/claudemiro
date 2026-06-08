'use client'

import { useState, useRef, useCallback, useEffect, useMemo, type MouseEvent, type TouchEvent } from 'react'
import { motion } from 'framer-motion'
import { CardHoloEffects } from './card-holo-effects'
import { rollRarity, RARITIES } from '@/lib/card-rarity'

interface Skill { name: string; emoji: string; value: number }
interface VeredictCardProps {
  veredict: {
    id?: string
    main_trait?: string
    veredict_badge: string
    overall?: number
    card_image_url?: string
    base_image_url?: string
    frame_type?: 'brilhante' | 'dourada' | 'cinza'
    skills?: Skill[]
    hashtags?: string[]
    summary_short?: string
    niche?: string
    niche_colors?: { primary: string; secondary: string; accent: string }
    music_track?: { name: string; artist: string; spotifyUrl?: string }
    user_name?: string
    profiles?: { username?: string; display_name?: string; avatar_url?: string }
  }
  compact?: boolean
  plan?: 'FREE' | 'FLEX' | 'PRO'
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

function ovrColor(v: number) {
  if (v >= 90) return '#FCD34D'
  if (v >= 80) return '#4ADE80'
  if (v >= 70) return '#22D3EE'
  if (v >= 60) return '#FBBF24'
  return '#F87171'
}

export function VeredictCard({ veredict, plan = 'FREE' }: VeredictCardProps) {
  const primary = veredict.niche_colors?.primary || '#8B5CF6'
  const secondary = veredict.niche_colors?.secondary || '#EC4899'
  const accent = veredict.niche_colors?.accent || primary
  const name = veredict.user_name || veredict.profiles?.display_name || ''
  const cardImg = veredict.card_image_url || veredict.base_image_url
  const isFlex = plan === 'FLEX' || plan === 'PRO'

  const rarity = useMemo(() => rollRarity(plan), [plan])
  const rarityInfo = RARITIES[rarity]

  const topSkills = (veredict.skills || []).slice(0, 3)
  const topHashtags = (veredict.hashtags || []).slice(0, 4)

  const [tilt, setTilt] = useState({ rx: '0deg', ry: '0deg', s: '1' })
  const cardRef = useRef<HTMLDivElement>(null)
  const raf = useRef<number | null>(null)

  const onMove = useCallback((e: MouseEvent) => {
    const el = cardRef.current; if (!el) return
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      const cx = clamp(((e.clientX - r.left) / r.width) * 100 - 50, -50, 50)
      const cy = clamp(((e.clientY - r.top) / r.height) * 100 - 50, -50, 50)
      setTilt({ rx: `${-cy / 4}deg`, ry: `${cx / 4}deg`, s: '1.02' })
    })
  }, [])
  const onLeave = useCallback(() => setTilt({ rx: '0deg', ry: '0deg', s: '1' }), [])
  const onTouch = useCallback((e: TouchEvent) => {
    const el = cardRef.current; if (!el) return
    const t = e.touches[0]
    const r = el.getBoundingClientRect()
    const cx = clamp(((t.clientX - r.left) / r.width) * 100 - 50, -50, 50)
    const cy = clamp(((t.clientY - r.top) / r.height) * 100 - 50, -50, 50)
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => setTilt({ rx: `${-cy / 4}deg`, ry: `${cx / 4}deg`, s: '1.02' }))
  }, [])
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  const borderGradient = isFlex
    ? 'linear-gradient(135deg, #A855F7, #EC4899, #F59E0B, #22D3EE, #A855F7)'
    : `linear-gradient(135deg, ${primary}, ${secondary})`
  const glowShadow = isFlex
    ? `0 0 30px ${primary}55, 0 0 60px ${secondary}33, 0 12px 40px rgba(0,0,0,0.6)`
    : `0 0 24px ${primary}33, 0 12px 40px rgba(0,0,0,0.6)`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-[360px]"
      style={{ perspective: '1200px' }}
    >
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onTouchMove={onTouch}
        onTouchEnd={onLeave}
        style={{
          transform: `rotateY(${tilt.ry}) rotateX(${tilt.rx}) scale(${tilt.s})`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.25s ease-out, box-shadow 0.4s ease',
          boxShadow: glowShadow,
          background: borderGradient,
          backgroundSize: '300% 300%',
          animation: isFlex ? 'borderRainbow 6s ease infinite' : undefined,
          padding: '4px',
        }}
        className="relative rounded-[20px] overflow-hidden"
      >
        <div
          className="relative rounded-[16px] overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${primary}22 0%, #0D0221 45%, #0D0221 70%, ${secondary}1f 100%)` }}
        >
          <CardHoloEffects rarity={rarity} />

          {/* HEADER: OVR + título */}
          <div className="relative z-20 flex items-stretch justify-between px-3 pt-5 pb-2 gap-2">
            <div className="flex flex-col items-center justify-center leading-none px-2 py-1 rounded-lg shrink-0"
              style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${accent}55` }}>
              <span className="font-black text-3xl tabular-nums" style={{ color: ovrColor(veredict.overall || 50) }}>
                {veredict.overall ?? '—'}
              </span>
              <span className="text-white/60 text-[8px] font-bold tracking-[0.2em]">OVR</span>
            </div>
            <div className="flex flex-col items-end justify-center min-w-0 text-right">
              <h2 className="text-white font-black text-lg leading-tight truncate max-w-[210px] drop-shadow"
                title={veredict.main_trait || veredict.veredict_badge}>
                {veredict.main_trait || veredict.veredict_badge}
              </h2>
              {name && <span className="text-white/55 text-[11px] font-semibold truncate max-w-[210px]">{name}</span>}
            </div>
          </div>

          {/* badge raridade */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-30">
            <span className="text-[8px] font-black px-2 py-0.5 rounded-full text-[#0D0221]"
              style={{ background: isFlex ? 'linear-gradient(135deg,#A855F7,#EC4899)' : '#C4B5E0' }}>
              {isFlex ? `${rarityInfo.emoji} ${rarityInfo.label}` : 'FREE'}
            </span>
          </div>

          {/* JANELA DE IMAGEM */}
          <div className="relative z-[3] mx-3 rounded-xl overflow-hidden"
            style={{ border: `2px solid ${accent}66`, background: `radial-gradient(circle at 50% 35%, ${primary}33, ${secondary}22 70%, transparent)` }}>
            {cardImg ? (
              <img src={cardImg} alt={veredict.veredict_badge} className="w-full aspect-[4/5] object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full aspect-[4/5] flex items-center justify-center">
                <div className="text-center text-white/50">
                  <div className="text-5xl mb-2">{rarityInfo.emoji}</div>
                  <p className="text-sm font-semibold">{rarityInfo.label}</p>
                </div>
              </div>
            )}
          </div>

          {/* FAIXA BADGE */}
          <div className="relative z-20 mx-3 mt-2.5 rounded-lg px-3 py-1.5 text-center"
            style={{ background: `linear-gradient(90deg, ${primary}55, ${secondary}55)` }}>
            <p className="text-white font-black text-sm leading-tight">{veredict.veredict_badge}</p>
          </div>

          {/* SKILLS top 3 */}
          {topSkills.length > 0 && (
            <div className="relative z-20 mx-3 mt-2.5 space-y-1.5">
              {topSkills.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center shrink-0">{s.emoji}</span>
                  <span className="text-white/80 text-[11px] font-semibold w-[88px] truncate shrink-0">{s.name}</span>
                  <div className="flex-1 bg-black/30 rounded-full h-1.5 overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: `linear-gradient(to right, ${accent}, ${secondary})` }}
                      initial={{ width: 0 }} animate={{ width: `${s.value}%` }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.8 }} />
                  </div>
                  <span className="text-white font-bold text-[10px] w-6 text-right tabular-nums shrink-0">{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* MINI-RESUMO */}
          {veredict.summary_short && (
            <div className="relative z-20 mx-3 mt-2.5">
              <p className="text-white/70 text-[11px] leading-snug italic text-center">{veredict.summary_short}</p>
            </div>
          )}

          {/* HASHTAGS + música */}
          <div className="relative z-20 mx-3 mt-2 mb-3 flex flex-wrap gap-1.5 justify-center items-center">
            {topHashtags.map((h, i) => (
              <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${accent}22`, color: '#fff', border: `1px solid ${accent}44` }}>
                {h}
              </span>
            ))}
            {veredict.music_track && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#1DB954]/20 text-[#4ADE80] border border-[#1DB954]/40">
                🎵 {veredict.music_track.artist}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
