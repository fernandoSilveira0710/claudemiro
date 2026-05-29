'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AtmosphereProps {
  interactionCount: number
  maxInteractions?: number
  isDone?: boolean
  mode?: string
}

// Partícula flutuante de fundo
function FloatingOrb({ progress, index, mode }: { progress: number; index: number; mode: string }) {
  const baseColors: Record<string, string[]> = {
    engracado: ['#EC4899', '#F97316', '#A855F7'],
    casual:    ['#22D3EE', '#818CF8', '#34D399'],
    profissional: ['#818CF8', '#6366F1', '#8B5CF6'],
  }
  const colors = baseColors[mode] || baseColors.casual
  const color = colors[index % colors.length]

  const x = 15 + (index * 23) % 70
  const y = 10 + (index * 17) % 80
  const size = 80 + (index * 31) % 200
  const opacity = 0.03 + progress * 0.09

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}88 0%, transparent 70%)`,
        filter: 'blur(40px)',
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: [opacity * 0.6, opacity, opacity * 0.6],
        scale: [0.9, 1.1, 0.9],
        x: [0, (index % 2 === 0 ? 20 : -20), 0],
        y: [0, (index % 3 === 0 ? -15 : 15), 0],
      }}
      transition={{
        duration: 4 + index * 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: index * 0.8,
      }}
    />
  )
}

// Linha scan que aparece nos finais
function ScanLine({ progress }: { progress: number }) {
  if (progress < 0.6) return null
  const intensity = (progress - 0.6) / 0.4

  return (
    <motion.div
      className="absolute inset-x-0 h-px pointer-events-none"
      style={{
        background: `linear-gradient(to right, transparent, rgba(168,85,247,${intensity * 0.4}), rgba(236,72,153,${intensity * 0.3}), transparent)`,
        top: '30%',
      }}
      animate={{ top: ['15%', '85%', '15%'] }}
      transition={{ duration: 8 - intensity * 3, repeat: Infinity, ease: 'linear' }}
    />
  )
}

// Partículas de pixel que voam quando quase no final
function PixelBurst({ progress }: { progress: number }) {
  if (progress < 0.8) return null
  const count = Math.floor((progress - 0.8) / 0.2 * 12)

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-sm pointer-events-none"
          style={{
            left: `${10 + (i * 9) % 80}%`,
            top: `${5 + (i * 13) % 90}%`,
            background: i % 2 === 0 ? '#A855F7' : '#EC4899',
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0, 1.5, 0],
            x: [(i % 3 - 1) * 20, (i % 3 - 1) * 60],
            y: [0, -30 - i * 4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  )
}

// Ruído de fundo (vinheta pulsante nas bordas)
function EdgeVignette({ progress }: { progress: number }) {
  const intensity = progress * 0.4

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(13,2,33,${intensity}) 100%)`,
      }}
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 3 + (1 - progress) * 4, repeat: Infinity }}
    />
  )
}

// Frases flutuantes que reagem ao progresso
const PHASE_FRAGMENTS = [
  { min: 0.0, max: 0.25, texts: ['analisando...', 'varrendo dados...', 'hmm...'] },
  { min: 0.25, max: 0.5, texts: ['interessante...', 'padrão detectado', 'continua...'] },
  { min: 0.5, max: 0.75, texts: ['ta tomando forma', 'já sei quem é', 'quase...'] },
  { min: 0.75, max: 1.0, texts: ['definitivo', 'tenho certeza', 'pronto para julgar'] },
]

function PhaseFragment({ progress, trigger }: { progress: number; trigger: number }) {
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const phase = PHASE_FRAGMENTS.find(p => progress >= p.min && progress < p.max)
      || PHASE_FRAGMENTS[PHASE_FRAGMENTS.length - 1]
    const t = phase.texts[Math.floor(Math.random() * phase.texts.length)]
    setText(t)
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(timer)
  }, [trigger])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-0 hidden lg:block"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 0.25, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.5 }}
        >
          <span className="font-mono text-[10px] text-purple-400/80 tracking-widest uppercase">
            {text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ChatAtmosphere({ interactionCount, maxInteractions = 10, isDone = false, mode = 'engracado' }: AtmosphereProps) {
  const progress = isDone ? 1 : Math.min(interactionCount / maxInteractions, 1)
  const [fragmentTrigger, setFragmentTrigger] = useState(0)
  const prevCount = useRef(interactionCount)

  // Dispara fragmento a cada nova interação
  useEffect(() => {
    if (interactionCount !== prevCount.current) {
      prevCount.current = interactionCount
      setFragmentTrigger(t => t + 1)
    }
  }, [interactionCount])

  // Quantos orbs mostrar baseado no progresso
  const orbCount = Math.floor(2 + progress * 6)

  return (
    <>
      {/* Orbs de fundo — ficam mais intensos conforme avança */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {Array.from({ length: orbCount }).map((_, i) => (
          <FloatingOrb key={i} progress={progress} index={i} mode={mode} />
        ))}

        {/* Linha scan */}
        <ScanLine progress={progress} />

        {/* Pixel burst no final */}
        <PixelBurst progress={progress} />

        {/* Vinheta de borda */}
        <EdgeVignette progress={progress} />

        {/* Grade sutil que aparece no final */}
        {progress > 0.7 && (
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: (progress - 0.7) / 0.3 }}
          />
        )}
      </div>

      {/* Fragmento de texto flutuante */}
      <PhaseFragment progress={progress} trigger={fragmentTrigger} />
    </>
  )
}
