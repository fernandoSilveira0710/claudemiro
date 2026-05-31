import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, display_name')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    plan: profile?.plan || 'FREE',
    display_name: profile?.display_name || user.email,
  })
}
