'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ClaudemiroBot } from '@/components/claudemiro-bot'

interface DashboardProps {
  profile: { username: string; display_name: string; plan: string }
  vereditsCount: number
  connectionsCount: number
}

export function DashboardPage({ profile, vereditsCount, connectionsCount }: DashboardProps) {
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

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

  return (
    <main className="min-h-screen bg-[#0D0221] text-white relative">
      {/* Matrix */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-25 pointer-events-none" />

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-[128px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-600/10 rounded-full blur-[128px]" />
      </div>

      <header className="relative z-10 border-b border-white/[0.06] p-4 flex items-center justify-between backdrop-blur-sm">
        <h1 className="text-xl font-black tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          CLAUDEMIRO
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-purple-500/15 text-purple-300 px-3 py-1 rounded-full font-medium">{profile.plan}</span>
          <span className="text-[#F3E8FF]/40 text-sm">@{profile.username}</span>
          <button onClick={handleLogout} className="text-[#F3E8FF]/20 hover:text-red-400 text-xs transition ml-2">Sair</button>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto p-8">
        <div className="text-center space-y-6 mb-12 pt-8">
          {/* Robô */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="relative mx-auto w-28 h-28 flex items-center justify-center claude-bot-glow"
          >
            <ClaudemiroBot />
          </motion.div>

          <h2
            className="text-4xl sm:text-5xl font-black text-white"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            E aí, {profile.display_name?.split(' ')[0]} 👋
          </h2>
          <p className="text-[#F3E8FF]/50 max-w-md mx-auto">
            {!vereditsCount
              ? 'Pronto pra descobrir o que suas redes revelam sobre você?'
              : 'Pronto pra mais um veredito? Claudemiro tá te esperando.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <a
              href="/connect"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.10] text-white font-semibold px-6 py-3 rounded-2xl transition-all"
            >
              🔌 {connectionsCount ? `${connectionsCount} redes conectadas` : 'Conectar Redes'}
            </a>
            <a
              href="/chat"
              className="inline-flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-3 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)] transition-all"
            >
              🧿 Falar com Claudemiro
            </a>
          </div>
        </div>

        {vereditsCount > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#F3E8FF]/60">Seus vereditos</h3>
            <p className="text-[#F3E8FF]/30 text-sm">
              {vereditsCount} veredito{vereditsCount > 1 ? 's' : ''} gerado{vereditsCount > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
