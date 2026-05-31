'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { ClaudemiroBot } from '@/components/claudemiro-bot'
import { ChatProgressBar } from '@/components/chat/progress-bar'
import { ChatAtmosphere } from '@/components/chat/chat-atmosphere'
import { FinalWizard } from '@/components/chat/final-wizard'
import { PlanModal } from '@/components/plan-modal'

type Parsed = { comment: string; question: string; options: string[] | null }
type Message = { role: 'claudemiro' | 'user'; content: string; parsed?: Parsed; veredict?: boolean }

const MODE_OPTIONS = [
  { id: 'engracado', icon: '😈', label: 'Engraçado', desc: 'Zoeira pesada, humor ácido, sem filtro', tag: '🔥 Mais escolhido', highlight: true },
  { id: 'casual', icon: '✌️', label: 'Casual', desc: 'Leve e descontraído, na boa', tag: '🌿 Suave' },
  { id: 'profissional', icon: '🧐', label: 'Profissional', desc: 'Sério e analítico, sem zoeira', tag: '📊 Técnico' },
]

const AVAILABLE_TOPICS = [
  { id: 'games', label: 'Games', emoji: '🎮' }, { id: 'animes', label: 'Animes', emoji: '🐉' },
  { id: 'filmes', label: 'Filmes/Séries', emoji: '🎬' }, { id: 'futebol', label: 'Futebol', emoji: '⚽' },
  { id: 'musica', label: 'Música', emoji: '🎵' }, { id: 'politica', label: 'Política', emoji: '🗳️' },
  { id: 'religiao', label: 'Religião', emoji: '🙏' }, { id: 'signo', label: 'Signo/Espiritualidade', emoji: '🔮' },
  { id: 'relacionamento', label: 'Relacionamento', emoji: '💘' }, { id: 'carreira', label: 'Carreira/Trampo', emoji: '💼' },
  { id: 'academia', label: 'Academia/Fitness', emoji: '💪' }, { id: 'internet', label: 'Tretas da Internet', emoji: '🍿' },
]

