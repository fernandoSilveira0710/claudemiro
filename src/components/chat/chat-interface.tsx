'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { ClaudemiroBot } from '@/components/claudemiro-bot'

type Message = {
  role: 'claudemiro' | 'user'
  content: string
  type?: 'questions' | 'reply' | 'intro'
  questions?: string[]
}

const MODE_OPTIONS = [
  { 
    id: 'engracado', 
    icon: '😈', 
    label: 'Engraçado', 
    desc: 'Zoeira pesada, humor ácido, sem filtro', 
    tag: '🔥 Mais escolhido',
    highlight: true,
  },
  { 
    id: 'casual', 
    icon: '✌️', 
    label: 'Casual', 
    desc: 'Leve e descontraído, na boa',
    tag: '🌿 Suave',
  },
  { 
    id: 'profissional', 
    icon: '🧐', 
    label: 'Profissional', 
    desc: 'Sério e analítico, sem zoeira',
    tag: '📊 Técnico',
  },
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<string | null>(null)
  const [initializing, setInitializing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startChat = async (selectedMode: string) => {
    setInitializing(selectedMode)
    
    // Delay dramático pra dar clima de terminal
    await new Promise(r => setTimeout(r, 1200))
    
    setMode(selectedMode)
    setInitializing(null)
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '__START__', mode: selectedMode }),
    })

    const data = await res.json()
    setMessages([
      { role: 'claudemiro', content: data.intro, type: 'intro', questions: data.questions },
    ])
    setLoading(false)
  }

  const handleQuestionClick = (question: string) => {
    if (answeredQuestions.includes(question)) return
    setAnsweredQuestions(prev => [...prev, question])
    setInput(question)
    sendMessage(question)
  }

  const sendMessage = async (text?: string) => {
    const msg = text || input
    if (!msg.trim()) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)

    const chatHistory = messages.map(m => ({
      role: m.role === 'claudemiro' ? 'assistant' : 'user',
      content: m.content,
    }))

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, mode, chatHistory }),
    })

    const data = await res.json()
    setMessages(prev => [...prev, { role: 'claudemiro', content: data.content, type: 'reply' }])
    setLoading(false)
  }

  // Mode selection
  if (!mode) {
    const initMode = MODE_OPTIONS.find(o => o.id === initializing)
    
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center relative overflow-hidden">
        {/* Fundo matrix sutil */}
        <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-20 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-pink-600/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative text-center space-y-6 max-w-lg px-4 z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-28 h-28 mx-auto flex items-center justify-center claude-bot-glow"
          >
            <ClaudemiroBot />
          </motion.div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {initializing ? 'INICIALIZANDO...' : 'Claudemiro vai te entrevistar'}
            </h1>
            <p className="text-[#F3E8FF]/50 mt-2 text-sm">
              {initializing ? 'Preparando o protocolo de julgamento...' : 'Escolha o tom. Depois é só responder. Sem filtro.'}
            </p>
          </div>

          {initializing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-6 space-y-3"
            >
              <p className="text-[#F3E8FF]/40 font-mono text-xs tracking-wider">
                {initMode?.id === 'engracado' && '⚡ INICIALIZANDO PROTOCOLO DE ZOEIRA...'}
                {initMode?.id === 'casual' && '🌿 CARREGANDO MODO SUAVE...'}
                {initMode?.id === 'profissional' && '📊 COMPILANDO ANÁLISE TÉCNICA...'}
              </p>
              <div className="flex justify-center gap-1">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-purple-500 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 1, delay: i * 0.12, repeat: Infinity }}
                  />
                ))}
              </div>
              <p className="text-[#F3E8FF]/20 text-[10px] font-mono">[CARREGANDO SYSTEM PROMPT...]</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {MODE_OPTIONS.map((opt, i) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startChat(opt.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border group relative overflow-hidden ${
                    opt.highlight 
                      ? 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-400/40 shadow-[0_0_20px_rgba(168,85,247,0.08)] hover:shadow-[0_0_35px_rgba(168,85,247,0.2)]' 
                      : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
                  }`}
                >
                  {/* Brilho de fundo no hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/0 group-hover:from-purple-500/[0.02] group-hover:via-purple-500/[0.04] group-hover:to-purple-500/[0.02] transition-all duration-500" />
                  
                  <div className="relative flex items-center gap-4">
                    <span className="text-3xl w-12 h-12 flex items-center justify-center rounded-xl bg-white/[0.03] group-hover:bg-white/[0.06] transition-colors">
                      {opt.icon}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-bold text-white group-hover:text-purple-200 transition-colors">
                          {opt.label}
                        </div>
                        {opt.tag && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            opt.highlight ? 'bg-purple-500/20 text-purple-300' : 'bg-white/[0.04] text-[#F3E8FF]/25'
                          }`}>
                            {opt.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#F3E8FF]/30 group-hover:text-[#F3E8FF]/50 transition-colors mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Chat view
  const modeInfo = MODE_OPTIONS.find(o => o.id === mode)!

  return (
    <div className="min-h-screen bg-[#0D0221] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] p-4 flex items-center justify-between bg-[#0D0221]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center claude-bot-glow -ml-2">
            <ClaudemiroBot />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Claudemiro</h1>
            <span className="text-xs text-[#F3E8FF]/30">
              {modeInfo.icon} Modo {modeInfo.label}
            </span>
          </div>
        </div>
        <span className="text-xs bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full font-medium">
          online
        </span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-purple-500/20 border border-purple-500/20 text-white rounded-br-md shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    : 'bg-white/[0.03] border border-white/[0.05] text-[#F3E8FF] rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>

                {msg.questions && (
                  <div className="mt-3 space-y-1.5">
                    {msg.questions.map((q, qi) => (
                      <button
                        key={qi}
                        onClick={() => handleQuestionClick(q)}
                        disabled={answeredQuestions.includes(q)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all ${
                          answeredQuestions.includes(q)
                            ? 'bg-white/[0.02] text-[#F3E8FF]/15 cursor-not-allowed line-through'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] text-[#F3E8FF]/70 hover:text-white border border-white/[0.04] cursor-pointer'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-purple-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-purple-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] p-4 bg-[#0D0221]/90 backdrop-blur">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Manda a real..."
            className="bg-white/[0.03] border-white/[0.06] text-white rounded-2xl h-12 text-sm placeholder:text-[#F3E8FF]/20 focus:ring-purple-500/20"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-purple-500 hover:bg-purple-600 disabled:bg-white/[0.03] disabled:text-[#F3E8FF]/15 text-white font-bold rounded-2xl h-12 w-12 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.35)]"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
