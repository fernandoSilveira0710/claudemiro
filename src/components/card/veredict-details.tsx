'use client'

import { motion } from 'framer-motion'
import { PersonalMap } from './personal-map'
import { ReactionButtons } from './reaction-buttons'

interface MapAxis { axis: string; value: number; comment?: string }
interface NetworkHighlight { platform: string; icon: string; label: string; value: string }

interface VeredictDetailsProps {
  veredict: {
    id?: string
    veredict_text?: string
    final_opinion?: string
    personal_map?: MapAxis[]
    network_highlights?: NetworkHighlight[]
    music_track?: { name: string; artist: string; spotifyUrl?: string }
    niche_colors?: { primary: string; secondary: string; accent: string }
    likes_count?: number
    dislikes_count?: number
  }
  isOwner?: boolean
}

export function VeredictDetails({ veredict, isOwner = false }: VeredictDetailsProps) {
  const primary = veredict.niche_colors?.primary || '#8B5CF6'
  const secondary = veredict.niche_colors?.secondary || '#EC4899'
  const highlights = (veredict.network_highlights || []).filter(h => h.value && h.value !== 'null')

  return (
    <div className="w-full flex flex-col items-center gap-5">
      {/* veredito do Claudemiro */}
      {veredict.final_opinion && (
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="w-full relative rounded-2xl p-5 border"
          style={{ background: `${primary}12`, borderColor: `${primary}30` }}>
          <span className="absolute -top-3 left-4 text-2xl">💬</span>
          <p className="text-white text-[15px] leading-relaxed font-medium italic">&quot;{veredict.final_opinion}&quot;</p>
          <p className="text-[#F3E8FF]/30 text-[10px] text-right mt-2">— Claudemiro</p>
        </motion.div>
      )}

      {/* análise completa */}
      {veredict.veredict_text && (
        <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <h3 className="text-[#F3E8FF]/40 text-xs font-bold uppercase tracking-widest mb-2">A análise completa</h3>
          <p className="text-[#F3E8FF]/70 text-sm leading-relaxed whitespace-pre-wrap">{veredict.veredict_text}</p>
        </div>
      )}

      {/* mapa pessoal */}
      {veredict.personal_map && veredict.personal_map.length > 0 && (
        <PersonalMap data={veredict.personal_map} primary={primary} secondary={secondary} />
      )}

      {/* reações */}
      {veredict.id && (
        <ReactionButtons
          veredictId={veredict.id}
          initialLikes={veredict.likes_count || 0}
          initialDislikes={veredict.dislikes_count || 0}
          disabled={isOwner}
        />
      )}

      {/* highlights das redes */}
      {highlights.length > 0 && (
        <div className="w-full grid grid-cols-1 gap-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5">
              <span className="text-xl">{h.icon}</span>
              <span className="text-[#F3E8FF]/40 text-xs w-28 shrink-0">{h.label}</span>
              <span className="text-white text-sm font-semibold truncate">{h.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* música tocando (player Spotify embed) */}
      {veredict.music_track && (
        <a
          href={veredict.music_track.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(`${veredict.music_track.name} ${veredict.music_track.artist}`)}`}
          target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center gap-3 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 rounded-xl p-3 transition-colors"
        >
          <span className="text-2xl">🎵</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{veredict.music_track.name}</p>
            <p className="text-[#F3E8FF]/50 text-xs truncate">{veredict.music_track.artist}</p>
          </div>
          <span className="text-[#1DB954] text-xs font-bold shrink-0">▶ Spotify</span>
        </a>
      )}
    </div>
  )
}