export function ChatInterface() {
  const [step, setStep] = useState<'loading' | 'pending' | 'mode' | 'topics' | 'chat'>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<string | null>(null)
  const [blockedTopics, setBlockedTopics] = useState<string[]>([])
  const [initializing, setInitializing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pending, setPending] = useState<any>(null)
  const [veredictData, setVeredictData] = useState<any>(null)
  const [veredictId, setVeredictId] = useState<string | null>(null)
  const [suggestVeredict, setSuggestVeredict] = useState(false)
  const [interactionCount, setInteractionCount] = useState(0)
  const [showFreeInput, setShowFreeInput] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardImages, setWizardImages] = useState<any[]>([])
  const [wizardTrack, setWizardTrack] = useState<any>(null)
  const [userPlan, setUserPlan] = useState<'PRO' | 'FLEX' | 'FREE'>('FREE')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowFreeInput(false) }, [messages])
  useEffect(() => { fetch('/api/chat').then(r => r.json()).then(d => { if (d.hasSession) { setPending(d); setStep('pending') } else setStep('mode') }).catch(() => setStep('mode')) }, [])
  useEffect(() => { fetch('/api/user/profile').then(r => r.json()).then(d => setUserPlan(d.plan || 'FREE')).catch(() => {}) }, [])

  const continueSession = () => {
    setMode(pending.mode); setSessionId(pending.sessionId); setBlockedTopics(pending.blockedTopics || [])
    setMessages(pending.messages || []); setPending(null); setStep('chat')
  }
  const resetSession = () => { setPending(null); setStep('mode') }
  const selectMode = (m: string) => { setMode(m); setStep('topics') }
  const toggleTopic = (id: string) => setBlockedTopics(p => p.includes(id) ? p.filter(t => t !== id) : [...p, id])

  const startChat = async () => {
    setInitializing(true); await new Promise(r => setTimeout(r, 1200)); setInitializing(false); setStep('chat'); setLoading(true)
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '__START__', mode, blockedTopics }) })
    const data = await res.json()
    setMessages([{ role: 'claudemiro', content: '', parsed: data.parsed }])
    setSessionId(data.sessionId); setInteractionCount(1); setLoading(false)
  }

  const sendMessage = async (text?: string) => {
    const msg = text || input; if (!msg.trim() || loading) return
    setMessages(prev => [...prev, { role: 'user', content: msg }]); setInput(''); setLoading(true)
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, sessionId }) })
    const data = await res.json()
    if (data.type === 'veredict') {
      setMessages(data.messages); setVeredictData(data.veredict); setVeredictId(data.veredictId); setSuggestVeredict(false)
    } else if (data.type === 'undo') {
      setMessages(data.messages); setInteractionCount(data.interactionCount)
    } else if (data.type === 'noop') {
      // Fim de chat já sinalizado — só garante a barra de ações, sem nova bolha
      setSuggestVeredict(true); setInteractionCount(data.interactionCount)
    } else {
      if (data.parsed) setMessages(prev => [...prev, { role: 'claudemiro', content: '', parsed: data.parsed }])
      setInteractionCount(data.interactionCount); setSuggestVeredict(data.suggestVeredict)
    }
    setLoading(false)
  }

  const handleUndo = async () => {
    if (!sessionId || messages.length < 2 || loading) return; setLoading(true)
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ undo: true, sessionId }) })
    const data = await res.json()
    if (data.type === 'undo') { setMessages(data.messages); setInteractionCount(data.interactionCount) }
    setLoading(false)
  }

  const openWizard = async () => {
    if (!sessionId || loading) return
    setLoading(true)
    try {
      // Busca imagens das redes + plano
      const [imgRes, profileRes] = await Promise.all([
        fetch('/api/user/social-images'),
        fetch('/api/user/profile'),
      ])
      const imgData = await imgRes.json()
      const profileData = await profileRes.json()
      setWizardImages(imgData.images || [])
      setUserPlan(profileData.plan || 'FREE')
      setWizardTrack(imgData.topTrack || profileData.topTrack || null)
      setShowWizard(true)
    } catch (err) {
      console.error('Erro ao abrir wizard:', err)
      // Fallback: chama o veredict antigo
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestVeredict: true, sessionId }) })
      const data = await res.json()
      if (data.type === 'veredict') { setMessages(data.messages); setVeredictData(data.veredict); setVeredictId(data.veredictId); setSuggestVeredict(false) }
    }
    setLoading(false)
  }

  const requestVeredict = async () => {
    if (!sessionId || loading) return; setLoading(true)
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestVeredict: true, sessionId }) })
    const data = await res.json()
    if (data.type === 'veredict') { setMessages(data.messages); setVeredictData(data.veredict); setVeredictId(data.veredictId); setSuggestVeredict(false) }
    setLoading(false)
  }

  // ---- RENDER: loading ----
  if (step === 'loading') return <div className="min-h-screen bg-[#0D0221] flex items-center justify-center"><div className="flex gap-1.5">{[...Array(3)].map((_, i) => <motion.div key={i} className="w-3 h-3 bg-purple-500 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />)}</div></div>

  // ---- RENDER: pending ----
  if (step === 'pending' && pending) return (
    <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-24 h-24 mx-auto claude-bot-glow"><ClaudemiroBot /></motion.div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Tu tem uma entrevista pendente!</h1>
        <p className="text-[#F3E8FF]/50 text-sm">Modo: <span className="text-purple-400">{pending.mode}</span></p>
        <div className="space-y-3">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={continueSession} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)]">Continuar</motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={resetSession} className="w-full bg-white/[0.03] hover:bg-white/[0.06] text-[#F3E8FF]/40 py-3 rounded-2xl border border-white/[0.04] text-sm">Resetar</motion.button>
        </div>
      </div>
    </div>
  )

  // ---- RENDER: mode ----
  if (step === 'mode') return (
    <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-lg px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-28 h-28 mx-auto claude-bot-glow"><ClaudemiroBot /></motion.div>
        <h1 className="text-3xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Claudemiro vai te entrevistar</h1>
        <p className="text-[#F3E8FF]/50 text-sm">Escolhe o tom. Depois tu libera os temas.</p>
        <div className="space-y-3">
          {MODE_OPTIONS.map((opt, i) => (
            <motion.button key={opt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => selectMode(opt.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${opt.highlight ? 'bg-purple-500/5 border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.08)]' : 'bg-white/[0.01] border-white/[0.04]'}`}>
              <div className="flex items-center gap-4">
                <span className="text-3xl w-12 h-12 flex items-center justify-center rounded-xl bg-white/[0.03]">{opt.icon}</span>
                <div><div className="text-lg font-bold text-white">{opt.label}{opt.tag && <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{opt.tag}</span>}</div>
                <div className="text-sm text-[#F3E8FF]/30">{opt.desc}</div></div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )

  // ---- RENDER: topics ----
  if (step === 'topics') {
    const modeLabel = MODE_OPTIONS.find(o => o.id === mode)
    if (initializing) return <div className="min-h-screen bg-[#0D0221] flex items-center justify-center"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 text-center"><p className="text-[#F3E8FF]/40 font-mono text-xs">⚡ ANALISANDO REDES...</p><div className="flex justify-center gap-1 mt-3">{[...Array(8)].map((_, i) => <motion.div key={i} className="w-2 h-2 bg-purple-500 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, delay: i * 0.12, repeat: Infinity }} />)}</div></motion.div></div>

    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-lg px-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-20 h-20 mx-auto claude-bot-glow"><ClaudemiroBot /></motion.div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Sobre o que NÃO quer conversar?</h1>
          <p className="text-[#F3E8FF]/50 text-sm">Modo: <span className="text-purple-400">{modeLabel?.icon} {modeLabel?.label}</span> — Marca o que NÃO quer. O resto eu pergunto.</p>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_TOPICS.map(t => {
              const blocked = blockedTopics.includes(t.id)
              return <motion.button key={t.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => toggleTopic(t.id)}
                className={`flex items-center gap-2 p-3 rounded-xl text-sm border transition-all ${blocked ? 'bg-red-500/10 border-red-500/25 text-red-300 line-through' : 'bg-white/[0.03] border-white/[0.06] text-[#F3E8FF]/60 hover:text-white'}`}>
                <span className="text-lg">{t.emoji}</span><span>{t.label}</span>
                <span className="ml-auto text-xs">{blocked ? '🚫' : '✓'}</span>
              </motion.button>
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('mode')} className="flex-1 bg-white/[0.03] hover:bg-white/[0.06] text-[#F3E8FF]/40 py-3 rounded-2xl border border-white/[0.04] text-sm">← Voltar</button>
            <button onClick={startChat} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm">Começar</button>
          </div>
        </div>
      </div>
    )
  }

  // ---- RENDER: chat ----
  const isDone = veredictData !== null
  const lastMsg = messages[messages.length - 1]
  const lastParsed = lastMsg?.parsed
  const hasOptions = lastParsed?.options && lastParsed.options.length >= 2 && !loading && !isDone

  return (
    <div className="min-h-screen bg-[#0D0221] flex flex-col relative">
      <ChatAtmosphere
        interactionCount={interactionCount}
        maxInteractions={20}
        isDone={isDone}
        mode={mode || 'engracado'}
      />
      <header className="border-b border-white/[0.06] p-3 flex items-center justify-between bg-[#0D0221]/80 backdrop-blur-xl sticky top-0 z-20">
        <a href="/" className="text-sm font-bold text-[#F3E8FF]/30 hover:text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>← CLAUDEMIRO</a>
        <div className="flex items-center gap-2">
          {messages.length >= 2 && !loading && !isDone && <button onClick={handleUndo} className="text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-[#F3E8FF]/40 px-2.5 py-1 rounded-full">↩ Desfazer</button>}
          {suggestVeredict && <button onClick={openWizard} className="text-[10px] bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-2.5 py-1 rounded-full font-medium">🏆 Gerar Veredito</button>}
          <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">online</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto relative z-10">
        <ChatProgressBar
          interactionCount={interactionCount}
          maxInteractions={20}
          isDone={isDone}
        />

        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-center pt-6 pb-4"><div className="w-24 h-24 claude-bot-glow"><ClaudemiroBot /></div></div>
          <div className="space-y-4 pb-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-purple-500/20 border border-purple-500/20 text-white rounded-br-md' : msg.veredict ? 'bg-purple-500/10 border border-purple-500/20 text-[#F3E8FF]' : 'bg-white/[0.03] border border-white/[0.05] text-[#F3E8FF] rounded-bl-md'}`}>
                    {msg.role === 'user' ? <p className="text-sm">{msg.content}</p> : msg.veredict ? <p className="text-sm whitespace-pre-wrap">{msg.content}</p> : (
                      <p className="text-sm leading-relaxed">
                        {msg.parsed?.comment && <span className="font-medium">{msg.parsed.comment} </span>}
                        {msg.parsed?.question && <span className="text-[#F3E8FF]/80">{msg.parsed.question}</span>}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start"><div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl px-4 py-3"><div className="flex gap-1.5">{[...Array(3)].map((_, i) => <span key={i} className="w-2 h-2 bg-purple-400/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}</div></div></motion.div>}
            </AnimatePresence>
            {veredictData && veredictId && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-center pt-2 pb-4"><a href={`/resultado/${veredictId}`} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)] text-sm">🏆 Ver card completo</a></motion.div>}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input ou Botões */}
      {!isDone && suggestVeredict ? (
        /* Barra de fim de chat: Refazer (com $ badge) | Gerar veredito */
        <div className="border-t border-white/[0.06] p-4 bg-[#0D0221]/90 backdrop-blur z-10 relative">
          <p className="text-[10px] text-[#F3E8FF]/20 font-mono mb-3 text-center tracking-wider">ESCOLHA UMA OPÇÃO</p>
          <div className="max-w-2xl mx-auto flex gap-3 justify-center items-center">
            {/* Refazer com $ embutido no canto */}
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => { if (userPlan === 'FREE') { setShowPlanModal(true) } else { resetSession() } }}
              className="relative flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#F3E8FF]/60 hover:text-white font-medium py-3 pl-5 pr-9 rounded-2xl border border-white/[0.08] text-sm transition-colors overflow-visible">
              🔄 Refazer
              <span
                onClick={(e) => { e.stopPropagation(); setShowPlanModal(true) }}
                className="absolute top-1/2 -translate-y-1/2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-[#0D0221] text-[11px] font-black shadow-[0_0_8px_rgba(245,158,11,0.5)] hover:scale-110 transition-transform"
                title="Ver planos"
              >
                $
              </span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={openWizard}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-sm">
              🏆 Gerar veredito
            </motion.button>
          </div>
        </div>
      ) : !isDone && !loading && hasOptions && !showFreeInput ? (
        <div className="border-t border-white/[0.06] p-4 bg-[#0D0221]/90 backdrop-blur z-10 relative"><div className="max-w-2xl mx-auto">
          <p className="text-[10px] text-[#F3E8FF]/20 font-mono mb-3 text-center tracking-wider">ESCOLHA UMA OPÇÃO</p>
          <div className="grid grid-cols-2 gap-2.5">
            {lastParsed!.options!.map((opt: string, oi: number) => {
              const isOther = opt.includes('Outro') || opt.includes('🖊️')
              return (
                <motion.button key={oi} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.94 }}
                  onClick={() => isOther ? setShowFreeInput(true) : sendMessage(opt)}
                  className={`relative overflow-hidden border text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm ${isOther ? 'bg-white/[0.05] hover:bg-white/[0.10] border-white/[0.15] hover:border-white/[0.30]' : 'bg-purple-500/10 hover:bg-purple-500/25 border-purple-500/20 hover:border-purple-400/50'}`}>
                  <span className="relative z-10">{opt}</span>
                  {!isOther && <motion.div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-400/10 to-purple-500/0" initial={{ x: '-100%' }} whileHover={{ x: '100%' }} transition={{ duration: 0.6 }} />}
                </motion.button>
              )
            })}
          </div>
        </div></div>
      ) : !isDone ? (
        <div className="border-t border-white/[0.06] p-4 bg-[#0D0221]/90 backdrop-blur z-10 relative"><div className="max-w-2xl mx-auto flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()} placeholder="Manda a real..." className="bg-white/[0.03] border-white/[0.06] text-white rounded-2xl h-12 text-sm placeholder:text-[#F3E8FF]/20" disabled={loading} />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="bg-purple-500 hover:bg-purple-600 disabled:bg-white/[0.03] text-white font-bold rounded-2xl h-12 w-12 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">↑</button>
        </div></div>
      ) : isDone ? (
        /* Barra pós-veredict: Refazer | Upgrade */
        <div className="border-t border-white/[0.06] p-4 bg-[#0D0221]/90 backdrop-blur z-10 relative">
          <div className="max-w-2xl mx-auto flex gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setVeredictData(null); setVeredictId(null); setSuggestVeredict(true); }}
              className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#F3E8FF]/60 hover:text-white font-medium py-3 px-5 rounded-2xl border border-white/[0.08] text-sm transition-colors"
            >
              🔄 Refazer
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium py-3 px-5 rounded-2xl border border-amber-500/20 text-sm transition-colors"
            >
              💰 Upgrade
            </motion.button>
          </div>
        </div>
      ) : null}

      {/* ─── WIZARD ──────────────────────────────── */}
      {showWizard && (
        <FinalWizard
          sessionId={sessionId!}
          plan={userPlan}
          socialImages={wizardImages}
          aiTrack={wizardTrack}
          onClose={() => setShowWizard(false)}
          onUpgrade={() => setShowPlanModal(true)}
        />
      )}

      {/* ─── PLAN MODAL ──────────────────────────── */}
      <PlanModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} />
    </div>
  )
}
