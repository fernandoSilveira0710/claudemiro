'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export function SetupUsername() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim().toLowerCase() }),
    })

    const data = await res.json()
    if (data.error) {
      setError(data.error)
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 max-w-md px-4"
      >
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-3xl font-black text-white">
          Claudemiro te achou
        </h1>
        <p className="text-white/60">
          Escolha seu @username. Seu perfil será{' '}
          <span className="text-purple-400 font-bold">claudemiro.app/@{username || 'seunome'}</span>
        </p>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">@</span>
          <Input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="seunome"
            className="pl-10 text-xl text-center bg-white/5 border-white/10 text-white h-14 rounded-xl"
            maxLength={30}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!username || loading}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-4 rounded-xl"
        >
          {loading ? 'Salvando...' : 'Continuar'}
        </Button>
      </motion.div>
    </div>
  )
}
