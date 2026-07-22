import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const codeVerifier = request.cookies.get('chatter_code_verifier')?.value

  if (!code || !codeVerifier) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=missing_params`)
  }

  try {
    const tokenRes = await fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KICK_CLIENT_ID!,
        client_secret: process.env.KICK_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/chatter/callback`,
        code_verifier: codeVerifier,
        code,
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      console.error('Token error:', tokens)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=no_token`)
    }

    const userRes = await fetch('https://api.kick.com/public/v1/users', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userData = await userRes.json()
    const user = userData.data?.[0]

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=no_user`)
    }

    const { data: existing } = await supabase
      .from('chatters')
      .select('id')
      .ilike('username', user.name)
      .maybeSingle()

  if (existing) {
  const { data: existing } = await supabase
  .from('chatters')
  .select('id')
  .eq('kick_user_id', String(user.user_id))
  .maybeSingle()

if (existing) {
  await supabase
    .from('chatters')
    .update({
      username: user.name,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })
    .eq('id', existing.id)
} else {
  const { data: byName } = await supabase
    .from('chatters')
    .select('id')
    .ilike('username', user.name)
    .maybeSingle()

  if (byName) {
    await supabase
      .from('chatters')
      .update({
        kick_user_id: String(user.user_id),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      })
      .eq('id', byName.id)
  } else {
    const { error: insertError } = await supabase
      .from('chatters')
      .insert({
        kick_user_id: String(user.user_id),
        username: user.name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      })

    if (insertError) {
      console.error('Insert error:', JSON.stringify(insertError))
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=db_error`)
    }
  }
}
    }

    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/streamers`)
    response.cookies.set('chatter_user_id', String(user.user_id), { httpOnly: true })
    response.cookies.set('chatter_username', user.name)

    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=auth_failed`)
  }
}