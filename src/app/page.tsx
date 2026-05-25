import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetupUsername } from './setup-username'

export default async function HomePage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.username) {
    return <SetupUsername />
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 p-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">CLAUDEMIRO</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full">
            {profile.plan}
          </span>
          <span className="text-white/50">@{profile.username}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-black">
            E aí, {profile.display_name?.split(' ')[0]}
          </h2>
          <p className="text-white/50">
            Claudemiro tá pronto pra te analisar. Só falta conectar suas redes.
          </p>
          <a
            href="/connect"
            className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition"
          >
            Conectar Redes →
          </a>
        </div>
      </div>
    </main>
  )
}
