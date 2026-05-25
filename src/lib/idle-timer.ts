// Sistema de idle timer — Claudemiro reage ao tempo de inatividade
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

type IdleLevel = 'active' | 'idle_5m' | 'idle_10m' | 'idle_20m' | 'idle_30m'

interface IdleState {
  level: IdleLevel
  minutesIdle: number
  speech: string
  mood: 'normal' | 'bravo' | 'furioso' | 'triste' | 'musical'
}

// ─── FRASES POR NÍVEL DE IDLE ───
const IDLE_SPEECHES: Record<IdleLevel, string[]> = {
  active: [],
  idle_5m: [
    'Tá aí parado... quer que eu desenhe o botão? 🎨',
    '5 minutos olhando pra tela. Tá tudo bem? 👀',
    'Clica em alguma coisa, pô. Não mordo... muito. 🦷',
    'Tô te esperando... seu tempo é meu entretenimento. 🍿',
  ],
  idle_10m: [
    '???? Tá com medo de algo, jogador? 🎮',
    '10 minutos parado... tem free também, fi. 💸',
    'O botão do Google não vai te machucar. Clica. ☝️',
    'Tá esperando um milagre? Sou eu o milagre. ✨',
    'Olha, o plano FREE existe. Não precisa vender rim. 🫘',
    'Cê tá é com medo de ser julgado, né? 😈',
  ],
  idle_20m: [
    'Investe em mim, aposta tudo em mim... 🎵💰',
    '20 minutos! Nem minha ex me fez esperar tanto. 💔',
    'Tô ficando velho aqui. Cadê sua coragem? 👴',
    'Olha... eu já vi pessoas com 1 seguidor ter mais atitude. 🤏',
    'Seu último login foi ontem e você ainda não fez nada. 🫠',
    'Bora descobrir se tu é nerdola ou só um fake? 🥸',
  ],
  idle_30m: [
    '30 MINUTOS. Eu poderia ter julgado 50 pessoas nesse tempo. ⏰',
    'Tá dormindo? Acorda pra vida, Claudemiro tá te esperando! 😤',
    'Isso é um abandono digital. Vou registrar na sua ficha. 📋',
    'Sabe o que eu acho? Que você tá com medo do veredito. 🫵😏',
    'Última chance antes de eu te chamar de covarde oficialmente. 🏳️',
  ],
}

export function useIdleTimer(lastSeenDays: number) {
  const [idleState, setIdleState] = useState<IdleState>({
    level: 'active',
    minutesIdle: 0,
    speech: '',
    mood: 'normal',
  })
  const lastActivity = useRef(Date.now())
  const speechIndex = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const resetIdle = useCallback(() => {
    lastActivity.current = Date.now()
    setIdleState(prev => {
      if (prev.level === 'active') return prev
      return { level: 'active', minutesIdle: 0, speech: '', mood: 'normal' }
    })
  }, [])

  useEffect(() => {
    // Eventos que resetam o idle
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetIdle))

    // Timer que verifica inatividade
    intervalRef.current = setInterval(() => {
      const idleMs = Date.now() - lastActivity.current
      const idleMinutes = Math.floor(idleMs / 60000)

      let level: IdleLevel = 'active'
      if (idleMinutes >= 30) level = 'idle_30m'
      else if (idleMinutes >= 20) level = 'idle_20m'
      else if (idleMinutes >= 10) level = 'idle_10m'
      else if (idleMinutes >= 5) level = 'idle_5m'

      if (level === 'active') return

      // Pegar fala do nível atual
      const speeches = IDLE_SPEECHES[level]
      const speech = speeches[speechIndex.current % speeches.length]

      // Determinar mood do robô
      let mood: IdleState['mood'] = 'normal'
      if (level === 'idle_20m' || level === 'idle_30m') mood = 'furioso'
      else if (level === 'idle_10m') mood = 'bravo'
      else if (level === 'idle_5m') mood = 'triste'

      setIdleState(prev => {
        // Só atualiza se mudou o nível ou a fala
        if (prev.level === level && prev.speech === speech) return prev
        return { level, minutesIdle: idleMinutes, speech, mood }
      })

      // Avançar índice de fala
      speechIndex.current++
    }, 5000) // Verifica a cada 5 segundos

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle))
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [resetIdle])

  return idleState
}

// Combina fala idle com fala de retorno (prioridade: idle > retorno > normal)
export function getCombinedSpeech(
  idleSpeech: string,
  returnSpeech: string,
  normalSpeech: string
): string {
  if (idleSpeech) return idleSpeech
  if (returnSpeech) return returnSpeech
  return normalSpeech
}
