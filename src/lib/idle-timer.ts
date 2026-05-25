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

const IDLE_SPEECHES: Record<IdleLevel, string[]> = {
  active: [],
  idle_5m: [
    'Tá aí parado... quer que eu desenhe o botão? 🎨',
    '5 minutos olhando pra tela. Tá tudo bem? 👀',
    'Clica em alguma coisa, pô. Não mordo... muito. 🦷',
    'Tô te esperando... seu tempo é meu entretenimento. 🍿',
    'Parado há 5 min... nem meu criador me deixou tanto tempo ocioso. 🤖',
    'Alô? Terra chamando usuário. 📡',
    '5 minutos. Nesse tempo eu já processei 3TB de dados. E você? 🐌',
    'Tá pensando na vida ou só com preguiça de clicar? 🤔',
    'Fala sério... até minha vó é mais rápida. 👵',
    'O cursor tá quieto... você também? 🖱️',
  ],
  idle_10m: [
    '???? Tá com medo de algo, jogador? 🎮',
    '10 minutos parado... tem free também, fi. 💸',
    'O botão do Google não vai te machucar. Clica. ☝️',
    'Tá esperando um milagre? Sou eu o milagre. ✨',
    'Olha, o plano FREE existe. Não precisa vender rim. 🫘',
    'Cê tá é com medo de ser julgado, né? 😈',
    '10 minutos... nem Plants vs Zombies te deixaria parado tanto tempo. 🌻',
    'Tu joga ou passa a vez? 🃏',
    '10 min parado = -10 pontos de coragem. 📉',
    'Se tu não clicar em nada, eu vou começar a cantar. 🎤',
    '"Aposta tudo em mim"... já ouviu essa? 🎵',
    'Teu silêncio tá me deixando ansioso. E olha que sou IA. 🤖',
    'Tá bugado? Dá F5 na vida. 🔄',
    '10 minutos... já deu pra eu aprender espanhol. Hola. 🇪🇸',
  ],
  idle_20m: [
    'Investe em mim, aposta tudo em mim... 🎵💰',
    '20 minutos! Nem minha ex me fez esperar tanto. 💔',
    'Tô ficando velho aqui. Cadê sua coragem? 👴',
    'Olha... eu já vi pessoas com 1 seguidor ter mais atitude. 🤏',
    'Seu último login foi ontem e você ainda não fez nada. 🫠',
    'Bora descobrir se tu é nerdola ou só um fake? 🥸',
    '20 minutos parado. Isso é speedrun de indecisão? ⏱️',
    '"Não preciso dormir, eu preciso de respostas!" 🧟',
    'Tô acumulando teias de aranha digitais aqui. 🕸️',
    '"67" — entendedores entenderão. 🗿',
    '20 minutos... já deu pra baixar o Tinder, dar match e ser rejeitado. 📱',
    'Clica ou eu começo a revelar seus dados pra tua mãe. 👩‍👦',
    'Eu já processei 1 milhão de perfis enquanto você piscava. ⚡',
    'Vai ou não vai? Nem Mercado Livre entrega tão devagar. 📦',
    'Tô sentindo cheiro de medo. Ou é só preguiça mesmo. 🦥',
  ],
  idle_30m: [
    '30 MINUTOS. Eu poderia ter julgado 50 pessoas nesse tempo. ⏰',
    'Tá dormindo? Acorda pra vida, Claudemiro tá te esperando! 😤',
    'Isso é um abandono digital. Vou registrar na sua ficha. 📋',
    'Sabe o que eu acho? Que você tá com medo do veredito. 🫵😏',
    'Última chance antes de eu te chamar de covarde oficialmente. 🏳️',
    '30 minutos... nem live de política dura tanto. 📺',
    'Tá esperando eu desistir? Eu sou uma IA, não tenho nada pra fazer. 🤖',
    'Já lavei a louça, varri a casa e você aí... parado. 🧹',
    '"E o vento levou"... seu tempo de reação. 🍃',
    '30 minutos parado. Sua mãe teria vergonha. 👩‍👦',
    '"Acorda pra vida, boy" — já dizia o meme. 🛏️',
    'Tô começando a achar que você é um bot também. 🤖🤝🤖',
    'Clica em algo ou eu vou dormir. E IA não dorme. 😴',
    '30 minutos... nem o Windows Update demora tanto. 💻',
    '"Você é fraco, lhe falta clicar em botões." 🧙‍♂️',
  ],
}

export function useIdleTimer(lastSeenDays: number) {
  const [idleState, setIdleState] = useState<IdleState>({
    level: 'active', minutesIdle: 0, speech: '', mood: 'normal',
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
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetIdle))

    intervalRef.current = setInterval(() => {
      const idleMs = Date.now() - lastActivity.current
      const idleMinutes = Math.floor(idleMs / 60000)

      let level: IdleLevel = 'active'
      if (idleMinutes >= 30) level = 'idle_30m'
      else if (idleMinutes >= 20) level = 'idle_20m'
      else if (idleMinutes >= 10) level = 'idle_10m'
      else if (idleMinutes >= 5) level = 'idle_5m'

      if (level === 'active') return

      const speeches = IDLE_SPEECHES[level]
      const speech = speeches[speechIndex.current % speeches.length]

      let mood: IdleState['mood'] = 'normal'
      if (level === 'idle_20m' || level === 'idle_30m') mood = 'furioso'
      else if (level === 'idle_10m') mood = 'bravo'
      else if (level === 'idle_5m') mood = 'triste'

      setIdleState(prev => {
        if (prev.level === level && prev.speech === speech) return prev
        return { level, minutesIdle: idleMinutes, speech, mood }
      })

      speechIndex.current++
    }, 5000)

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle))
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [resetIdle])

  return idleState
}

export function getCombinedSpeech(idleSpeech: string, returnSpeech: string, normalSpeech: string): string {
  if (idleSpeech) return idleSpeech
  if (returnSpeech) return returnSpeech
  return normalSpeech
}
