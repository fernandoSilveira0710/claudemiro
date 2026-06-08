'use client'

import { useRef, useState, useEffect } from 'react'

interface MusicPlayerProps {
  track: { name: string; artist: string; previewUrl?: string | null; spotifyUrl?: string }
}

/** Toca o preview de 30s do Spotify em LOOP. Se não houver preview, vira link. */
export function MusicPlayer({ track }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const hasPreview = !!track.previewUrl
  const spotifyUrl = track.spotifyUrl
    || `https://open.spotify.com/search/${encodeURIComponent(`${track.name} ${track.artist}`)}`

  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  function toggle() {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
  }

  return (
    <div className="w-full flex items-center gap-3 bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-xl p-3">
      {hasPreview ? (
        <>
          <audio ref={audioRef} src={track.previewUrl!} loop preload="none"
            onEnded={() => { /* loop cuida */ }} />
          <button
            onClick={toggle}
            aria-label={playing ? 'Pausar' : 'Tocar preview'}
            className="w-10 h-10 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shrink-0 transition-colors"
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
        </>
      ) : (
        <span className="text-2xl shrink-0">🎵</span>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{track.name}</p>
        <p className="text-[#F3E8FF]/50 text-xs truncate">
          {track.artist}{hasPreview && playing ? ' · tocando…' : hasPreview ? ' · preview 30s em loop' : ''}
        </p>
      </div>

      <a href={spotifyUrl} target="_blank" rel="noopener noreferrer"
        className="text-[#1DB954] text-xs font-bold shrink-0 hover:underline">
        Spotify ↗
      </a>
    </div>
  )
}
