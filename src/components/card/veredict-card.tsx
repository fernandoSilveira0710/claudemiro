'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface VeredictCardProps {
  veredict: {
    id: string
    veredict_badge: string
    veredict_text: string
    card_image_url?: string
    tags?: { name: string; emoji: string; percentage: number }[]
    niche?: string
    niche_colors?: { primary: string; secondary: string; accent: string }
    music_track?: { name: string; artist: string }
    political_stance?: { label: string; percentage_lula: number; percentage_bolsonaro: number }
    mode?: string
    profession_label?: string
    tips?: string[]
    profiles?: { username: string; display_name: string; avatar_url: string }
  }
}

export function VeredictCard({ veredict }: VeredictCardProps) {
  const [isPublic, setIsPublic] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [cardUrl, setCardUrl] = useState(veredict.card_image_url)

  const handleGenerateCard = async () => {
    // Isso seria feito na API de veredito — aqui é fallback
    toast.info('Gerando card...')
    setGenerating(true)
    // Simularia a chamada pra /api/card
    setGenerating(false)
  }

  const handleShare = () => {
    const text = `${veredict.veredict_badge}\n\nDescubra o seu: claudemiro.app`
    if (navigator.share) {
      navigator.share({ title: 'Claudemiro', text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`)
      toast.success('Link copiado!')
    }
  }

  const primary = veredict.niche_colors?.primary || '#8B5CF6'
  const secondary = veredict.niche_colors?.secondary || '#EC4899'

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: `linear-gradient(145deg, ${primary}, ${secondary})` }}
      >
        {/* Hero com imagem */}
        <div className="relative h-80 bg-black/20 flex items-center justify-center">
          {cardUrl ? (
            <img
              src={cardUrl}
              alt="Card Claudemiro"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-white/50">
              <div className="text-6xl mb-4">🤖</div>
              <p>Gerando sua imagem...</p>
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Badge */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <Badge
                className="text-lg font-black px-4 py-2 bg-white/20 text-white border-white/20"
                style={{ background: `${primary}40` }}
              >
                {veredict.veredict_badge}
              </Badge>
            </motion.div>
          </div>

          {/* Nome + Profissão */}
          <div className="text-center">
            <h2 className="text-2xl font-black text-white">
              {veredict.profiles?.display_name || 'Usuário'}
            </h2>
            <p className="text-white/70 text-sm">{veredict.profession_label}</p>
          </div>

          {/* Tags */}
          {veredict.tags && veredict.tags.length > 0 && (
            <div className="space-y-2">
              {veredict.tags.map((tag, i) => (
                <motion.div
                  key={i}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-xl">{tag.emoji}</span>
                  <span className="text-white font-semibold w-28 text-sm">{tag.name}</span>
                  <div className="flex-1 bg-white/20 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${tag.percentage}%` }}
                      transition={{ delay: 0.8 + i * 0.1, duration: 1.2 }}
                    />
                  </div>
                  <span className="text-white font-bold text-sm w-10">{tag.percentage}%</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Música */}
          {veredict.music_track && (
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
              <span className="text-2xl">🎵</span>
              <div>
                <p className="text-white font-semibold text-sm">{veredict.music_track.name}</p>
                <p className="text-white/50 text-xs">{veredict.music_track.artist}</p>
              </div>
            </div>
          )}

          {/* Política (se disponível) */}
          {veredict.political_stance && veredict.political_stance.label !== 'Não detectado' && (
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">{veredict.political_stance.label}</p>
              <div className="flex justify-center gap-4 mt-2">
                <span className="text-red-400 text-sm">Lula {veredict.political_stance.percentage_lula}%</span>
                <span className="text-blue-400 text-sm">Bolsonaro {veredict.political_stance.percentage_bolsonaro}%</span>
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
              {veredict.veredict_text}
            </p>
          </div>

          {/* Dicas */}
          {veredict.tips && veredict.tips.length > 0 && (
            <div className="space-y-1">
              <p className="text-white/70 text-xs font-bold uppercase">Dicas do Claudemiro</p>
              {veredict.tips.map((tip, i) => (
                <p key={i} className="text-white/60 text-xs">💡 {tip}</p>
              ))}
            </div>
          )}

          {/* Hashtag */}
          <div className="text-center">
            <p className="text-white/40 text-sm">#ClaudemiroMeViu</p>
          </div>
        </div>
      </motion.div>

      {/* Ações */}
      <div className="mt-6 space-y-4 w-full max-w-md">
        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
          <span className="text-white text-sm">Tornar perfil público</span>
          <Switch
            checked={isPublic}
            onCheckedChange={async (checked) => {
              setIsPublic(checked)
              await fetch(`/api/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ veredictId: veredict.id, isPublic: checked }),
              })
            }}
          />
        </div>

        <Button
          onClick={handleShare}
          className="w-full bg-white text-black hover:bg-white/90 font-bold py-4 rounded-2xl"
        >
          Compartilhar nas redes 📤
        </Button>

        {!cardUrl && (
          <Button
            onClick={handleGenerateCard}
            disabled={generating}
            className="w-full bg-purple-600 hover:bg-purple-500 font-bold py-4 rounded-2xl"
          >
            {generating ? 'Gerando...' : 'Gerar Card com Imagem 🎨'}
          </Button>
        )}
      </div>
    </div>
  )
}
