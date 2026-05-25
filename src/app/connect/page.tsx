'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const PLATFORMS = [
  { id: 'spotify', name: 'Spotify', icon: '🎵', color: 'from-green-500 to-green-600', bg: 'bg-green-500/10', oauth: true },
  { id: 'steam', name: 'Steam', icon: '🎮', color: 'from-blue-700 to-blue-900', bg: 'bg-blue-500/10', oauth: false },
  { id: 'discord', name: 'Discord', icon: '💬', color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-500/10', oauth: true },
  { id: 'twitch', name: 'Twitch', icon: '🎬', color: 'from-purple-600 to-purple-800', bg: 'bg-purple-500/10', oauth: true },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'from-red-500 to-red-600', bg: 'bg-red-500/10', oauth: true },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'from-pink-500 to-purple-500', bg: 'bg-pink-500/10', oauth: false },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-gray-700 to-black', bg: 'bg-gray-500/10', oauth: false },
  { id: 'x', name: 'X / Twitter', icon: '🐦', color: 'from-gray-600 to-gray-800', bg: 'bg-gray-500/10', oauth: false },
]

export default function ConnectPage() {
  const supabase = createClient()
  const [connections, setConnections] = useState<Map<string, any>>(new Map())
  const [steamId, setSteamId] = useState('')
  const [connecting, setConnecting] = useState('')
  const [showSteam, setShowSteam] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConnections()
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const error = params.get('error')

    if (success) {
      const names: Record<string, string> = { spotify: 'Spotify', discord: 'Discord', twitch: 'Twitch', youtube: 'YouTube', steam: 'Steam' }
      toast.success(`${names[success] || success} conectado!`, { description: 'Seus dados serão usados na análise.' })
      loadConnections()
    }
    if (error) {
      toast.error(`Erro na conexão (${error})`, { description: 'Verifique as credenciais no .env.local ou tente novamente.' })
    }
    if (success || error) {
      window.history.replaceState({}, '', '/connect')
    }
  }, [])

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('social_connections')
      .select('platform, raw_data, platform_username')
      .eq('user_id', user.id)

    const map = new Map()
    data?.forEach(c => map.set(c.platform, c))
    setConnections(map)
    setLoading(false)
  }

  const handleConnect = (platformId: string) => {
    if (platformId === 'spotify') {
      window.location.href = '/api/auth/spotify'
    } else if (platformId === 'discord') {
      window.location.href = '/api/auth/discord'
    } else if (platformId === 'twitch') {
      window.location.href = '/api/auth/twitch'
    } else if (platformId === 'youtube') {
      window.location.href = '/api/auth/youtube'
    } else if (platformId === 'steam') {
      setShowSteam(true)
    }
  }
  const handleSteamConnect = async () => {
    if (!steamId) return
    setConnecting('steam')
    const res = await fetch('/api/connect/steam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steamId }),
    })
    const data = await res.json()
    if (data.success) {
      setSteamId('')
      setShowSteam(false)
      loadConnections()
    }
    setConnecting('')
  }

  const connectedCount = connections.size

  // Matrix background
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
    <div className="min-h-screen bg-[#0D0221] text-white">
      {/* Matrix */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-25 pointer-events-none" />

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-purple-600/8 rounded-full blur-[100px]" />
      </div>

      <header className="relative border-b border-white/[0.06] p-4 flex items-center justify-between">
        <a href="/" className="text-xl font-black tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          CLAUDEMIRO
        </a>
        <a href="/" className="text-[#F3E8FF]/30 hover:text-white text-sm transition">
          ← Voltar
        </a>
      </header>

      <div className="relative max-w-2xl mx-auto p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1
            className="text-3xl sm:text-4xl font-black text-white"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Conecte suas redes
          </h1>
          <p className="text-[#F3E8FF]/50 mt-2 text-sm">
            Quanto mais redes, mais preciso o Claudemiro. Mínimo 1.
          </p>
          {connectedCount > 0 && (
            <p className="text-purple-400 text-sm mt-2 font-medium">
              {connectedCount}/7 redes conectadas
            </p>
          )}
        </motion.div>

        {/* Steam modal */}
        {showSteam && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 mb-6 flex gap-3 items-center"
          >
            <span className="text-2xl">🎮</span>
            <Input
              value={steamId}
              onChange={e => setSteamId(e.target.value)}
              placeholder="Steam ID ou URL do perfil"
              className="bg-white/[0.03] border-white/[0.06] text-white text-sm h-10 rounded-xl flex-1"
              onKeyDown={e => e.key === 'Enter' && handleSteamConnect()}
              autoFocus
            />
            <button
              onClick={handleSteamConnect}
              disabled={!steamId || connecting === 'steam'}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-white/[0.05] text-white text-sm font-bold px-4 h-10 rounded-xl transition"
            >
              {connecting === 'steam' ? '...' : 'OK'}
            </button>
            <button onClick={() => setShowSteam(false)} className="text-[#F3E8FF]/30 hover:text-white text-sm">
              ✕
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PLATFORMS.map((p, i) => {
            const connected = connections.has(p.id)
            const conn = connections.get(p.id)

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card p-4 transition-all ${
                  connected ? 'border-green-500/20' : 'hover:border-white/[0.10]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center text-xl`}>
                      {p.icon}
                    </div>
                    <span className="font-semibold text-sm">{p.name}</span>
                  </div>
                  {connected ? (
                    <span className="text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full font-medium">
                      ✓ Conectado
                    </span>
                  ) : (
                    <span className="text-xs text-[#F3E8FF]/20">Não conectado</span>
                  )}
                </div>

                {connected && (
                  <div className="text-xs text-[#F3E8FF]/25 space-y-0.5 mb-2">
                    {conn.platform_username && <p>👤 {conn.platform_username}</p>}
                    {p.id === 'steam' && conn.raw_data?.games && (
                      <p>🎮 {conn.raw_data.games.length} jogos · {Math.round(conn.raw_data.games.reduce((s: number, g: any) => s + (g.playtime_forever || 0), 0) / 60)}h totais</p>
                    )}
                  </div>
                )}

                {!connected && (p.oauth ? (
                  <button
                    onClick={() => handleConnect(p.id)}
                    className={`w-full bg-gradient-to-r ${p.color} hover:opacity-90 text-white text-sm font-bold py-2.5 rounded-xl transition`}
                  >
                    Conectar {p.name}
                  </button>
                ) : p.id === 'steam' ? (
                  <button
                    onClick={() => setShowSteam(true)}
                    className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-bold py-2.5 rounded-xl transition"
                  >
                    Conectar Steam
                  </button>
                ) : (
                  <button className="w-full bg-white/[0.02] text-[#F3E8FF]/15 text-sm font-medium py-2.5 rounded-xl cursor-not-allowed">
                    Em breve
                  </button>
                ))}
              </motion.div>
            )
          })}
        </div>

        {connectedCount >= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-8">
            <a
              href="/chat"
              className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)]"
            >
              🧿 Falar com Claudemiro
            </a>
          </motion.div>
        )}
      </div>
    </div>
  )
}
