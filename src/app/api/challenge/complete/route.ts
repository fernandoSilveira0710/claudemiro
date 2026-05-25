import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { challengeId } = await request.json()

  await supabase
    .from('challenges')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', challengeId)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
