import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VeredictCard } from '@/components/card/veredict-card'

export default async function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const { data: veredict } = await supabase
    .from('veredits')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('id', id)
    .single()

  if (!veredict) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🔮</div>
          <h1 className="text-2xl font-black">Veredito não encontrado</h1>
          <p className="text-white/50 mt-2">Esse veredito não existe ou foi removido.</p>
          <a href="/" className="inline-block mt-4 text-purple-400 hover:text-purple-300">← Voltar</a>
        </div>
      </div>
    )
  }

  const gradient = veredict.niche_colors
    ? `linear-gradient(135deg, ${veredict.niche_colors.primary}, ${veredict.niche_colors.secondary})`
    : 'linear-gradient(135deg, #8B5CF6, #EC4899)'

  return (
    <div className="min-h-screen bg-gray-950" style={{ background: gradient }}>
      <VeredictCard veredict={veredict} />
    </div>
  )
}
