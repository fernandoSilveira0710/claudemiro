import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

/**
 * GET  /api/reaction?veredictId=...  → { likes, dislikes, mine }
 * POST /api/reaction { veredictId, reaction: 'like'|'dislike' }
 *   - toggle: clicar de novo na mesma reação remove; clicar na outra troca.
 *   - logado usa user_id; anônimo usa hash de IP (perfis públicos).
 */

function anonKey(req: Request): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const ua = req.headers.get('user-agent') || ''
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32)
}

export async function GET(request: Request) {
  const supabase = await createServerSupabase()
  const { searchParams } = new URL(request.url)
  const veredictId = searchParams.get('veredictId')
  if (!veredictId) return NextResponse.json({ error: 'veredictId obrigatório' }, { status: 400 })

  const { data: v } = await supabase
    .from('veredits')
    .select('likes_count, dislikes_count')
    .eq('id', veredictId)
    .single()

  const { data: { user } } = await supabase.auth.getUser()
  let mine: 'like' | 'dislike' | null = null

  if (user) {
    const { data: r } = await supabase
      .from('card_reactions')
      .select('reaction')
      .eq('veredict_id', veredictId)
      .eq('user_id', user.id)
      .maybeSingle()
    mine = (r?.reaction as 'like' | 'dislike' | undefined) || null
  } else {
    const { data: r } = await supabase
      .from('card_reactions')
      .select('reaction')
      .eq('veredict_id', veredictId)
      .eq('anon_key', anonKey(request))
      .maybeSingle()
    mine = (r?.reaction as 'like' | 'dislike' | undefined) || null
  }

  return NextResponse.json({
    likes: v?.likes_count || 0,
    dislikes: v?.dislikes_count || 0,
    mine,
  })
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { veredictId, reaction } = await request.json()
  if (!veredictId || !['like', 'dislike'].includes(reaction)) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  const idCol = user ? 'user_id' : 'anon_key'
  const idVal = user ? user.id : anonKey(request)

  // reação existente
  const { data: existing } = await supabase
    .from('card_reactions')
    .select('id, reaction')
    .eq('veredict_id', veredictId)
    .eq(idCol, idVal)
    .maybeSingle()

  if (existing) {
    if (existing.reaction === reaction) {
      // toggle off
      await supabase.from('card_reactions').delete().eq('id', existing.id)
    } else {
      // troca
      await supabase.from('card_reactions').update({ reaction }).eq('id', existing.id)
    }
  } else {
    await supabase.from('card_reactions').insert({
      veredict_id: veredictId,
      user_id: user ? user.id : null,
      anon_key: user ? null : idVal,
      reaction,
    })
  }

  // contadores já atualizados pelo trigger
  const { data: v } = await supabase
    .from('veredits')
    .select('likes_count, dislikes_count')
    .eq('id', veredictId)
    .single()

  const mine = existing?.reaction === reaction ? null : reaction
  return NextResponse.json({ likes: v?.likes_count || 0, dislikes: v?.dislikes_count || 0, mine })
}
