import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const HARDCOVER_API = 'https://api.hardcover.app/v1/graphql'

// Hardcover usa token pessoal (não OAuth de app). O usuário gera em
// hardcover.app/account/api e cola aqui — igual ao fluxo do SteamID.
export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })

  const bearer = token.startsWith('Bearer ') ? token : `Bearer ${token}`

  // status_id = 3 → "lido". Conta quantos livros o usuário já terminou.
  const query = `query {
    me {
      username
      user_books_aggregate(where: { status_id: { _eq: 3 } }) {
        aggregate { count }
      }
    }
  }`

  let username = ''
  let booksRead = 0
  try {
    const res = await fetch(HARDCOVER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: bearer },
      body: JSON.stringify({ query }),
    })
    if (!res.ok) return NextResponse.json({ error: 'Token inválido ou API indisponível' }, { status: 502 })
    const json = await res.json()
    const me = json?.data?.me?.[0]
    if (!me) return NextResponse.json({ error: 'Não foi possível ler seus dados' }, { status: 502 })
    username = me.username || ''
    booksRead = me.user_books_aggregate?.aggregate?.count || 0
  } catch {
    return NextResponse.json({ error: 'Erro ao conectar no Hardcover' }, { status: 502 })
  }

  await supabase.from('social_connections').upsert({
    user_id: user.id,
    platform: 'hardcover',
    access_token: token,
    platform_username: username,
    raw_data: { username, stats: { books_read: booksRead } },
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,platform' })

  return NextResponse.json({ success: true, username, booksRead })
}
