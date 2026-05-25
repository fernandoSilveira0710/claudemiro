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
  { id: 'engracado', emoji: '😂', label: 'Engraçado', desc: 'Zoeira pesada, humor ácido, sem filtro', color: 'from-amber-500 to-orange-600', glow: 'rgba(245,158,11,0.3)' },
  { id: 'casual', emoji: '✌️', label: 'Casual', desc: 'Leve e descontraído, na boa', color: 'from-blue-500 to-cyan-500', glow: 'rgba(59,130,246,0.3)' },
  { id: 'profissional', emoji: '😎', label: 'Profissional', desc: 'Sério e analítico, sem zoeira', color: 'from-slate-500 to-slate-700', glow: 'rgba(100,116,139,0.3)' },
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startChat = async (selectedMode: string) => {
    setMode(selectedMode)
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
    return (
      <div className="min-h-screen bg-[#0D0221] flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-pink-600/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative text-center space-y-8 max-w-lg px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)] overflow-hidden"
          >
            <div className="scale-[3.5]"><ClaudemiroBot /></div>
          </motion.div>

          <div>
            <h1
              className="text-3xl sm:text-4xl font-black text-white"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Claudemiro vai te entrevistar
            </h1>
            <p className="text-[#F3E8FF]/50 mt-2">
              Escolha o tom. Depois é só responder. Sem filtro.
            </p>
          </div>

          <div className="space-y-3">
            {MODE_OPTIONS.map((opt, i) => (
              <motion.button
                key={opt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startChat(opt.id)}
                className={`w-full text-left p-5 rounded-2xl transition-all border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] group`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{opt.emoji}</span>
                  <div>
                    <div className="text-lg font-bold text-white">{opt.label}</div>
                    <div className="text-sm text-[#F3E8FF]/40">{opt.desc}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] overflow-hidden">
            <div className="scale-[1.8]"><ClaudemiroBot /></div>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Claudemiro</h1>
            <span className="text-xs text-[#F3E8FF]/30">
              {modeInfo.emoji} Modo {modeInfo.label}
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
