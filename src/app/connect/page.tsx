'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const SVG_PATHS: Record<string, string> = {
  spotify: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
  steam: 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z',
  discord: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
  twitch: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  instagram: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  x: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
}

const COLORS: Record<string, string> = {
  spotify: '#1DB954', steam: '#1B2838', discord: '#5865F2', twitch: '#9146FF',
  youtube: '#FF0000', instagram: '#E4405F', tiktok: '#FFFFFF', x: '#FFFFFF',
}

const PLATFORMS = [
  { id: 'spotify', name: 'Spotify', bg: 'bg-green-500/10', oauth: true },
  { id: 'steam', name: 'Steam', bg: 'bg-blue-500/10', oauth: false },
  { id: 'discord', name: 'Discord', bg: 'bg-indigo-500/10', oauth: true },
  { id: 'twitch', name: 'Twitch', bg: 'bg-purple-500/10', oauth: true },
  { id: 'youtube', name: 'YouTube', bg: 'bg-red-500/10', oauth: true },
  { id: 'instagram', name: 'Instagram', bg: 'bg-pink-500/10', oauth: false },
  { id: 'tiktok', name: 'TikTok', bg: 'bg-gray-500/10', oauth: false },
  { id: 'x', name: 'X / Twitter', bg: 'bg-gray-500/10', oauth: false },
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
      toast.error(`Erro na conexão (${error})`, { description: 'Verifique as credenciais ou tente novamente.' })
    }
    if (success || error) window.history.replaceState({}, '', '/connect')
  }, [])

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('social_connections').select('platform, raw_data, platform_username').eq('user_id', user.id)
    const map = new Map()
    data?.forEach(c => map.set(c.platform, c))
    setConnections(map)
    setLoading(false)
  }

  const handleConnect = (platformId: string) => {
    if (platformId === 'spotify') window.location.href = '/api/auth/spotify'
    else if (platformId === 'discord') window.location.href = '/api/auth/discord'
    else if (platformId === 'twitch') window.location.href = '/api/auth/twitch'
    else if (platformId === 'youtube') window.location.href = '/api/auth/youtube'
    else if (platformId === 'steam') setShowSteam(true)
  }

  const handleDisconnect = async (platformId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('social_connections').delete().eq('user_id', user.id).eq('platform', platformId)
    loadConnections()
    toast.success('Desconectado!')
  }

  const handleSteamConnect = async () => {
    if (!steamId) return
    setConnecting('steam')
    const res = await fetch('/api/connect/steam', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ steamId }) })
    const data = await res.json()
    if (data.success) { setSteamId(''); setShowSteam(false); loadConnections() }
    else toast.error('Steam ID não encontrado')
    setConnecting('')
  }

  const connectedCount = connections.size

  return (
    <div className="min-h-screen bg-[#0D0221] text-white">
      <canvas ref={useRef<HTMLCanvasElement>(null)} className="absolute inset-0 z-0 opacity-25 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-purple-600/8 rounded-full blur-[100px]" />
      </div>

      <header className="relative border-b border-white/[0.06] p-4 flex items-center justify-between">
        <a href="/" className="text-xl font-black tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>CLAUDEMIRO</a>
        <a href="/" className="text-[#F3E8FF]/30 hover:text-white text-sm transition">← Voltar</a>
      </header>

      <div className="relative max-w-2xl mx-auto p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Conecte suas redes</h1>
          <p className="text-[#F3E8FF]/50 mt-2 text-sm">Quanto mais redes, mais preciso o Claudemiro.</p>
          {connectedCount > 0 && <p className="text-purple-400 text-sm mt-2 font-medium">{connectedCount}/8 redes conectadas</p>}
        </motion.div>

        {showSteam && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 mb-6 flex gap-3 items-center">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#1B2838"><path d={SVG_PATHS.steam}/></svg>
            <Input value={steamId} onChange={e => setSteamId(e.target.value)} placeholder="Steam ID ou URL do perfil" className="bg-white/[0.03] border-white/[0.06] text-white text-sm h-10 rounded-xl flex-1" onKeyDown={e => e.key === 'Enter' && handleSteamConnect()} autoFocus />
            <button onClick={handleSteamConnect} disabled={!steamId || connecting === 'steam'} className="bg-blue-600 hover:bg-blue-500 disabled:bg-white/[0.05] text-white text-sm font-bold px-4 h-10 rounded-xl transition">{connecting === 'steam' ? '...' : 'OK'}</button>
            <button onClick={() => setShowSteam(false)} className="text-[#F3E8FF]/30 hover:text-white text-sm">✕</button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PLATFORMS.map((p, i) => {
            const connected = connections.has(p.id)
            const conn = connections.get(p.id)
            const svgPath = SVG_PATHS[p.id]
            const brandColor = COLORS[p.id] || '#A855F7'

            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`glass-card p-4 transition-all ${connected ? 'border-green-500/20' : 'hover:border-white/[0.10]'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center`}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={brandColor}><path d={svgPath}/></svg>
                    </div>
                    <span className="font-semibold text-sm">{p.name}</span>
                  </div>
                  {connected ? (
                    <span className="text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full font-medium">✓ Conectado</span>
                  ) : (
                    <span className="text-xs text-[#F3E8FF]/20">Não conectado</span>
                  )}
                </div>

                {connected && (
                  <div className="text-xs text-[#F3E8FF]/25 space-y-0.5 mb-2">
                    {conn.platform_username && <p>👤 {conn.platform_username}</p>}
                    {p.id === 'steam' && conn.raw_data?.games && (
                      <p>🎮 {conn.raw_data.games.length} jogos · {Math.round(conn.raw_data.games.reduce((s: number, g: any) => s + (g.playtime_forever || 0), 0) / 60)}h</p>
                    )}
                    {p.id === 'discord' && conn.raw_data?.guilds && (
                      <p>💬 {conn.raw_data.guilds.length} servidores</p>
                    )}
                    {p.id === 'twitch' && conn.raw_data?.follows && (
                      <p>📺 {conn.raw_data.follows.length} canais seguidos</p>
                    )}
                  </div>
                )}

                {connected ? (
                  <button onClick={() => handleDisconnect(p.id)} className="text-xs text-red-400/50 hover:text-red-400 transition mt-1">Desconectar</button>
                ) : p.oauth ? (
                  <button onClick={() => handleConnect(p.id)} className={`w-full bg-gradient-to-r ${p.id === 'spotify' ? 'from-green-500 to-green-600' : p.id === 'discord' ? 'from-indigo-500 to-indigo-600' : p.id === 'twitch' ? 'from-purple-600 to-purple-800' : 'from-red-500 to-red-600'} hover:opacity-90 text-white text-sm font-bold py-2.5 rounded-xl transition`}>
                    Conectar {p.name}
                  </button>
                ) : p.id === 'steam' ? (
                  <button onClick={() => setShowSteam(true)} className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-bold py-2.5 rounded-xl transition">Conectar Steam</button>
                ) : (
                  <button className="w-full bg-white/[0.02] text-[#F3E8FF]/15 text-sm font-medium py-2.5 rounded-xl cursor-not-allowed">Em breve</button>
                )}
              </motion.div>
            )
          })}
        </div>

        {connectedCount >= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-8">
            <a href="/chat" className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.35)]">
              🧿 Falar com Claudemiro
            </a>
          </motion.div>
        )}
      </div>
    </div>
  )
}
