'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, ThumbsDown } from 'lucide-react'

interface ReactionButtonsProps {
  veredictId: string
  initialLikes?: number
  initialDislikes?: number
  disabled?: boolean
}

type Mine = 'like' | 'dislike' | null

export function ReactionButtons({ veredictId, initialLikes = 0, initialDislikes = 0, disabled = false }: ReactionButtonsProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [dislikes, setDislikes] = useState(initialDislikes)
  const [mine, setMine] = useState<Mine>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/reaction?veredictId=${veredictId}`)
      .then(r => r.json())
      .then(d => {
        if (!active) return
        setLikes(d.likes ?? 0)
        setDislikes(d.dislikes ?? 0)
        setMine(d.mine ?? null)
      })
      .catch(() => {})
    return () => { active = false }
  }, [veredictId])

  async function react(reaction: 'like' | 'dislike') {
    if (pending || disabled) return
    setPending(true)
    // otimista
    const prev = { likes, dislikes, mine }
    const next = optimistic(prev, reaction)
    setLikes(next.likes); setDislikes(next.dislikes); setMine(next.mine)
    try {
      const res = await fetch('/api/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ veredictId, reaction }),
      })
      const d = await res.json()
      if (res.ok) { setLikes(d.likes); setDislikes(d.dislikes); setMine(d.mine) }
      else { setLikes(prev.likes); setDislikes(prev.dislikes); setMine(prev.mine) }
    } catch {
      setLikes(prev.likes); setDislikes(prev.dislikes); setMine(prev.mine)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex items-center gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <motion.button
        whileTap={disabled ? {} : { scale: 0.85 }}
        onClick={() => react('like')}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${disabled ? 'cursor-not-allowed' : ''} ${
          mine === 'like'
            ? 'bg-[#EC4899]/20 border-[#EC4899]/50 text-[#EC4899]'
            : 'bg-white/[0.03] border-white/10 text-[#F3E8FF]/70 hover:bg-white/[0.06]'
        }`}
      >
        <Heart size={18} fill={mine === 'like' ? 'currentColor' : 'none'} />
        <span className="font-bold text-sm tabular-nums">{likes}</span>
      </motion.button>

      <motion.button
        whileTap={disabled ? {} : { scale: 0.85 }}
        onClick={() => react('dislike')}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${disabled ? 'cursor-not-allowed' : ''} ${
          mine === 'dislike'
            ? 'bg-white/10 border-white/30 text-white'
            : 'bg-white/[0.03] border-white/10 text-[#F3E8FF]/70 hover:bg-white/[0.06]'
        }`}
      >
        <ThumbsDown size={18} fill={mine === 'dislike' ? 'currentColor' : 'none'} />
        <span className="font-bold text-sm tabular-nums">{dislikes}</span>
      </motion.button>
      </div>
      {disabled && <span className="text-[#F3E8FF]/30 text-[11px]">Você não pode votar na própria criação</span>}
    </div>
  )
}

function optimistic(prev: { likes: number; dislikes: number; mine: Mine }, reaction: 'like' | 'dislike') {
  let { likes, dislikes, mine } = prev
  if (mine === reaction) {
    // toggle off
    if (reaction === 'like') likes--; else dislikes--
    mine = null
  } else {
    if (reaction === 'like') { likes++; if (mine === 'dislike') dislikes-- }
    else { dislikes++; if (mine === 'like') likes-- }
    mine = reaction
  }
  return { likes: Math.max(0, likes), dislikes: Math.max(0, dislikes), mine }
}
