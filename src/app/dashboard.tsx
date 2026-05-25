'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { ClaudemiroBot } from '@/components/claudemiro-bot'
import { generateScanLines, getBotMood, getBotSpeech } from '@/lib/scan-lines'

interface DashboardProps {
  profile: { username: string; display_name: string; plan: string }
  vereditsCount: number
  connectionsCount: number
  connectionPlatforms: string[]
  connectionsData: { platform: string; data: any }[]
}

const PLATFORM_ICONS: Record<string, { path: string; color: string; name: string }> = {
  spotify: { path: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z', color: '#1DB954', name: 'Spotify' },
  steam: { path: 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z', color: '#1B2838', name: 'Steam' },
  discord: { path: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z', color: '#5865F2', name: 'Discord' },
  twitch: { path: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z', color: '#9146FF', name: 'Twitch' },
  youtube: { path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z', color: '#FF0000', name: 'YouTube' },
  instagram: { path: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839', color: '#E4405F', name: 'Instagram' },
  tiktok: { path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z', color: '#FFFFFF', name: 'TikTok' },
  x: { path: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z', color: '#FFFFFF', name: 'X' },
  github: { path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61', color: '#FFFFFF', name: 'GitHub' },
  reddit: { path: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z', color: '#FF4500', name: 'Reddit' },
}

export function DashboardPage({ profile, vereditsCount, connectionsCount, connectionPlatforms, connectionsData }: DashboardProps) {
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mood = getBotMood(connectionsCount)
  const speech = getBotSpeech(connectionsCount, vereditsCount)
  const [scanIndex, setScanIndex] = useState(0)

  // Gerar todas as linhas de scan
  const allScanLines = useMemo(() => {
    const lines: string[] = []
    connectionsData.forEach(({ platform, data }) => {
      const platformLines = generateScanLines(platform, data)
      platformLines.forEach(l => lines.push(`[${platform.toUpperCase()}] ${l}`))
    })
    if (lines.length === 0) lines.push('[CLAUDEMIRO] Aguardando conexões para iniciar varredura...')
    return lines
  }, [connectionsData])

  // Rotacionar linhas do terminal
  useEffect(() => {
    if (allScanLines.length === 0) return
    const interval = setInterval(() => {
      setScanIndex(prev => (prev + 1) % allScanLines.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [allScanLines])

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

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/auth/login' }

  return (
    <main className="min-h-screen bg-[#0D0221] text-white relative">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-25 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-[128px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-600/10 rounded-full blur-[128px]" />
      </div>

      {/* Header com mais padding */}
      <header className="relative z-10 border-b border-white/[0.06] px-6 py-4 flex items-center justify-between backdrop-blur-sm">
        <h1 className="text-xl font-black tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>CLAUDEMIRO</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-purple-500/15 text-purple-300 px-3 py-1 rounded-full font-medium">{profile.plan}</span>
          <span className="text-[#F3E8FF]/40 text-sm">@{profile.username}</span>
          <button onClick={handleLogout} className="text-[#F3E8FF]/20 hover:text-red-400 text-xs transition">Sair</button>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Robô + Órbita */}
        <div className="text-center space-y-3 mb-8">
          <div className="relative mx-auto w-64 h-64 flex items-center justify-center">
            {connectionPlatforms.length > 0 && (
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: `${mood.speed}s` }}>
                {connectionPlatforms.map((platform, i) => {
                  const icon = PLATFORM_ICONS[platform]
                  if (!icon) return null
                  const angle = (i / connectionPlatforms.length) * 360
                  const rad = (angle * Math.PI) / 180
                  const radius = 90
                  const x = Math.cos(rad) * radius
                  const y = Math.sin(rad) * radius
                  return (
                    <div key={platform} className="absolute w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.03] border border-white/[0.06]"
                      style={{ left: `calc(50% + ${x}px - 16px)`, top: `calc(50% + ${y}px - 16px)`, animation: `counter-spin ${mood.speed}s linear infinite` }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={icon.color}><path d={icon.path} /></svg>
                    </div>
                  )
                })}
              </div>
            )}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, y: [0, -4, 0] }}
              transition={{ scale: { type: 'spring', stiffness: 200 }, y: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
              className="relative z-10 w-28 h-28 flex items-center justify-center claude-bot-glow"
              style={{ transform: `scale(${mood.scale})` }}
            >
              <ClaudemiroBot />
            </motion.div>
          </div>

          {/* Balão de fala do Claudemiro */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative mx-auto max-w-xs"
          >
            <div className="glass-card px-4 py-2 text-sm text-[#F3E8FF]/70 italic">
              &ldquo;{speech}&rdquo;
            </div>
            <div className="w-3 h-3 bg-[#1A0A33]/80 border-b border-r border-white/[0.06] rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
          </motion.div>

          <h2 className="text-4xl sm:text-5xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            E aí, {profile.display_name?.split(' ')[0]} 👋
          </h2>
          <p className="text-[#F3E8FF]/60 text-base max-w-md mx-auto font-medium">
            {!vereditsCount ? 'Pronto pra descobrir o que suas redes revelam sobre você?' : 'Pronto pra mais um veredito? Claudemiro tá te esperando.'}
          </p>

          {/* Grade de redes conectadas */}
          {connectionsCount > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-center gap-2 pt-2">
              {connectionPlatforms.map(platform => {
                const icon = PLATFORM_ICONS[platform]
                if (!icon) return null
                return (
                  <span key={platform} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d={icon.path} /></svg>
                    {icon.name}
                    <span className="text-green-500/60 ml-0.5">✓</span>
                  </span>
                )
              })}
            </motion.div>
          )}

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a href="/connect" className="inline-flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.10] text-white font-semibold px-6 py-3 rounded-2xl transition-all">
              🔌 {connectionsCount ? `${connectionsCount} redes conectadas` : 'Conectar Redes'}
            </a>
            <a href="/chat" className="inline-flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-3 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)] transition-all">
              🧿 Falar com Claudemiro
            </a>
          </div>
        </div>

        {/* Terminal de varredura */}
        {allScanLines.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="glass-card p-4 max-w-lg mx-auto">
            <p className="text-[10px] text-[#F3E8FF]/25 font-mono uppercase tracking-wider mb-2">Terminal de Varredura</p>
            <div className="font-mono text-[11px] leading-relaxed text-[#F3E8FF]/35">
              {allScanLines.slice(scanIndex, scanIndex + 4).map((line, i) => (
                <motion.div key={`${scanIndex}-${i}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="terminal-line"
                >
                  {line}
                </motion.div>
              ))}
              <span className="terminal-cursor">_</span>
            </div>
          </motion.div>
        )}

        {/* Vereditos */}
        {vereditsCount > 0 && (
          <div className="space-y-4 mt-8 max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-[#F3E8FF]/60">Seus vereditos</h3>
            <p className="text-[#F3E8FF]/30 text-sm">{vereditsCount} veredito{vereditsCount > 1 ? 's' : ''} gerado{vereditsCount > 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes counter-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      `}</style>
    </main>
  )
}
