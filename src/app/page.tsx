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

  const { count: vereditsCount } = await supabase
    .from('veredits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: connectionsCount } = await supabase
    .from('social_connections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <DashboardPage
      profile={profile}
      vereditsCount={vereditsCount || 0}
      connectionsCount={connectionsCount || 0}
    />
  )
}
