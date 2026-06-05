'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PlanModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PlanModal({ isOpen, onClose }: PlanModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handlePayment = async (type: string) => {
    setLoading(type)
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, provider: 'abacatepay' }),
      })
      const data = await res.json()

      if (data.initPoint) {
        // Assinatura: redireciona pro Mercado Pago
        window.location.href = data.initPoint
      } else if (data.qrCodeBase64) {
        // PIX: mostra QR code
        alert('PIX gerado! (QR code modal em breve)')
        console.log('qrCode:', data.qrCode)
      }
    } catch (err) {
      console.error('Payment error:', err)
      alert('Erro ao gerar pagamento')
    }
    setLoading(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D0221]/95 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg glass-card border border-purple-500/20 shadow-[0_0_60px_rgba(168,85,247,0.15)] rounded-3xl p-6 mx-4"
          >
            {/* Fechar */}
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-[#F3E8FF]/40 hover:text-white z-10 text-sm">✕</button>

            <h2 className="text-xl font-black text-white text-center mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Escolhe teu plano</h2>
            <p className="text-[#F3E8FF]/40 text-sm text-center mb-6">Quanto mais paga, mais pode</p>

            {/* Cards de plano */}
            <div className="space-y-3">
              {/* PRO */}
              <div className="relative p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5">
                <div className="absolute -top-2.5 right-4 bg-purple-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">MELHOR VALOR</div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">✨</span>
                  <div>
                    <p className="text-white font-black text-lg">Claudemiro PRO</p>
                    <p className="text-[#F3E8FF]/40 text-xs">Tudo liberado, sem limites</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-white mb-1">R$ 19,99<span className="text-sm text-[#F3E8FF]/40 font-normal">/mês</span></div>
                <ul className="text-xs text-[#F3E8FF]/50 space-y-1 mb-4">
                  <li>✅ Vereditos ilimitados</li>
                  <li>✅ Moldura brilhante (shimmer)</li>
                  <li>✅ Upload de imagem própria</li>
                  <li>✅ Escolhe música no Spotify</li>
                  <li>✅ Edita campos do card</li>
                  <li>✅ Refazer chat</li>
                </ul>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => handlePayment('subscription')}
                  disabled={loading !== null}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-bold py-3 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm"
                >
                  {loading === 'subscription' ? 'Redirecionando...' : 'Assinar PRO'}
                </motion.button>
              </div>

              {/* FLEX — pagamento único */}
              <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">👑</span>
                  <div>
                    <p className="text-white font-black text-lg">Claudemiro FLEX</p>
                    <p className="text-[#F3E8FF]/40 text-xs">1 mês de vereditos a cada 5 dias</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-400 mb-1">R$ 9,99<span className="text-sm text-amber-400/40 font-normal"> único</span></div>
                <ul className="text-xs text-[#F3E8FF]/50 space-y-1 mb-4">
                  <li>✅ Moldura dourada</li>
                  <li>✅ Música da IA no card</li>
                  <li>✅ Refazer chat</li>
                  <li>❌ Sem upload próprio</li>
                  <li>❌ Sem Spotify</li>
                </ul>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => handlePayment('one_time')}
                  disabled={loading !== null}
                  className="w-full bg-amber-500/20 hover:bg-amber-500/30 disabled:bg-amber-500/10 text-amber-400 font-bold py-3 rounded-2xl border border-amber-500/30 text-sm"
                >
                  {loading === 'one_time' ? 'Gerando PIX...' : 'Pagar R$ 9,99'}
                </motion.button>
              </div>

              {/* FLEX — por geração */}
              <div className="p-5 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02]">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🎯</span>
                  <div>
                    <p className="text-white font-bold text-base">1 Veredito</p>
                    <p className="text-[#F3E8FF]/40 text-xs">Geração única, sem recorrência</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-400/80 mb-1">R$ 3,99</div>
                <ul className="text-xs text-[#F3E8FF]/50 space-y-1 mb-4">
                  <li>✅ Moldura dourada</li>
                  <li>✅ Música da IA no card</li>
                  <li>❌ 1 veredito só</li>
                </ul>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => handlePayment('per_generation')}
                  disabled={loading !== null}
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 disabled:bg-amber-500/5 text-amber-400/80 font-bold py-3 rounded-2xl border border-amber-500/20 text-sm"
                >
                  {loading === 'per_generation' ? 'Gerando PIX...' : 'Pagar R$ 3,99'}
                </motion.button>
              </div>

              {/* FREE */}
              <div className="p-4 rounded-2xl border border-white/[0.04] bg-white/[0.01] text-center">
                <p className="text-[#F3E8FF]/30 text-sm">Já no plano FREE? Cada 15 dias pode gerar 1 veredito grátis.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
