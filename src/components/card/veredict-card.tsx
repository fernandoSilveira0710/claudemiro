'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface NetworkHighlight { platform: string; icon: string; label: string; value: string }
interface VeredictCardProps {
  veredict: {
    id?: string
    veredict_badge: string
    veredict_text: string
    final_opinion?: string
    card_image_url?: string
    base_image_url?: string
    frame_type?: 'brilhante' | 'dourada' | 'cinza'
    tags?: { name: string; emoji: string; percentage: number }[]
    niche?: string
    niche_colors?: { primary: string; secondary: string; accent: string }
    music_track?: { name: string; artist: string; spotifyUrl?: string }
    network_highlights?: NetworkHighlight[]
    user_name?: string
    profession_label?: string
    tips?: string[]
    profiles?: { username?: string; display_name?: string; avatar_url?: string }
  }
  compact?: boolean
}

const FRAME_STYLES: Record<string, { ring: string; glow: string; tag: string; tagText: string }> = {
  brilhante: {
    ring: 'p-[3px] bg-gradient-to-br from-purple-400 via-pink-400 to-cyan-400',
    glow: 'shadow-[0_0_40px_rgba(168,85,247,0.4)]',
    tag: 'bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400',
    tagText: 'BRILHANTE',
  },
  dourada: {
    ring: 'p-[3px] bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.35)]',
    tag: 'bg-gradient-to-r from-amber-300 to-yellow-600',
    tagText: 'DOURADA',
  },
  cinza: {
    ring: 'p-[2px] bg-gradient-to-br from-gray-500 to-gray-700',
    glow: 'shadow-[0_0_20px_rgba(0,0,0,0.3)]',
    tag: 'bg-gray-600',
    tagText: 'FREE',
  },
}

export function VeredictCard({ veredict, compact }: VeredictCardProps) {
  const frame = FRAME_STYLES[veredict.frame_type || 'cinza']
  const primary = veredict.niche_colors?.primary || '#8B5CF6'
  const secondary = veredict.niche_colors?.secondary || '#EC4899'
  const name = veredict.user_name || veredict.profiles?.display_name || ''
  const cardImg = veredict.card_image_url || veredict.base_image_url
  const highlights = (veredict.network_highlights || []).filter(h => h.value && h.value !== 'null')

  return (
    <div className="w-full flex flex-col items-center gap-5">

      {/* ─── A FIGURINHA (imagem Nano Banana + moldura do plano) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`relative rounded-3xl ${frame.ring} ${frame.glow} w-full max-w-sm`}
      >
        {veredict.frame_type === 'brilhante' && (
          <motion.div
            className="absolute inset-0 rounded-3xl opacity-50 pointer-events-none"
            style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)' }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <div className="rounded-[21px] overflow-hidden bg-[#0D0221] relative">
          <div className={`absolute top-3 left-3 z-10 ${frame.tag} text-[#0D0221] text-[9px] font-black px-2 py-0.5 rounded-full`}>
            {frame.tagText}
          </div>
          {cardImg ? (
            <img src={cardImg} alt={veredict.veredict_badge} className="w-full aspect-[9/16] object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full aspect-[9/16] flex items-center justify-center" style={{ background: `linear-gradient(145deg, ${primary}, ${secondary})` }}>
              <div className="text-center text-white/60">
                <div className="text-5xl mb-3">🤖</div>
                <p className="text-sm">Gerando a figurinha...</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {compact && (
        <p className="text-center text-white font-black text-lg">{veredict.veredict_badge}</p>
      )}

      {!compact && (
        <>
          {/* ─── BADGE ─── */}
          {veredict.veredict_badge && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
              className="text-center">
              <span className="inline-block px-5 py-2 rounded-full text-white font-black text-lg"
                style={{ background: `${primary}30`, border: `1px solid ${primary}50` }}>
                {veredict.veredict_badge}
              </span>
              {veredict.profession_label && (
                <p className="text-[#F3E8FF]/50 text-sm mt-2">{veredict.profession_label}</p>
              )}
            </motion.div>
          )}

          {/* ─── OPINIÃO FINAL do Claudemiro (destaque) ─── */}
          {veredict.final_opinion && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="w-full max-w-md relative rounded-2xl p-5 border"
              style={{ background: `${primary}12`, borderColor: `${primary}30` }}>
              <span className="absolute -top-3 left-4 text-2xl">💬</span>
              <p className="text-white text-[15px] leading-relaxed font-medium italic">
                "{veredict.final_opinion}"
              </p>
              <p className="text-[#F3E8FF]/30 text-[10px] text-right mt-2">— Claudemiro</p>
            </motion.div>
          )}

          {/* ─── RESUMO ─── */}
          {veredict.veredict_text && (
            <div className="w-full max-w-md bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
              <p className="text-[#F3E8FF]/70 text-sm leading-relaxed whitespace-pre-wrap">{veredict.veredict_text}</p>
            </div>
          )}

          {/* ─── DESTAQUES DAS REDES (ícones) ─── */}
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

          {/* ─── MÚSICA ─── */}
          {veredict.music_track && (
            <a
              href={veredict.music_track.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(`${veredict.music_track.name} ${veredict.music_track.artist}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="w-full max-w-md flex items-center gap-3 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 rounded-xl p-3 transition-colors"
            >
              <span className="text-2xl">🎵</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{veredict.music_track.name}</p>
                <p className="text-[#F3E8FF]/50 text-xs truncate">{veredict.music_track.artist}</p>
              </div>
              <span className="text-[#1DB954] text-xs font-bold shrink-0">▶ Spotify</span>
            </a>
          )}

          {/* ─── TAGS / NÍVEIS ─── */}
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

          {/* ─── HASHTAG ─── */}
          <p className="text-[#F3E8FF]/30 text-sm">#ClaudemiroMeViu{name ? ` · ${name}` : ''}</p>
        </>
      )}
    </div>
  )
}
