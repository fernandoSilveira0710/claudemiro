import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL))

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`,
    scope: 'read,activity:read',
    approval_prompt: 'auto',
    state: user.id,
  })

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`)
}
