import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL))

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitch/callback`,
    scope: 'user:read:email',
    state: user.id,
  })

  return NextResponse.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`)
}
