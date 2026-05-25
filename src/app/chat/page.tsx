import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'

export default async function ChatPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Verificar se tem ao menos 2 conexões
  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform')
    .eq('user_id', user.id)

  const connectedCount = connections?.length || 0
  if (connectedCount < 1) redirect('/connect')

  return <ChatInterface />
}
