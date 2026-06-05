'use client'

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PlanModalProps {
  isOpen: boolean
  onClose: () => void
}

type View = 'plans' | 'form' | 'qr'
interface CustomerData { name: string; taxId: string; email: string; cellphone: string }
interface PixData { qrCode: string; qrCodeBase64: string; paymentId: string }

function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function PlanModal({ isOpen, onClose }: PlanModalProps) {
  const [view, setView] = useState<View>('plans')
  const [loading, setLoading] = useState<string | null>(null)
  const [pendingType, setPendingType] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerData>({ name: '', taxId: '', email: '', cellphone: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [pix, setPix] = useState<PixData | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(300)
  const [paid, setPaid] = useState(false)
  const [expired, setExpired] = useState(false)
  const [copied, setCopied] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pixRef = useRef<PixData | null>(null)
  pixRef.current = pix

  // Pré-preenche email do profile ao abrir
  useEffect(() => {
    if (!isOpen) return
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      if (d.display_name && d.display_name.includes('@')) setForm((f: CustomerData) => ({ ...f, email: d.display_name }))
    }).catch(() => {})
  }, [isOpen])

  const stopTimers = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }, [])

  // Cancela o PIX no backend (ao sair sem pagar)
  const cancelPix = useCallback(async () => {
    const p = pixRef.current
    if (!p) return
    try {
      await fetch('/api/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', paymentId: p.paymentId }),
      })
    } catch {}
  }, [])

  // Fechar de vez: para timers, cancela PIX pendente e reseta
  const handleClose = useCallback(async () => {
    stopTimers()
    if (pixRef.current && !paid && !expired) { await cancelPix() }
    setView('plans'); setPix(null); setPaid(false); setExpired(false); setSecondsLeft(300); setPendingType(null)
    onClose()
  }, [stopTimers, cancelPix, paid, expired, onClose])

  // Se o usuário fechar a aba/voltar com o PIX aberto → tenta cancelar
  useEffect(() => {
    const onUnload = () => {
      const p = pixRef.current
      if (p && !paid && !expired) {
        navigator.sendBeacon?.('/api/payment', new Blob(
          [JSON.stringify({ action: 'cancel', paymentId: p.paymentId })],
          { type: 'application/json' },
        ))
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [paid, expired])

  // Timer + polling quando o QR está visível
  useEffect(() => {
    if (view !== 'qr' || !pix) return
    setSecondsLeft(300)

    tickRef.current = setInterval(() => {
      setSecondsLeft((s: number) => {
        if (s <= 1) {
          stopTimers(); setExpired(true); cancelPix()
          return 0
        }
        return s - 1
      })
    }, 1000)

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?paymentId=${pix.paymentId}`)
        const d = await res.json()
        if (d.status === 'PAID') {
          stopTimers(); setPaid(true)
          setTimeout(() => { window.location.href = '/chat' }, 1800)
        } else if (d.status === 'EXPIRED') {
          stopTimers(); setExpired(true)
        }
      } catch {}
    }, 4000)

    return () => stopTimers()
  }, [view, pix, stopTimers, cancelPix])

  const startPix = async (type: string) => {
    setFormError(null)
    if (!form.name.trim() || form.taxId.replace(/\D/g, '').length < 11 || !form.email.includes('@') || form.cellphone.replace(/\D/g, '').length < 10) {
      setFormError('Preenche todos os campos corretamente.')
      return
    }
    setLoading(type)
    try {
      const res = await fetch('/api/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, customer: form }),
      })
      const data = await res.json()
      if (data.qrCodeBase64) {
        setPix({ qrCode: data.qrCode, qrCodeBase64: data.qrCodeBase64, paymentId: data.paymentId })
        setView('qr')
      } else {
        setFormError(data.message || 'Erro ao gerar o PIX.')
      }
    } catch {
      setFormError('Erro de conexão. Tenta de novo.')
    }
    setLoading(null)
  }

  const handlePlanClick = (type: string) => {
    if (type === 'subscription') {
      setLoading('subscription')
      fetch('/api/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription' }),
      }).then(r => r.json()).then(d => {
        if (d.initPoint) window.location.href = d.initPoint
        setLoading(null)
      }).catch(() => setLoading(null))
      return
    }
    setPendingType(type)
    setView('form')
  }

  const copyCode = () => {
    if (!pix) return
    navigator.clipboard?.writeText(pix.qrCode)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(1, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D0221]/95 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg glass-card border border-purple-500/20 shadow-[0_0_60px_rgba(168,85,247,0.15)] rounded-3xl p-6">

            <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-[#F3E8FF]/40 hover:text-white z-10 text-sm">✕</button>

            {/* ═══════════ VIEW: PLANOS ═══════════ */}
            {view === 'plans' && (
              <>
                <h2 className="text-xl font-black text-white text-center mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Escolhe teu plano</h2>
                <p className="text-[#F3E8FF]/40 text-sm text-center mb-6">Quanto mais paga, mais pode</p>
                <div className="space-y-3">
                  {/* PRO */}
                  <div className="relative p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5">
                    <div className="absolute -top-2.5 right-4 bg-purple-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">MELHOR VALOR</div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">✨</span>
                      <div><p className="text-white font-black text-lg">Claudemiro PRO</p><p className="text-[#F3E8FF]/40 text-xs">Tudo liberado, sem limites</p></div>
                    </div>
                    <div className="text-2xl font-black text-white mb-1">R$ 19,99<span className="text-sm text-[#F3E8FF]/40 font-normal">/mês</span></div>
                    <ul className="text-xs text-[#F3E8FF]/50 space-y-1 mb-4">
                      <li>✅ Vereditos ilimitados</li><li>✅ Moldura brilhante (shimmer)</li><li>✅ Upload de imagem própria</li>
                      <li>✅ Escolhe música no Spotify</li><li>✅ Edita campos do card</li><li>✅ Refazer chat</li>
                    </ul>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handlePlanClick('subscription')} disabled={loading !== null}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-bold py-3 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm">
                      {loading === 'subscription' ? 'Abrindo...' : 'Assinar PRO'}
                    </motion.button>
                    <p className="text-[9px] text-[#F3E8FF]/30 text-center mt-2">Assinatura por cartão — abre página segura da AbacatePay</p>
                  </div>
                  {/* FLEX único */}
                  <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">👑</span>
                      <div><p className="text-white font-black text-lg">Claudemiro FLEX</p><p className="text-[#F3E8FF]/40 text-xs">1 mês de vereditos a cada 5 dias</p></div>
                    </div>
                    <div className="text-2xl font-black text-amber-400 mb-1">R$ 9,99<span className="text-sm text-amber-400/40 font-normal"> único</span></div>
                    <ul className="text-xs text-[#F3E8FF]/50 space-y-1 mb-4"><li>✅ Moldura dourada</li><li>✅ Música da IA no card</li><li>✅ Refazer chat</li><li>❌ Sem upload próprio</li><li>❌ Sem Spotify</li></ul>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handlePlanClick('one_time')} disabled={loading !== null}
                      className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold py-3 rounded-2xl border border-amber-500/30 text-sm">
                      Pagar R$ 9,99 no PIX
                    </motion.button>
                  </div>
                  {/* per_generation */}
                  <div className="p-5 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02]">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">🎯</span>
                      <div><p className="text-white font-bold text-base">1 Veredito</p><p className="text-[#F3E8FF]/40 text-xs">Geração única, sem recorrência</p></div>
                    </div>
                    <div className="text-2xl font-black text-amber-400/80 mb-1">R$ 3,99</div>
                    <ul className="text-xs text-[#F3E8FF]/50 space-y-1 mb-4"><li>✅ Moldura dourada</li><li>✅ Música da IA no card</li><li>❌ 1 veredito só</li></ul>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handlePlanClick('per_generation')} disabled={loading !== null}
                      className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400/80 font-bold py-3 rounded-2xl border border-amber-500/20 text-sm">
                      Pagar R$ 3,99 no PIX
                    </motion.button>
                  </div>
                  <div className="p-4 rounded-2xl border border-white/[0.04] bg-white/[0.01] text-center">
                    <p className="text-[#F3E8FF]/30 text-sm">Já no plano FREE? Cada 15 dias pode gerar 1 veredito grátis.</p>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════ VIEW: FORMULÁRIO ═══════════ */}
            {view === 'form' && (
              <>
                <button onClick={() => { setView('plans'); setFormError(null) }} className="text-[#F3E8FF]/40 hover:text-white text-xs mb-3">← voltar</button>
                <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Teus dados pro PIX</h2>
                <p className="text-[#F3E8FF]/40 text-sm mb-5">A AbacatePay precisa disso pra gerar a cobrança.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[#F3E8FF]/60 text-xs mb-1 block">Nome completo</label>
                    <input value={form.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                      placeholder="Seu nome" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-purple-500/50 outline-none" />
                  </div>
                  <div>
                    <label className="text-[#F3E8FF]/60 text-xs mb-1 block">CPF</label>
                    <input value={form.taxId} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, taxId: maskCpf(e.target.value) })}
                      placeholder="000.000.000-00" inputMode="numeric" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-purple-500/50 outline-none" />
                  </div>
                  <div>
                    <label className="text-[#F3E8FF]/60 text-xs mb-1 block">Email</label>
                    <input value={form.email} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
                      placeholder="voce@email.com" type="email" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-purple-500/50 outline-none" />
                  </div>
                  <div>
                    <label className="text-[#F3E8FF]/60 text-xs mb-1 block">Telefone</label>
                    <input value={form.cellphone} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, cellphone: maskPhone(e.target.value) })}
                      placeholder="(11) 99999-9999" inputMode="numeric" className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-purple-500/50 outline-none" />
                  </div>
                  {formError && <p className="text-red-400 text-xs">{formError}</p>}
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => pendingType && startPix(pendingType)} disabled={loading !== null}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-bold py-3.5 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm mt-1">
                    {loading ? 'Gerando QR Code...' : 'Gerar QR Code PIX'}
                  </motion.button>
                </div>
              </>
            )}

            {/* ═══════════ VIEW: QR CODE ═══════════ */}
            {view === 'qr' && pix && (
              <div className="text-center">
                {paid ? (
                  <div className="py-10 flex flex-col items-center gap-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                      className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-4xl">✅</motion.div>
                    <p className="text-white font-black text-lg">Pagamento confirmado!</p>
                    <p className="text-[#F3E8FF]/50 text-sm">Liberando seu acesso...</p>
                  </div>
                ) : expired ? (
                  <div className="py-10 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center text-4xl">⏱️</div>
                    <p className="text-white font-bold">QR Code expirou</p>
                    <p className="text-[#F3E8FF]/50 text-sm">O tempo de 5 minutos acabou. Gera um novo.</p>
                    <button onClick={() => { setView('plans'); setPix(null); setExpired(false) }} className="opt-bubble px-6 py-2.5 text-sm font-semibold">Voltar aos planos</button>
                  </div>
                ) : (
                  <>
                    <button onClick={handleClose} className="text-[#F3E8FF]/40 hover:text-white text-xs mb-3 float-left">← cancelar</button>
                    <div className="clear-both" />
                    <h2 className="text-lg font-black text-white mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Escaneia pra pagar</h2>
                    <p className="text-[#F3E8FF]/40 text-xs mb-4">Abre o app do banco e mira no QR Code</p>
                    <div className="bg-white rounded-2xl p-3 w-48 h-48 mx-auto flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" className="w-full h-full object-contain" />
                    </div>
                    <div className={`mt-4 text-sm font-mono font-bold ${secondsLeft < 60 ? 'text-red-400' : 'text-amber-400'}`}>
                      expira em {mm}:{ss}
                    </div>
                    <button onClick={copyCode} className="mt-4 w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F3E8FF]/70 break-all transition-colors">
                      {copied ? '✅ Copiado!' : '📋 Copiar código PIX (copia e cola)'}
                    </button>
                    <div className="flex items-center justify-center gap-2 mt-4 text-[#F3E8FF]/40 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> aguardando pagamento...
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
