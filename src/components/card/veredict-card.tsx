'use client'

import { useState, useRef, useCallback, useEffect, useMemo, type MouseEvent, type TouchEvent } from 'react'
import { motion } from 'framer-motion'
import { CardHoloEffects } from './card-holo-effects'
import { rollRarity, RARITIES, type CardRarity } from '@/lib/card-rarity'
import { ReactionButtons } from './reaction-buttons'
import { PersonalMap } from './personal-map'

interface MapAxis { axis: string; value: number; comment?: string }
interface Skill { name: string; emoji: string; value: number }
interface NetworkHighlight { platform: string; icon: string; label: string; value: string }
interface VeredictCardProps {
  veredict: {
    id?: string
    main_trait?: string
    veredict_badge: string
    veredict_text: string
    overall?: number
    final_opinion?: string
    card_image_url?: string
    base_image_url?: string
    frame_type?: 'brilhante' | 'dourada' | 'cinza'
    skills?: Skill[]
    hashtags?: string[]
    summary_short?: string
    personal_map?: MapAxis[]
    tags?: { name: string; emoji: string; percentage: number }[]
    niche?: string
    niche_colors?: { primary: string; secondary: string; accent: string }
    music_track?: { name: string; artist: string; spotifyUrl?: string }
    network_highlights?: NetworkHighlight[]
    user_name?: string
    profession_label?: string
    tips?: string[]
    profiles?: { username?: string; display_name?: string; avatar_url?: string }
    likes_count?: number
    dislikes_count?: number
  }
  compact?: boolean
  plan?: 'FREE' | 'FLEX' | 'PRO'
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export function VeredictCard({ veredict, compact, plan = 'FREE' }: VeredictCardProps) {
  const primary = veredict.niche_colors?.primary || '#8B5CF6'
  const secondary = veredict.niche_colors?.secondary || '#EC4899'
  const name = veredict.user_name || veredict.profiles?.display_name || ''
  const cardImg = veredict.card_image_url || veredict.base_image_url
  const highlights = (veredict.network_highlights || []).filter(h => h.value && h.value !== 'null')
  const isFlex = plan === 'FLEX' || plan === 'PRO'

  // Sorteia raridade (estável durante a sessão)
  const rarity = useMemo(() => rollRarity(plan), [plan])
  const rarityInfo = RARITIES[rarity]

  // Mouse tracking 3D
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
      setTilt({ rx: `${-cy / 3}deg`, ry: `${cx / 3}deg`, s: '1.03' })
    })
  }, [])

  const onLeave = useCallback(() => setTilt({ rx: '0deg', ry: '0deg', s: '1' }), [])

  const onTouch = useCallback((e: TouchEvent) => {
    e.preventDefault()
    const el = cardRef.current; if (!el) return
    const t = e.touches[0]
    const r = el.getBoundingClientRect()
    const cx = clamp(((t.clientX - r.left) / r.width) * 100 - 50, -50, 50)
    const cy = clamp(((t.clientY - r.top) / r.height) * 100 - 50, -50, 50)
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => setTilt({ rx: `${-cy / 3}deg`, ry: `${cx / 3}deg`, s: '1.03' }))
  }, [])

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  // Define cor da borda baseada na raridade
  const borderGradient = isFlex
    ? 'linear-gradient(135deg, #A855F7, #EC4899, #F59E0B, #22D3EE, #A855F7)'
    : 'linear-gradient(135deg, #7C6B99, #5B4F73)'

  const glowShadow = isFlex
    ? '0 0 30px rgba(168,85,247,0.3), 0 0 60px rgba(236,72,153,0.15), 0 0 90px rgba(245,158,11,0.08), 0 10px 40px rgba(0,0,0,0.5)'
    : '0 10px 40px rgba(0,0,0,0.6)'

  return (
    <div className="w-full flex flex-col items-center gap-5">
      {/* ═══════ CARD ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm"
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
            transition: 'transform 0.2s ease-out, box-shadow 0.4s ease',
            boxShadow: glowShadow,
          }}
          className="relative rounded-[22px] overflow-hidden bg-[#0D0221] border-2 border-white/5"
        >
          {/* Borda arco-íris (só FLEX) */}
          {isFlex && (
            <div
              className="absolute inset-0 rounded-[22px] pointer-events-none z-20"
              style={{
                background: borderGradient,
                backgroundSize: '300% 300%',
                animation: 'borderRainbow 5s ease infinite',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                padding: '3px', inset: '-3px', borderRadius: '22px',
              }}
            />
          )}

          {/* Camadas holográficas */}
          <CardHoloEffects rarity={rarity} />

          {/* Badge */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
            <span
              className="text-[#0D0221] text-[9px] font-black px-2.5 py-0.5 rounded-full"
              style={{
                background: isFlex
                  ? 'linear-gradient(135deg, #A855F7, #EC4899)'
                  : '#7C6B99',
              }}
            >
              {isFlex ? rarityInfo.emoji + ' ' + rarityInfo.label : 'FREE'}
            </span>
          </div>

          {/* Imagem / placeholder */}
          <div className="relative z-[3]">
            {cardImg ? (
              <img src={cardImg} alt={veredict.veredict_badge} className="w-full aspect-[9/16] object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full aspect-[9/16] flex items-center justify-center" style={{ background: `linear-gradient(145deg, ${primary}40, ${secondary}40)` }}>
                <div className="text-center text-white/50">
                  <div className="text-5xl mb-3">{rarityInfo.emoji}</div>
                  <p className="text-sm font-semibold">{rarityInfo.label}</p>
                  {isFlex && <p className="text-xs mt-1 opacity-60">Carta rara — efeitos ativos</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══════ CONTEÚDO ═══════ */}
      {compact && (
        <p className="text-center text-white font-black text-lg">{veredict.veredict_badge}</p>
      )}

      {!compact && (
        <>
          {/* ── main_trait + overall estilo FIFA ── */}
          {veredict.main_trait && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="text-center">
              <h2 className="text-3xl font-black text-white tracking-tight">{veredict.main_trait}</h2>
              {veredict.overall && (
                <div className="inline-flex items-center gap-2 mt-1 px-4 py-1.5 rounded-full"
                  style={{ background: `${primary}18`, border: `1px solid ${primary}30` }}>
                  <span className="text-[#F3E8FF]/40 text-[10px] font-bold uppercase tracking-widest">Overall</span>
                  <span className="text-white font-black text-2xl tabular-nums leading-none"
                    style={{ color: veredict.overall >= 85 ? '#22C55E' : veredict.overall >= 70 ? '#F59E0B' : '#EF4444' }}>
                    {veredict.overall}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* ── summary_short ── */}
          {veredict.summary_short && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              className="text-[#F3E8FF]/60 text-sm text-center italic max-w-sm leading-relaxed">
              {veredict.summary_short}
            </motion.p>
          )}

          {veredict.veredict_badge && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }} className="text-center">
              <span className="inline-block px-5 py-2 rounded-full text-white font-black text-lg"
                style={{ background: `${primary}30`, border: `1px solid ${primary}50` }}>
                {veredict.veredict_badge}
              </span>
              {veredict.profession_label && (
                <p className="text-[#F3E8FF]/50 text-sm mt-2">{veredict.profession_label}</p>
              )}
            </motion.div>
          )}

          {veredict.final_opinion && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="w-full max-w-md relative rounded-2xl p-5 border"
              style={{ background: `${primary}12`, borderColor: `${primary}30` }}>
              <span className="absolute -top-3 left-4 text-2xl">💬</span>
              <p className="text-white text-[15px] leading-relaxed font-medium italic">"{veredict.final_opinion}"</p>
              <p className="text-[#F3E8FF]/30 text-[10px] text-right mt-2">— Claudemiro</p>
            </motion.div>
          )}

          {veredict.veredict_text && (
            <div className="w-full max-w-md bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <p className="text-[#F3E8FF]/70 text-sm leading-relaxed whitespace-pre-wrap">{veredict.veredict_text}</p>
            </div>
          )}

          {/* ── skills (estilo FIFA) ── */}
          {veredict.skills && veredict.skills.length > 0 && (
            <div className="w-full max-w-md space-y-2">
              <h3 className="text-[#F3E8FF]/40 text-xs font-bold uppercase tracking-widest">Skills</h3>
              {veredict.skills.map((skill, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }} className="flex items-center gap-2">
                  <span className="text-lg">{skill.emoji}</span>
                  <span className="text-[#F3E8FF]/80 font-semibold w-28 text-sm truncate">{skill.name}</span>
                  <div className="flex-1 bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: `linear-gradient(to right, ${primary}, ${secondary})` }}
                      initial={{ width: 0 }} animate={{ width: `${skill.value}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }} />
                  </div>
                  <span className="text-white font-bold text-xs w-9 text-right tabular-nums">{skill.value}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── hashtags ── */}
          {veredict.hashtags && veredict.hashtags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {veredict.hashtags.map((tag, i) => (
                <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.65 + i * 0.05 }}
                  className="text-[#F3E8FF]/50 text-xs font-mono bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1">
                  {tag}
                </motion.span>
              ))}
            </div>
          )}

          {/* ── personal map ── */}
          {veredict.personal_map && veredict.personal_map.length > 0 && (
            <PersonalMap data={veredict.personal_map} primary={primary} secondary={secondary} />
          )}

          {/* ── reactions ── */}
          {veredict.id && (
            <ReactionButtons
              veredictId={veredict.id}
              initialLikes={veredict.likes_count || 0}
              initialDislikes={veredict.dislikes_count || 0}
            />
          )}

          {highlights.length > 0 && (
            <div className="w-full max-w-md grid grid-cols-1 gap-2">
              {highlights.map((h, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                  className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5">
                  <span className="text-xl">{h.icon}</span>
                  <span className="text-[#F3E8FF]/40 text-xs w-28 shrink-0">{h.label}</span>
                  <span className="text-white text-sm font-semibold truncate">{h.value}</span>
                </motion.div>
              ))}
            </div>
          )}

          {veredict.music_track && (
            <a href={veredict.music_track.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(`${veredict.music_track.name} ${veredict.music_track.artist}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="w-full max-w-md flex items-center gap-3 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 rounded-xl p-3 transition-colors">
              <span className="text-2xl">🎵</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{veredict.music_track.name}</p>
                <p className="text-[#F3E8FF]/50 text-xs truncate">{veredict.music_track.artist}</p>
              </div>
              <span className="text-[#1DB954] text-xs font-bold shrink-0">▶ Spotify</span>
            </a>
          )}

          {veredict.tags && veredict.tags.length > 0 && (
            <div className="w-full max-w-md space-y-2">
              {veredict.tags.map((tag, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-lg">{tag.emoji}</span>
                  <span className="text-[#F3E8FF]/80 font-semibold w-32 text-sm truncate">{tag.name}</span>
                  <div className="flex-1 bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(to right, ${primary}, ${secondary})` }}
                      initial={{ width: 0 }} animate={{ width: `${tag.percentage}%` }} transition={{ delay: 0.6 + i * 0.1, duration: 1 }} />
                  </div>
                  <span className="text-white font-bold text-xs w-9 text-right">{tag.percentage}%</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[#F3E8FF]/30 text-sm">#ClaudemiroMeViu{name ? ` · ${name}` : ''}</p>
        </>
      )}
    </div>
  )
}
