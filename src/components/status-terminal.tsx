'use client'

import { useEffect, useRef } from 'react'

const PHRASES = [
  'Analisando playlist de sertanejo...',
  'Crise existencial detectada.',
  'Feed parece encarte de supermercado.',
  '70% das músicas: sofrência.',
  'Seguidor bot? 34% de chance.',
  'Horas de TikTok: irreversível.',
  'Pronto para julgar mais um.',
  'Nível de nerdice: crítico.',
  'Streamer favorito: duvidoso.',
  'Playlist de academia: mentira.',
]

export function StatusTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const linesRef = useRef<{ text: string; ts: number }[]>([])

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (!terminalRef.current) return
      const phrase = PHRASES[i % PHRASES.length]
      linesRef.current.push({ text: phrase, ts: Date.now() })
      if (linesRef.current.length > 6) linesRef.current.shift()

      terminalRef.current.innerHTML = linesRef.current
        .map((l, idx) => `<div class="terminal-line" style="animation: fadeInLine 0.4s ease-out ${idx === linesRef.current.length - 1 ? '0s' : '0s'} both">[<span class="text-purple-400">CLAUDEMIRO</span>]: ${l.text}</div>`)
        .join('') + '<span class="terminal-cursor">_</span>'

      i++
    }, 2800)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      ref={terminalRef}
      className="font-mono text-[10px] leading-relaxed pointer-events-none select-none"
    />
  )
}
