'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AtmosphereProps {
  interactionCount: number
  maxInteractions?: number
  isDone?: boolean
  mode?: string
}

const MODE_PALETTES: Record<string, string[]> = {
  engracado:    ['168,85,247', '236,72,153', '249,115,22'],
  casual:       ['34,211,238', '129,140,248', '52,211,153'],
  profissional: ['99,102,241', '139,92,246', '79,70,229'],
}

const PHASE_TEXTS = [
  { min: 0.00, texts: ['varrendo dados...', 'analisando...', 'hmm...'] },
  { min: 0.25, texts: ['padrão detectado', 'interessante...', 'continua...'] },
  { min: 0.50, texts: ['já sei quem é', 'tá tomando forma', 'quase lá...'] },
  { min: 0.75, texts: ['tenho certeza', 'pronto pra julgar', 'definitivo'] },
]

export function ChatAtmosphere({
  interactionCount, maxInteractions = 10, isDone = false, mode = 'engracado'
}: AtmosphereProps) {
  const progress = isDone ? 1 : Math.min(interactionCount / maxInteractions, 1)
  const [fragmentText, setFragmentText] = useState('')
  const [fragmentVisible, setFragmentVisible] = useState(false)
  const prevCount = useRef(interactionCount)
  const palette = MODE_PALETTES[mode] || MODE_PALETTES.engracado

  // Dispara frase a cada nova mensagem
  useEffect(() => {
    if (interactionCount === prevCount.current) return
    prevCount.current = interactionCount

    const phase = [...PHASE_TEXTS].reverse().find(p => progress >= p.min) || PHASE_TEXTS[0]
    const t = phase.texts[Math.floor(Math.random() * phase.texts.length)]
    setFragmentText(t)
    setFragmentVisible(true)
    const timer = setTimeout(() => setFragmentVisible(false), 2800)
    return () => clearTimeout(timer)
  }, [interactionCount, progress])

  // Quantos orbs mostrar (2 no início, 7 no fim)
  const orbCount = Math.round(2 + progress * 5)

  return (
    <>
      {/* Container fixo cobrindo a tela inteira, atrás de tudo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>

        {/* Orbs de cor que crescem com o progresso */}
        {Array.from({ length: orbCount }).map((_, i) => {
          const color = palette[i % palette.length]
          const x = [8, 85, 15, 75, 45, 5, 90][i] ?? (10 + i * 15)
          const y = [12, 20, 55, 70, 35, 82, 48][i] ?? (10 + i * 12)
          const size = [260, 200, 300, 180, 240, 220, 190][i] ?? 200
          const opacity = 0.04 + progress * 0.10
          const duration = [5, 7, 6, 8, 5.5, 7.5, 6.5][i] ?? 6
          const delay = i * 0.9

          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                background: `radial-gradient(circle, rgba(${color},0.85) 0%, transparent 70%)`,
                filter: 'blur(50px)',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{
                opacity: [opacity * 0.5, opacity, opacity * 0.5],
                scale: [0.85, 1.12, 0.85],
                x: [0, i % 2 === 0 ? 18 : -18, 0],
                y: [0, i % 3 === 0 ? -14 : 14, 0],
              }}
              transition={{
                duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay,
              }}
            />
          )
        })}

        {/* Linha scan — aparece a partir de 55% */}
        {progress > 0.55 && (
          <motion.div
            className="absolute inset-x-0 h-px"
            style={{
              background: `linear-gradient(to right, transparent 0%, rgba(${palette[0]},${(progress - 0.55) * 0.6}) 30%, rgba(${palette[1]},${(progress - 0.55) * 0.5}) 70%, transparent 100%)`,
            }}
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{
              duration: 9 - progress * 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}

        {/* Grade fantasma — aparece a partir de 65% */}
        {progress > 0.65 && (
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(${palette[0]},0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(${palette[0]},0.04) 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: Math.min((progress - 0.65) / 0.35, 1) }}
          />
        )}

        {/* Partículas pixel — a partir de 80% */}
        {progress > 0.8 && Array.from({ length: Math.floor((progress - 0.8) / 0.2 * 10) }).map((_, i) => (
          <motion.div
            key={`px-${i}`}
            className="absolute w-1 h-1 rounded-sm"
            style={{
              left: `${8 + (i * 11) % 84}%`,
              top: `${8 + (i * 17) % 84}%`,
              background: `rgba(${palette[i % 2]},0.9)`,
            }}
            animate={{
              opacity: [0, 0.9, 0],
              scale: [0, 1.8, 0],
              y: [0, -(25 + i * 5)],
              x: [(i % 3 - 1) * 15, (i % 3 - 1) * 40],
            }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.28, ease: 'easeOut' }}
          />
        ))}

        {/* Vinheta pulsante nas bordas */}
        <motion.div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse at center, transparent 35%, rgba(13,2,33,${progress * 0.45}) 100%)` }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4 - progress * 2, repeat: Infinity }}
        />
      </div>

      {/* Fragmento de texto flutuante */}
      <AnimatePresence>
        {fragmentVisible && (
          <motion.div
            className="fixed bottom-28 left-1/2 -translate-x-1/2 pointer-events-none hidden lg:block"
            style={{ zIndex: 1 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.3, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45 }}
          >
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase" style={{ color: `rgba(${palette[0]},0.9)` }}>
              {fragmentText}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
