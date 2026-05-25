'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const VEREDICTS = [
  { user: '@anajuuh', text: '70% das músicas são de corno e teu feed parece encarte de supermercado de 98. Nota 2/10.' },
  { user: '@_pedroca', text: 'Tu joga Valorant 12h por dia e ainda é prata. Parabéns pela persistência.' },
  { user: '@maria.clara', text: 'Teu algoritmo do TikTok acha que tu tem 14 anos e gosta de dança. E tá certo.' },
  { user: '@lucaszx', text: 'Nerdola nível hard. 847h de Steam esse ano. Mas pelo menos não é LoL.' },
  { user: '@bruno_fit', text: 'Posta foto na academia mas o Spotify diz que tu só ouve modão. Ficha caiu.' },
]

export function FloatingVeredicts() {
  const [visible, setVisible] = useState<number[]>([])

  useEffect(() => {
    // Mostrar cards em sequência com intervalos
    const timers = VEREDICTS.map((_, i) =>
      setTimeout(() => setVisible(prev => [...prev, i]), 2000 + i * 4000)
    )

    // Reciclar: esconder e mostrar de novo
    const recycleInterval = setInterval(() => {
      setVisible([])
      VEREDICTS.forEach((_, i) => {
        setTimeout(() => setVisible(prev => [...prev, i]), i * 1500)
      })
    }, 22000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(recycleInterval)
    }
  }, [])

  const positions = [
    'right-8 top-24',
    'left-8 top-44',
    'right-10 top-[55%]',
    'left-10 top-[68%]',
    'right-12 top-[42%]',
  ]

  return (
    <>
      {VEREDICTS.map((v, i) => (
        <AnimatePresence key={i}>
          {visible.includes(i) && (
            <motion.div
              initial={{ opacity: 0, x: i % 2 === 0 ? 40 : -40, scale: 0.9 }}
              animate={{ opacity: 0.6, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`fixed ${positions[i]} z-0 hidden lg:block pointer-events-none max-w-[200px]`}
            >
              <div className="glass-card p-3 text-left bg-[#1A0A33]/80 border-purple-500/15 animate-veredict-float">
                <p className="text-purple-400 text-xs font-bold mb-1">{v.user}</p>
                <p className="text-[#F3E8FF]/65 text-[10px] leading-relaxed italic">
                  &ldquo;{v.text}&rdquo;
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ))}
    </>
  )
}
