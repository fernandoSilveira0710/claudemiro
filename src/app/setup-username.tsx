'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { ClaudemiroBot } from '@/components/claudemiro-bot'

export function SetupUsername() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Matrix background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}[]|/\\!@#$%&*()_+-=<>'.split('')
    const fontSize = 10
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = Array(columns).fill(1)
    const draw = () => {
      ctx.fillStyle = 'rgba(13, 2, 33, 0.03)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(168, 85, 247, 0.06)'
      ctx.font = `${fontSize}px monospace`
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
    }
    const interval = setInterval(draw, 50)
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', handleResize)
    return () => { clearInterval(interval); window.removeEventListener('resize', handleResize) }
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim().toLowerCase() }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-30 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 glass-card max-w-md mx-4 p-8 text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="relative mx-auto w-28 h-28 flex items-center justify-center claude-bot-glow"
        >
          <ClaudemiroBot />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Claudemiro te achou
          </h1>
          <p className="text-[#F3E8FF]/50 text-sm">
            Escolha seu @ — seu perfil será{' '}
            <span className="text-purple-400 font-bold">claudemiro.app/@{username || 'seunome'}</span>
          </p>
        </div>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F3E8FF]/30 text-lg font-bold">@</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seunome"
            className="pl-10 text-xl text-center bg-white/[0.03] border-white/[0.06] text-white h-14 rounded-2xl focus:ring-purple-500/30"
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={!username || loading}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)] transition-all"
        >
          {loading ? 'Salvando...' : 'Continuar →'}
        </Button>
      </motion.div>
    </div>
  )
}
