import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetupUsername } from './setup-username'
import { DashboardPage } from './dashboard'

export default async function HomePage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.username) return <SetupUsername />

  // Calcular dias desde último login
  const lastLogin = profile.last_login ? new Date(profile.last_login) : null
  const now = new Date()
  const lastSeenDays = lastLogin ? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : 0

  // Atualizar último login
  await supabase.from('profiles').update({ last_login: now.toISOString() }).eq('id', user.id)

  const { count: vereditsCount } = await supabase
    .from('veredits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { data: connections } = await supabase
    .from('social_connections')
    .select('platform, raw_data')
    .eq('user_id', user.id)

  const connectionsCount = connections?.length || 0
  const connectionPlatforms = connections?.map(c => c.platform) || []
  const connectionsData = connections?.map(c => ({ platform: c.platform, data: c.raw_data })) || []

  return (
    <DashboardPage
      profile={profile}
      vereditsCount={vereditsCount || 0}
      connectionsCount={connectionsCount}
      connectionPlatforms={connectionPlatforms}
      connectionsData={connectionsData}
      lastSeenDays={lastSeenDays}
    />
  )
}
