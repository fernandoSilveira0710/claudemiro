'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const VEREDICTS = [
  { user: '@anajuuh', text: '70% das músicas são de corno e teu feed parece encarte de supermercado de 98. Nota 2/10.' },
  { user: '@_pedroca', text: 'Tu joga Valorant 12h por dia e ainda é prata. Parabéns pela persistência.' },
  { user: '@maria.clara', text: 'Teu algoritmo do TikTok acha que tu tem 14 anos e gosta de dança. E tá certo.' },
  { user: '@lucaszx', text: 'Nerdola nível hard. 847h de Steam esse ano. Mas pelo menos não é LoL.' },
  { user: '@bruno_fit', text: 'Posta foto na academia mas o Spotify diz que tu só ouve modão. Ficha caiu.' },
  { user: '@gabszn', text: 'Tu disse que lê livros mas teu YouTube é 100% react de react. Se decide.' },
  { user: '@carlaprado', text: 'Seguindo 2k de pessoas e 1.8k são loja de roupa. Consumista premium.' },
  { user: '@vitorhugo_', text: 'Retweetou política 47x essa semana. Tá bem? Quer um abraço?' },
  { user: '@lezinha', text: 'Playlist pública chamada "foco" com Lo-Fi e usuária de Twitter 8h/dia. Foco onde?' },
  { user: '@_rick', text: 'Teu Discord tem 34 servidores. Tu não conversa em nenhum. Só acumula.' },
]

const POSITIONS = [
  'top-[8%] right-[12%]',
  'top-[18%] left-[8%]',
  'top-[32%] right-[6%]',
  'top-[48%] left-[12%]',
  'top-[55%] right-[14%]',
  'top-[68%] left-[6%]',
  'top-[78%] right-[10%]',
  'top-[22%] left-[22%]',
  'top-[42%] right-[20%]',
  'top-[60%] left-[18%]',
]

export function FloatingVeredicts() {
  const [visible, setVisible] = useState<number[]>([])

  useEffect(() => {
    const show = () => {
      setVisible([])
      VEREDICTS.forEach((_, i) => {
        setTimeout(() => setVisible(prev => [...prev, i]), i * 1200)
      })
    }

    show()
    const interval = setInterval(show, 18000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {VEREDICTS.map((v, i) => (
        <AnimatePresence key={i}>
          {visible.includes(i) && (
            <motion.div
              initial={{ opacity: 0, x: i % 3 === 0 ? -30 : i % 3 === 1 ? 30 : -20, y: 10, scale: 0.9 }}
              animate={{ opacity: 0.65, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`fixed ${POSITIONS[i]} z-0 hidden lg:block pointer-events-none max-w-[190px]`}
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
