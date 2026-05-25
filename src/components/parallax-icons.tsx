'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const ELEMENTS = [
  { emoji: '🔮', x: '8%', y: '18%', speed: 0.03 },
  { emoji: '👁️', x: '88%', y: '22%', speed: 0.05 },
  { emoji: '💜', x: '12%', y: '70%', speed: 0.02 },
  { emoji: '✨', x: '82%', y: '68%', speed: 0.04 },
  { emoji: '🎯', x: '45%', y: '85%', speed: 0.03 },
  { emoji: '🃏', x: '5%', y: '48%', speed: 0.04 },
  { emoji: '🎮', x: '92%', y: '45%', speed: 0.025 },
  { emoji: '💀', x: '55%', y: '12%', speed: 0.035 },
]

export function ParallaxIcons() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2

      const children = container.children
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement
        const speed = parseFloat(el.dataset.speed || '0.03')
        el.style.transform = `translate(${x * speed * 60}px, ${y * speed * 60}px)`
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {ELEMENTS.map((el, i) => (
        <motion.div
          key={i}
          data-speed={el.speed}
          className="absolute text-xl sm:text-2xl opacity-20"
          style={{ left: el.x, top: el.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.08, 1], y: [0, -10, 0] }}
          transition={{
            delay: i * 0.3,
            duration: 3 + i * 0.7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {el.emoji}
        </motion.div>
      ))}
    </div>
  )
}
