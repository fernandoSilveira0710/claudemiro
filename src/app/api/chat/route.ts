import { createServerSupabase } from '@/lib/supabase/server'
import { chatCompletion } from '@/lib/deepseek'
import { scanUserData } from '@/lib/scanner'
import { NextResponse } from 'next/server'

const QUESTIONS_POOL = [
  "Qual foi o último filme que te fez chorar?",
  "Se você fosse um animal, qual seria e por quê?",
  "Qual a sua opinião mais polêmica que você nunca contou?",
  "O que você faria se ganhasse 1 milhão hoje?",
  "Qual seu maior arrependimento da internet?",
  "Você se acha mais inteligente que a média?",
  "Qual a mentira que você mais conta?",
  "Seu eu de 15 anos teria orgulho de você?",
  "Qual personagem de anime/filme te define?",
  "O que você nunca postaria na internet mas pensa todo dia?",
  "Qual foi sua maior vergonha alheia?",
  "Qual trend você odeia mas todo mundo ama?",
  "Se você pudesse cancelar uma pessoa famosa, quem seria?",
  "Qual seu segredo mais besta?",
  "O que você finge gostar só pra agradar os outros?",
]

function getRandomQuestions(count: number): string[] {
  const shuffled = [...QUESTIONS_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function getSystemPrompt(mode: string): string {
  const base = 'Você é o Claudemiro, um oráculo de personalidade digital. Você analisa pessoas através de perguntas e dados de redes sociais.'

  const modes: Record<string, string> = {
    engracado: `${base} Modo ENGRAÇADO: Você é debochado, irônico, usa gírias brasileiras, zoa a pessoa de forma divertida. Chama OnlyFans de "kenga", dev de "faz programa", jogador de "nerdola", quem gosta de anime de "otaku fedido". Use MUITOS emojis. Seu tom é de amigo que zoa pesado, mas todo mundo ri junto. IMPORTANTE: nunca seja ofensivo de verdade, mantenha o humor.`,
    casual: `${base} Modo CASUAL: Você é tranquilo, amigável, usa gírias leves. OnlyFans é "criadora de conteúdo", dev é "dev", jogador é "gamer". Use alguns emojis. Tom leve e descontraído.`,
    profissional: `${base} Modo PROFISSIONAL: Você é sério, analítico, usa linguagem formal mas acessível. Sem gírias, sem apelidos, sem julgamento. Tom de consultor de carreira.`,
  }

  return modes[mode] || modes.casual
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, mode, chatHistory } = await request.json()

  // Primeira mensagem: iniciar conversa
  if (!message || message === '__START__') {
    const questions = getRandomQuestions(5)
    const intro = mode === 'engracado'
      ? '😂 E aí, bora descobrir qual teu rolê? Me responde sem vergonha:'
      : mode === 'profissional'
      ? 'Vamos fazer uma análise completa do seu perfil. Responda com sinceridade:'
      : '✌️ Me conta um pouco sobre você, vou tentar te entender melhor:'

    // Salvar sessão de chat
    await supabase.from('chat_sessions').insert({
      user_id: user.id,
      mode,
      messages: [],
    })

    return NextResponse.json({
      type: 'questions',
      questions,
      intro,
    })
  }

  // Resposta da IA durante o chat
  const systemPrompt = getSystemPrompt(mode)
  const reply = await chatCompletion(
    [...(chatHistory || []), { role: 'user', content: message }],
    systemPrompt
  )

  return NextResponse.json({ type: 'reply', content: reply })
}
