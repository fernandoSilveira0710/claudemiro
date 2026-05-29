'use client'

import { useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface ProgressBarProps {
  interactionCount: number
  maxInteractions?: number
  isDone?: boolean
}

export function ChatProgressBar({ interactionCount, maxInteractions = 10, isDone = false }: ProgressBarProps) {
  const rawProgress = isDone ? 1 : Math.min(interactionCount / maxInteractions, 1)
  const spring = useSpring(0, { stiffness: 35, damping: 18 })
  const heightPct = useTransform(spring, v => `${v * 100}%`)

  useEffect(() => { spring.set(rawProgress) }, [rawProgress, spring])

  // Cor em 3 fases
  const fromColor = rawProgress < 0.45 ? '#22D3EE' : rawProgress < 0.75 ? '#818CF8' : '#A855F7'
  const toColor   = rawProgress < 0.45 ? '#818CF8' : rawProgress < 0.75 ? '#A855F7' : '#EC4899'
  const glowColor = rawProgress < 0.45 ? '34,211,238' : rawProgress < 0.75 ? '129,140,248' : '236,72,153'

  return (
    <>
      <style>{`
        @keyframes bubble-rise-1 { 0%{transform:translateY(0) translateX(-50%) scale(.6);opacity:0} 20%{opacity:.7} 100%{transform:translateY(-60px) translateX(-50%) scale(.3);opacity:0} }
        @keyframes bubble-rise-2 { 0%{transform:translateY(0) translateX(-50%) scale(.8);opacity:0} 30%{opacity:.5} 100%{transform:translateY(-80px) translateX(-50%) scale(.2);opacity:0} }
        @keyframes bubble-rise-3 { 0%{transform:translateY(0) translateX(-50%) scale(.5);opacity:0} 25%{opacity:.6} 100%{transform:translateY(-50px) translateX(-50%) scale(.4);opacity:0} }
        @keyframes wave-surface  { 0%,100%{transform:scaleX(.85) translateY(0)} 50%{transform:scaleX(1.15) translateY(-1px)} }
        @keyframes bar-glow-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
      `}</style>

      <div className="absolute right-2.5 top-6 bottom-6 w-3 z-10 flex flex-col items-center">
        <div className="relative flex-1 w-full">

          {/* Trilho */}
          <div className="absolute inset-0 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>

            {/* Coluna de água */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-full"
              style={{ height: heightPct }}
            >
              {/* Gradiente */}
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${fromColor}, ${toColor})` }} />

              {/* Brilho lateral esquerdo */}
              <div className="absolute inset-y-0 left-0 w-1/3 rounded-l-full" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.28), transparent)' }} />

              {/* Onda na superfície */}
              {rawProgress > 0.05 && (
                <div
                  className="absolute top-0 left-0 right-0 h-2.5"
                  style={{
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.55) 0%, transparent 80%)',
                    animation: 'wave-surface 1.8s ease-in-out infinite',
                    transformOrigin: 'center top',
                  }}
                />
              )}

              {/* Bolhas — CSS puro, sem JS */}
              {rawProgress > 0.15 && (
                <>
                  <div className="absolute left-1/2 rounded-full border border-white/30"
                    style={{ width:3, height:3, bottom:'12%', animation:'bubble-rise-1 2.4s ease-out infinite', animationDelay:'0s' }} />
                  <div className="absolute left-1/2 rounded-full border border-white/25"
                    style={{ width:2, height:2, bottom:'25%', animation:'bubble-rise-2 3.1s ease-out infinite', animationDelay:'0.8s' }} />
                  <div className="absolute left-1/2 rounded-full border border-white/20"
                    style={{ width:2, height:2, bottom:'8%', animation:'bubble-rise-3 2.7s ease-out infinite', animationDelay:'1.5s' }} />
                  {rawProgress > 0.5 && (
                    <div className="absolute left-1/2 rounded-full border border-white/20"
                      style={{ width:3, height:3, bottom:'40%', animation:'bubble-rise-1 3.5s ease-out infinite', animationDelay:'0.4s' }} />
                  )}
                </>
              )}
            </motion.div>

            {/* Marcadores de fase */}
            {[0.25, 0.5, 0.75].map((m, i) => (
              <div key={i} className="absolute left-0 right-0 h-px" style={{
                bottom: `${m * 100}%`,
                background: rawProgress >= m ? `rgba(${glowColor},0.6)` : 'rgba(255,255,255,0.07)',
              }} />
            ))}
          </div>

          {/* Glow externo quando quase cheio */}
          {rawProgress > 0.75 && (
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{
              boxShadow: `0 0 10px 2px rgba(${glowColor},0.45)`,
              animation: 'bar-glow-pulse 1.6s ease-in-out infinite',
            }} />
          )}
        </div>

        {/* Contador */}
        <p className="text-[8px] text-white/20 mt-1.5 font-mono tabular-nums select-none">
          {isDone ? '✓' : `${interactionCount}/${maxInteractions}`}
        </p>
      </div>
    </>
  )
}
