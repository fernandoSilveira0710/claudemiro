'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

const PLATFORMS = [
  { id: 'spotify', name: 'Spotify', icon: '🎵', color: 'from-green-500 to-green-700', oauth: true },
  { id: 'steam', name: 'Steam', icon: '🎮', color: 'from-blue-800 to-blue-950', oauth: false },
  { id: 'discord', name: 'Discord', icon: '💬', color: 'from-indigo-500 to-indigo-700', oauth: true },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'from-red-500 to-red-700', oauth: true },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'from-pink-500 to-purple-600', oauth: false },
  { id: 'tiktok', name: 'TikTok', icon: '🎬', color: 'from-gray-800 to-black', oauth: false },
  { id: 'x', name: 'X / Twitter', icon: '🐦', color: 'from-gray-700 to-gray-900', oauth: false },
]

export default function ConnectPage() {
  const supabase = createClient()
  const [connections, setConnections] = useState<Set<string>>(new Set())
  const [steamId, setSteamId] = useState('')
  const [connecting, setConnecting] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConnections()
    // Verificar query params de callback
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) {
      loadConnections()
      window.history.replaceState({}, '', '/connect')
    }
  }, [])

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('social_connections')
      .select('platform')
      .eq('user_id', user.id)

    setConnections(new Set(data?.map(c => c.platform) || []))
    setLoading(false)
  }

  const handleConnect = async (platformId: string) => {
    if (platformId === 'spotify') {
      window.location.href = '/api/auth/spotify'
    } else if (platformId === 'steam') {
      // Abre modal/dialog pra digitar Steam ID (já tratado no estado)
    }
    // Outras plataformas: placeholder
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
      loadConnections()
    }
    setConnecting('')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 p-4 flex items-center justify-between">
        <a href="/" className="text-2xl font-black">CLAUDEMIRO</a>
        <a href="/" className="text-white/50 hover:text-white text-sm">← Voltar</a>
      </header>

      <div className="max-w-2xl mx-auto p-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-black mb-2">Conecte suas redes</h1>
          <p className="text-white/50 mb-8">
            Quanto mais redes conectadas, mais preciso é o Claudemiro. Mínimo 2 para começar.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATFORMS.map((p, i) => {
            const connected = connections.has(p.id)

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border border-white/10 overflow-hidden ${
                  connected ? 'bg-white/5' : 'bg-white/[0.02]'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.icon}</span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    {connected ? (
                      <Badge className="bg-green-600/20 text-green-400 border-green-500/20">
                        ✓ Conectado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-white/30 border-white/10">
                        Não conectado
                      </Badge>
                    )}
                  </div>

                  {connected ? (
                    <p className="text-sm text-white/30">Conectado — dados sincronizados</p>
                  ) : p.id === 'steam' ? (
                    <div className="flex gap-2">
                      <Input
                        value={steamId}
                        onChange={e => setSteamId(e.target.value)}
                        placeholder="Steam ID ou URL do perfil"
                        className="bg-white/5 border-white/10 text-white text-sm h-9"
                        onKeyDown={e => e.key === 'Enter' && handleSteamConnect()}
                      />
                      <Button
                        size="sm"
                        onClick={handleSteamConnect}
                        disabled={!steamId || connecting === 'steam'}
                        className="bg-blue-800 hover:bg-blue-700 h-9"
                      >
                        {connecting === 'steam' ? '...' : 'OK'}
                      </Button>
                    </div>
                  ) : p.oauth ? (
                    <Button
                      onClick={() => handleConnect(p.id)}
                      className={`w-full bg-gradient-to-r ${p.color} hover:opacity-90 text-white`}
                    >
                      Conectar {p.name}
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="w-full bg-white/5 text-white/30 cursor-not-allowed"
                    >
                      Em breve
                    </Button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {connections.size >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-8"
          >
            <a
              href="/chat"
              className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition"
            >
              Falar com Claudemiro →
            </a>
          </motion.div>
        )}
      </div>
    </div>
  )
}
