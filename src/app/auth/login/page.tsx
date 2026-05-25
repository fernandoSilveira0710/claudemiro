'use client'

import { useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { ClaudemiroBot } from '@/components/claudemiro-bot'
import { ParallaxIcons } from '@/components/parallax-icons'
import { FloatingVeredicts } from '@/components/floating-veredicts'
import { StatusTerminal } from '@/components/status-terminal'
import { NetworkBadges } from '@/components/network-badges'

export default function LoginPage() {
  const supabase = createClient()
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

    ctx.fillStyle = 'rgba(13, 2, 33, 0.02)'

    const draw = () => {
      ctx.fillStyle = 'rgba(13, 2, 33, 0.03)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(168, 85, 247, 0.06)'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 50)
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0D0221]">
      {/* Matrix Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-30 pointer-events-none" />

      {/* Parallax icons */}
      <ParallaxIcons />

      {/* Floating veredicts */}
      <FloatingVeredicts />

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/8 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/3 rounded-full blur-[200px]" />
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass p-6 sm:p-10 text-center space-y-6 sm:space-y-8 max-w-full sm:max-w-md">
          {/* Robô */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative mx-auto w-28 h-28 flex items-center justify-center claude-bot-glow"
          >
            <ClaudemiroBot />
          </motion.div>

          {/* Título */}
          <div className="space-y-3">
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none text-center w-full"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              CLAUDEMIRO
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-[#F3E8FF]/50 max-w-xs mx-auto"
            >
              O oráculo que escaneia suas redes e revela quem
              <span className="text-purple-400 font-bold"> você é de verdade</span>
            </motion.p>
          </div>

          {/* Badges pulsantes com ícones SVG */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <NetworkBadges />
          </motion.div>

          {/* Botão */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/95 text-[#0D0221] font-extrabold py-4 rounded-2xl text-lg transition-all duration-200 shadow-[0_0_40px_rgba(168,85,247,0.25)] hover:shadow-[0_0_60px_rgba(168,85,247,0.4)]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </motion.button>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-[#F3E8FF]/25"
          >
            Ao entrar, você será <span className="text-purple-400/40">julgado implacavelmente</span>
          </motion.p>
        </div>
      </motion.div>

      {/* Status Terminal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="fixed bottom-4 left-4 z-20 hidden md:block"
      >
        <div className="glass-card p-3 text-[#F3E8FF]/40">
          <StatusTerminal />
        </div>
      </motion.div>

      {/* Bottom domain */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="fixed bottom-4 right-4 text-xs text-[#F3E8FF]/15 z-20 pointer-events-none"
      >
        claudemiro.app
      </motion.p>
    </div>
  )
}
