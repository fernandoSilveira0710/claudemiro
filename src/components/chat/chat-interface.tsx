'use client'

import { useState, useEffect, useRef } from 'react'
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

const OPTION_ICONS = ['①', '②', '③', '④']

/* ── Mini Robot Avatar (inline SVG pra performance) ── */
function MiroAvatar() {
  return (
    <div className="w-full h-full rounded-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A0A33, #0D0221)' }}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        {/* Antenna */}
        <line x1="20" y1="2" x2="20" y2="8" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="1.5" r="1.5" fill="#EC4899" />
        {/* Head */}
        <rect x="8" y="8" width="24" height="18" rx="5" fill="#1A0A33" stroke="#A855F7" strokeWidth="1" />
        {/* Eyes */}
        <circle cx="15" cy="17" r="3" fill="#A855F7" />
        <circle cx="25" cy="17" r="3" fill="#A855F7" />
        <circle cx="15" cy="17" r="1.2" fill="#0D0221" />
        <circle cx="25" cy="17" r="1.2" fill="#0D0221" />
        {/* Mouth */}
        <rect x="14" y="23" width="12" height="2" rx="1" fill="#EC4899" opacity="0.6" />
        {/* Body */}
        <rect x="12" y="28" width="16" height="10" rx="4" fill="#1A0A33" stroke="#A855F7" strokeWidth="0.8" />
        {/* Arms */}
        <line x1="8" y1="33" x2="12" y2="33" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="33" x2="32" y2="33" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

/* ── User Avatar ── */
function UserAvatar() {
  return (
    <div className="w-full h-full rounded-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #A855F7, #EC4899)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  )
}

/* ── Timestamp formatador ── */
function TimeStamp() {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  return <span className="text-[9px] text-claude-muted/30 tabular-nums">{h}:{m}</span>
}

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
    setMessages(pending.messages || [])
    setInteractionCount(pending.interactionCount || 0)
    setSuggestVeredict(pending.suggestVeredict || false)
    setPending(null); setStep('chat')
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

  // ═══════════════════════════════════════════
  // RENDER: loading
  // ═══════════════════════════════════════════
  if (step === 'loading') return (
    <div className="min-h-screen bg-claude-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          <MiroAvatar />
        </motion.div>
        <div className="flex gap-1.5">
          {[...Array(3)].map((_, i) => (
            <motion.div key={i} className="w-2.5 h-2.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #A855F7, #EC4899)' }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 1, delay: i * 0.12, repeat: Infinity }} />
          ))}
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════
  // RENDER: pending
  // ═══════════════════════════════════════════
  if (step === 'pending' && pending) return (
    <div className="min-h-screen bg-claude-bg flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6 max-w-md px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="w-28 h-28 mx-auto drop-shadow-[0_0_25px_rgba(168,85,247,0.3)]">
          <ClaudemiroBot />
        </motion.div>
        <div>
          <h1 className="text-3xl font-black text-claude-on-surface mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Tu tem uma entrevista pendente!</h1>
          <p className="text-claude-muted text-sm">Modo: <span className="text-claude-primary font-semibold">{pending.mode}</span></p>
        </div>
        <div className="space-y-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={continueSession}
            className="w-full bg-claude-primary hover:bg-claude-primary-hover text-white font-bold py-4 rounded-2xl shadow-glow-primary transition-all hover:shadow-[0_0_40px_rgba(168,85,247,0.5)]">
            Continuar
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={resetSession}
            className="w-full bg-claude-input hover:bg-white/[0.06] text-claude-muted py-3 rounded-2xl border border-claude-border text-sm transition-colors">
            Resetar
          </motion.button>
        </div>
      </motion.div>
    </div>
  )

  // ═══════════════════════════════════════════
  // RENDER: mode
  // ═══════════════════════════════════════════
  if (step === 'mode') return (
    <div className="min-h-screen bg-claude-bg flex items-center justify-center">
      <div className="text-center space-y-6 max-w-lg px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="w-28 h-28 mx-auto drop-shadow-[0_0_25px_rgba(168,85,247,0.3)]"><ClaudemiroBot /></motion.div>
        <h1 className="text-3xl font-black text-claude-on-surface" style={{ fontFamily: "'DM Sans', sans-serif" }}>Claudemiro vai te entrevistar</h1>
        <p className="text-claude-muted text-sm">Escolhe o tom. Depois tu libera os temas.</p>
        <div className="space-y-3">
          {MODE_OPTIONS.map((opt, i) => (
            <motion.button key={opt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => selectMode(opt.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                opt.highlight
                  ? 'bg-claude-primary/8 border-claude-primary/25 shadow-[0_0_25px_rgba(168,85,247,0.1)] hover:bg-claude-primary/15 hover:border-claude-primary/40 hover:shadow-[0_0_35px_rgba(168,85,247,0.2)]'
                  : 'bg-claude-input border-claude-border hover:bg-white/[0.05] hover:border-claude-border-hover'
              }`}>
              <div className="flex items-center gap-4">
                <span className="text-3xl w-12 h-12 flex items-center justify-center rounded-xl bg-white/[0.04]">{opt.icon}</span>
                <div>
                  <div className="text-lg font-bold text-claude-on-surface">{opt.label}{opt.tag && <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-claude-primary/20 text-claude-primary font-semibold">{opt.tag}</span>}</div>
                  <div className="text-sm text-claude-muted">{opt.desc}</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════
  // RENDER: topics
  // ═══════════════════════════════════════════
  if (step === 'topics') {
    const modeLabel = MODE_OPTIONS.find(o => o.id === mode)
    if (initializing) return (
      <div className="min-h-screen bg-claude-bg flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]"><ClaudemiroBot /></div>
          <p className="text-claude-muted font-mono text-xs tracking-[0.2em] uppercase">⚡ Analisando suas redes...</p>
          <div className="flex justify-center gap-1.5">
            {[...Array(8)].map((_, i) => (
              <motion.div key={i} className="w-2.5 h-2.5 rounded-full"
                style={{ background: 'linear-gradient(135deg, #A855F7, #EC4899)' }}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.2, 0.7] }}
                transition={{ duration: 1.2, delay: i * 0.12, repeat: Infinity }} />
            ))}
          </div>
        </motion.div>
      </div>
    )

    return (
      <div className="min-h-screen bg-claude-bg flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6 max-w-lg px-4">
          <div className="w-20 h-20 mx-auto drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]"><ClaudemiroBot /></div>
          <div>
            <h1 className="text-2xl font-black text-claude-on-surface mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Sobre o que NÃO quer conversar?</h1>
            <p className="text-claude-muted text-sm">Modo: <span className="text-claude-primary">{modeLabel?.icon} {modeLabel?.label}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_TOPICS.map(t => {
              const blocked = blockedTopics.includes(t.id)
              return (
                <motion.button key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => toggleTopic(t.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm border transition-all duration-200 ${
                    blocked
                      ? 'bg-red-500/8 border-red-500/20 text-red-400/80 line-through'
                      : 'bg-claude-input border-claude-border text-claude-on-surface/70 hover:text-claude-on-surface hover:border-claude-border-hover hover:bg-white/[0.05]'
                  }`}>
                  <span className="text-lg">{t.emoji}</span><span>{t.label}</span>
                  <span className="ml-auto text-xs">{blocked ? '🚫' : '✓'}</span>
                </motion.button>
              )
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('mode')} className="flex-1 bg-claude-input hover:bg-white/[0.06] text-claude-muted py-3 rounded-2xl border border-claude-border text-sm transition-colors">← Voltar</button>
            <button onClick={startChat} className="flex-1 bg-claude-primary hover:bg-claude-primary-hover text-white font-bold py-3 rounded-2xl shadow-glow-primary text-sm transition-all hover:shadow-[0_0_35px_rgba(168,85,247,0.4)]">Começar</button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // RENDER: chat
  // ═══════════════════════════════════════════
  const isDone = veredictData !== null
  const lastMsg = messages[messages.length - 1]
  const lastParsed = lastMsg?.parsed
  const hasOptions = lastParsed?.options && lastParsed.options.length >= 2 && !loading && !isDone

  return (
    <div className="min-h-screen bg-claude-bg flex flex-col relative">
      <ChatAtmosphere interactionCount={interactionCount} maxInteractions={20} isDone={isDone} mode={mode || 'engracado'} />

      {/* ═════ HEADER ═════ */}
      <header className="border-b border-claude-border/30 p-3 flex items-center justify-between bg-claude-glass backdrop-blur-2xl sticky top-0 z-20">
        <a href="/" className="text-xs font-bold text-claude-muted hover:text-claude-on-surface transition-colors tracking-[0.05em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          ← CLAUDEMIRO
        </a>
        <div className="flex items-center gap-2">
          {messages.length >= 2 && !loading && !isDone && (
            <button onClick={handleUndo} className="text-[10px] bg-claude-input hover:bg-white/[0.08] text-claude-muted hover:text-claude-on-surface px-2.5 py-1 rounded-full border border-claude-border/50 transition-all">
              ↩ Desfazer
            </button>
          )}
          {suggestVeredict && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={openWizard}
              className="text-[10px] bg-claude-primary/15 hover:bg-claude-primary/25 text-claude-primary px-2.5 py-1 rounded-full font-semibold border border-claude-primary/15 transition-all">
              🏆 Gerar Veredito
            </motion.button>
          )}
          <span className="flex items-center gap-1.5 text-[10px] bg-claude-success/8 text-claude-success px-2 py-0.5 rounded-full font-medium border border-claude-success/15">
            <span className="w-1.5 h-1.5 rounded-full bg-claude-success animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
            online
          </span>
        </div>
      </header>

      {/* ═════ MESSAGES ═════ */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <ChatProgressBar interactionCount={interactionCount} maxInteractions={20} isDone={isDone} />

        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-center pt-6 pb-4">
            <div className="w-14 h-14 drop-shadow-[0_0_18px_rgba(168,85,247,0.3)] opacity-70">
              <MiroAvatar />
            </div>
          </div>

          <div className="space-y-5 pb-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                >
                  {msg.role === 'user' ? (
                    /* ═══════ USER ═══════ */
                    <div className="flex items-start gap-2.5 justify-end">
                      <div className="flex flex-col items-end max-w-[72%]">
                        {/* Nome + hora */}
                        <div className="flex items-center gap-2 mb-1 pr-1">
                          <TimeStamp />
                          <span className="text-[11px] font-semibold text-claude-muted/50">Você</span>
                        </div>
                        {/* Balão */}
                        <div className="rounded-2xl rounded-tr-sm px-4 py-2.5"
                          style={{
                            background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(124,58,237,0.4))',
                            border: '1px solid rgba(168,85,247,0.3)',
                            boxShadow: '0 4px 16px rgba(168,85,247,0.1)',
                          }}
                        >
                          <p className="text-sm leading-relaxed text-white">{msg.content}</p>
                        </div>
                      </div>
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex-shrink-0 mt-4 overflow-hidden shadow-md"
                        style={{ border: '2px solid rgba(168,85,247,0.35)' }}>
                        <UserAvatar />
                      </div>
                    </div>
                  ) : msg.veredict ? (
                    /* ═══════ VEREDICT ═══════ */
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-full flex-shrink-0 mt-4 overflow-hidden shadow-md"
                        style={{ border: '2px solid rgba(168,85,247,0.4)' }}>
                        <MiroAvatar />
                      </div>
                      <div className="flex flex-col max-w-[82%]">
                        <div className="flex items-center gap-2 mb-1 pl-1">
                          <span className="text-[11px] font-semibold text-claude-primary/70">Miro</span>
                          <TimeStamp />
                        </div>
                        <div className="rounded-2xl rounded-tl-sm px-5 py-4 bg-claude-glass backdrop-blur-2xl border border-claude-primary/20 shadow-card">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed text-claude-on-surface">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ═══════ MIRO ═══════ */
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-full flex-shrink-0 mt-4 overflow-hidden shadow-md"
                        style={{ border: '2px solid rgba(168,85,247,0.3)' }}>
                        <MiroAvatar />
                      </div>
                      <div className="flex flex-col max-w-[72%]">
                        {/* Nome + hora */}
                        <div className="flex items-center gap-2 mb-1 pl-1">
                          <span className="text-[11px] font-semibold text-claude-primary/60">Miro</span>
                          <TimeStamp />
                        </div>
                        {/* Balão */}
                        <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-claude-glass backdrop-blur-2xl border border-claude-border/40 shadow-sm">
                          <p className="text-sm leading-relaxed">
                            {msg.parsed?.comment && (
                              <span className="font-semibold text-claude-on-surface">{msg.parsed.comment} </span>
                            )}
                            {msg.parsed?.question && (
                              <span className="text-claude-on-surface/80">{msg.parsed.question}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* ═══════ LOADING ═══════ */}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 mt-4 overflow-hidden"
                    style={{ border: '2px solid rgba(168,85,247,0.2)' }}>
                    <MiroAvatar />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1 pl-1">
                      <span className="text-[11px] font-semibold text-claude-primary/40">Miro</span>
                    </div>
                    <div className="rounded-2xl rounded-tl-sm px-5 py-3 bg-claude-glass backdrop-blur-2xl border border-claude-border/40 shadow-sm">
                      <div className="flex gap-1.5">
                        {[...Array(3)].map((_, i) => (
                          <motion.span key={i} className="w-2 h-2 rounded-full"
                            style={{ background: 'linear-gradient(135deg, #A855F7, #C084FC)' }}
                            animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
                            transition={{ duration: 0.65, delay: i * 0.1, repeat: Infinity }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {veredictData && veredictId && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center pt-2 pb-4">
                <a href={`/resultado/${veredictId}`}
                  className="inline-flex items-center gap-2 bg-claude-primary hover:bg-claude-primary-hover text-white font-bold py-3 px-7 rounded-2xl shadow-glow-primary hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all text-sm">
                  🏆 Ver card completo
                </a>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}

      {/* ── FIM DE CHAT ── */}
      {!isDone && suggestVeredict ? (
        <div className="border-t border-claude-border/20 p-6 bg-claude-glass backdrop-blur-2xl z-10">
          <div className="max-w-sm mx-auto space-y-4">
            <p className="text-center">
              <span className="text-[10px] text-claude-muted/30 font-mono tracking-[0.15em] uppercase">
                Já tenho uma opinião formada sobre você
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Refazer */}
              <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                onClick={() => { if (userPlan === 'FREE') { setShowPlanModal(true) } else { resetSession() } }}
                className="relative flex flex-col items-center gap-2 py-5 rounded-2xl bg-claude-input border border-claude-border hover:border-claude-border-hover hover:bg-white/[0.04] transition-all group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">🔄</span>
                <span className="text-sm font-semibold text-claude-on-surface/60 group-hover:text-claude-on-surface/80">Refazer</span>
                <span
                  onClick={(e) => { e.stopPropagation(); setShowPlanModal(true) }}
                  className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-claude-bg text-[10px] font-black shadow-[0_0_8px_rgba(245,158,11,0.4)] hover:scale-110 transition-transform"
                  title="Ver planos"
                >$</span>
              </motion.button>

              {/* Gerar Veredito */}
              <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                onClick={openWizard}
                className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-claude-primary/8 border border-claude-primary/25 hover:bg-claude-primary/18 hover:border-claude-primary/45 transition-all group shadow-[0_0_18px_rgba(168,85,247,0.06)] hover:shadow-[0_0_30px_rgba(168,85,247,0.18)]"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">🏆</span>
                <span className="text-sm font-bold text-claude-primary">Gerar Veredito</span>
              </motion.button>
            </div>
          </div>
        </div>
      ) : !isDone && !loading && hasOptions && !showFreeInput ? (
        /* ── BOTÕES DE OPÇÃO ── */
        <div className="border-t border-claude-border/20 p-4 bg-claude-glass backdrop-blur-2xl z-10">
          <div className="max-w-xl mx-auto space-y-2">
            <p className="text-[9px] text-claude-muted/25 font-mono text-center tracking-[0.12em] uppercase mb-1">
              Toque em uma opção
            </p>
            {lastParsed!.options!.map((opt: string, oi: number) => {
              const isOther = opt.includes('Outro') || opt.includes('🖊️')
              return (
                <motion.button key={oi}
                  whileHover={{ scale: 1.01, x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => isOther ? setShowFreeInput(true) : sendMessage(opt)}
                  className={`w-full flex items-center gap-3 text-left py-3 px-4 rounded-xl border transition-all duration-200 text-sm group ${
                    isOther
                      ? 'bg-claude-input hover:bg-white/[0.04] border-claude-border/50 text-claude-on-surface/50 hover:text-claude-on-surface/70'
                      : 'bg-claude-primary/3 hover:bg-claude-primary/8 border-claude-primary/10 hover:border-claude-primary/25 text-claude-on-surface/80'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isOther
                      ? 'bg-claude-input border border-claude-border/40 text-claude-muted/60'
                      : 'bg-claude-primary/10 border border-claude-primary/20 text-claude-primary group-hover:bg-claude-primary/20'
                  }`}>
                    {isOther ? '✎' : OPTION_ICONS[oi] || '•'}
                  </span>
                  <span className="flex-1 font-medium">{opt}</span>
                  {!isOther && (
                    <svg className="w-4 h-4 text-claude-primary/20 group-hover:text-claude-primary/50 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      ) : !isDone ? (
        /* ── INPUT ── */
        <div className="border-t border-claude-border/20 p-4 bg-claude-glass backdrop-blur-2xl z-10">
          <div className="max-w-2xl mx-auto flex gap-2.5 items-end">
            <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden self-end mb-0.5"
              style={{ border: '2px solid rgba(168,85,247,0.2)' }}>
              <MiroAvatar />
            </div>
            <div className="flex-1 flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
                placeholder="Manda a real..."
                disabled={loading}
                className="flex-1 bg-claude-input border border-claude-border text-claude-on-surface rounded-2xl h-11 px-4 text-sm placeholder:text-claude-muted/30 outline-none transition-all duration-200 focus:border-claude-primary/35 focus:shadow-[0_0_16px_rgba(168,85,247,0.1)] disabled:opacity-40"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="bg-claude-primary hover:bg-claude-primary-hover disabled:bg-claude-input disabled:border disabled:border-claude-border/50 text-white font-bold rounded-2xl h-11 w-11 flex items-center justify-center shadow-[0_0_14px_rgba(168,85,247,0.2)] hover:shadow-[0_0_24px_rgba(168,85,247,0.38)] disabled:shadow-none transition-all flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
      ) : isDone ? (
        /* ── PÓS-VEREDICT ── */
        <div className="border-t border-claude-border/20 p-6 bg-claude-glass backdrop-blur-2xl z-10">
          <div className="max-w-sm mx-auto grid grid-cols-2 gap-3">
            <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setVeredictData(null); setVeredictId(null); setSuggestVeredict(true) }}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-claude-input border border-claude-border hover:border-claude-border-hover hover:bg-white/[0.04] transition-all group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">🔄</span>
              <span className="text-sm font-semibold text-claude-on-surface/60 group-hover:text-claude-on-surface/80">Refazer</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowPlanModal(true)}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-amber-500/5 border border-amber-500/12 hover:bg-amber-500/8 hover:border-amber-500/20 transition-all group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">💰</span>
              <span className="text-sm font-semibold text-amber-400">Upgrade</span>
            </motion.button>
          </div>
        </div>
      ) : null}

      {showWizard && (
        <FinalWizard sessionId={sessionId!} plan={userPlan} socialImages={wizardImages} aiTrack={wizardTrack}
          onClose={() => setShowWizard(false)} onUpgrade={() => setShowPlanModal(true)} />
      )}
      <PlanModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} />
    </div>
  )
}
