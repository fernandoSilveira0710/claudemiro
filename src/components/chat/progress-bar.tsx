'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface ProgressBarProps {
  interactionCount: number
  maxInteractions?: number
  isDone?: boolean
}

// Partícula de água caindo
function WaterParticle({ progress, index }: { progress: number; index: number }) {
  const [active, setActive] = useState(false)
  const [pos, setPos] = useState({ top: 0, size: 0, opacity: 0 })

  useEffect(() => {
    if (progress < 0.05) return
    const delay = (index * 400 + Math.random() * 800)
    const t = setTimeout(() => {
      setPos({
        top: Math.random() * (100 - progress * 100),
        size: 2 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.5,
      })
      setActive(true)
    }, delay)
    return () => clearTimeout(t)
  }, [progress, index])

  if (!active) return null

  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 rounded-full bg-cyan-300/70"
      style={{
        top: `${pos.top}%`,
        width: pos.size,
        height: pos.size * 1.6,
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: [0, pos.opacity, 0], y: [0, 12, 24] }}
      transition={{ duration: 1.2 + Math.random() * 0.8, repeat: Infinity, delay: Math.random() * 2 }}
    />
  )
}

// Bolha subindo na água
function Bubble({ progress, index }: { progress: number; index: number }) {
  const fillPercent = progress * 100

  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 rounded-full border border-cyan-300/40 bg-white/5"
      style={{
        bottom: `${Math.random() * fillPercent * 0.8}%`,
        width: 3 + index * 0.5,
        height: 3 + index * 0.5,
      }}
      initial={{ opacity: 0, y: 0 }}
      animate={{
        opacity: [0, 0.6, 0],
        y: [0, -(20 + index * 8)],
        scale: [0.5, 1, 0.8],
      }}
      transition={{
        duration: 2 + index * 0.4,
        repeat: Infinity,
        delay: index * 0.7 + Math.random() * 1.5,
        ease: 'easeOut',
      }}
    />
  )
}

export function ChatProgressBar({ interactionCount, maxInteractions = 10, isDone = false }: ProgressBarProps) {
  const rawProgress = isDone ? 1 : Math.min(interactionCount / maxInteractions, 1)
  const spring = useSpring(0, { stiffness: 40, damping: 20 })

  useEffect(() => {
    spring.set(rawProgress)
  }, [rawProgress, spring])

  // Cor muda conforme progresso: ciano → roxo → rosa
  const getColor = (p: number) => {
    if (p < 0.4) return { from: '#22D3EE', to: '#818CF8' }
    if (p < 0.75) return { from: '#818CF8', to: '#A855F7' }
    return { from: '#A855F7', to: '#EC4899' }
  }

  const colors = getColor(rawProgress)

  // Segmentos de marco (cada 20%)
  const milestones = [0.2, 0.4, 0.6, 0.8, 1.0]

  return (
    <div className="absolute right-3 top-6 bottom-6 w-3 z-10 flex flex-col items-center">

      {/* Trilho de fundo com textura */}
      <div className="relative flex-1 w-full">
        <div className="absolute inset-0 rounded-full bg-white/[0.04] overflow-hidden">

          {/* Água enchendo — animação suave */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-full overflow-hidden"
            style={{ height: useTransform(spring, v => `${v * 100}%`) }}
          >
            {/* Gradiente da água */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, ${colors.from}, ${colors.to})`,
                opacity: 0.9,
              }}
            />

            {/* Superfície da água — onda */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-3"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 70%)`,
              }}
              animate={{ scaleX: [0.8, 1.2, 0.8], y: [0, -1, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Brilho lateral */}
            <div
              className="absolute inset-y-0 left-0 w-1/3 rounded-l-full"
              style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.25), transparent)' }}
            />

            {/* Bolhas subindo */}
            {rawProgress > 0.1 && Array.from({ length: 5 }).map((_, i) => (
              <Bubble key={i} progress={rawProgress} index={i} />
            ))}
          </motion.div>

          {/* Gotículas caindo de cima quando não está cheio */}
          {rawProgress < 0.95 && rawProgress > 0 && Array.from({ length: 4 }).map((_, i) => (
            <WaterParticle key={i} progress={rawProgress} index={i} />
          ))}
        </div>

        {/* Marcadores de marco */}
        {milestones.map((m, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 flex items-center"
            style={{ bottom: `${m * 100}%` }}
          >
            <motion.div
              className="h-px w-full"
              style={{
                background: rawProgress >= m
                  ? 'rgba(255,255,255,0.5)'
                  : 'rgba(255,255,255,0.08)',
              }}
              animate={rawProgress >= m ? { opacity: [0.3, 0.8, 0.3] } : { opacity: 0.08 }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          </div>
        ))}

        {/* Glow externo quando cheio ou quase */}
        {rawProgress > 0.8 && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 12px 3px ${colors.to}60`,
            }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Contador embaixo */}
      <motion.p
        className="text-[8px] text-white/20 mt-1.5 font-mono tabular-nums"
        animate={isDone ? { color: ['rgba(255,255,255,0.2)', 'rgba(168,85,247,0.8)', 'rgba(255,255,255,0.2)'] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isDone ? '✓' : `${interactionCount}/${maxInteractions}`}
      </motion.p>
    </div>
  )
}
