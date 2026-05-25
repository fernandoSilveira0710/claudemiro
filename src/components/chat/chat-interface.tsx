'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'

type Message = {
  role: 'claudemiro' | 'user'
  content: string
  type?: 'questions' | 'reply' | 'intro'
  questions?: string[]
}

const MODE_OPTIONS = [
  { id: 'engracado', label: '😂 Engraçado', desc: 'Zoeira pesada, humor ácido, sem filtro', color: 'bg-yellow-600 hover:bg-yellow-500' },
  { id: 'casual', label: '✌️ Casual', desc: 'Leve e descontraído, na boa', color: 'bg-blue-600 hover:bg-blue-500' },
  { id: 'profissional', label: '😎 Profissional', desc: 'Sério e analítico, sem zoeira', color: 'bg-gray-600 hover:bg-gray-500' },
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
      {
        role: 'claudemiro',
        content: data.intro,
        type: 'intro',
        questions: data.questions,
      },
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

    const userMsg: Message = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
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

  // Tela de escolha de modo
  if (!mode) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-8 max-w-lg px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-7xl mb-4"
          >
            🤖
          </motion.div>
          <h1 className="text-4xl font-black text-white">
            Claudemiro vai te entrevistar
          </h1>
          <p className="text-white/50">
            Escolha o tom da conversa. Depois é só responder as perguntas.
          </p>
          <div className="space-y-3">
            {MODE_OPTIONS.map(opt => (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startChat(opt.id)}
                className={`w-full ${opt.color} text-white font-bold p-4 rounded-xl text-left transition`}
              >
                <div className="text-lg">{opt.label}</div>
                <div className="text-sm text-white/70">{opt.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Chat interface
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 p-4 flex items-center justify-between bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h1 className="font-bold text-white">Claudemiro</h1>
            <span className="text-xs text-white/40">
              {mode === 'engracado' ? '😂 Modo Engraçado' : mode === 'profissional' ? '😎 Modo Profissional' : '✌️ Modo Casual'}
            </span>
          </div>
        </div>
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">online</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-md'
                    : 'bg-white/10 text-white rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Perguntas clicáveis */}
                {msg.questions && (
                  <div className="mt-3 space-y-2">
                    {msg.questions.map((q, qi) => (
                      <button
                        key={qi}
                        onClick={() => handleQuestionClick(q)}
                        disabled={answeredQuestions.includes(q)}
                        className={`w-full text-left p-3 rounded-xl text-sm transition ${
                          answeredQuestions.includes(q)
                            ? 'bg-white/5 text-white/20 cursor-not-allowed line-through'
                            : 'bg-white/10 hover:bg-white/20 text-white cursor-pointer'
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
              <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4 bg-gray-950">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Responda algo..."
            className="bg-white/5 border-white/10 text-white rounded-xl h-12"
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-purple-600 hover:bg-purple-500 rounded-xl h-12 px-4"
          >
            ↑
          </Button>
        </div>
      </div>
    </div>
  )
}
