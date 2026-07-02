import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const codeVerifier = request.cookies.get('kick_code_verifier')?.value

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
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/kick/callback`,
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

    const { error: upsertError } = await supabase.from('streamers').upsert({
      kick_user_id: String(user.user_id),
      username: user.name,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    }, { onConflict: 'kick_user_id' })

    if (upsertError) {
      console.error('Supabase error:', upsertError)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=db_error`)
    }

    console.log('Streamer saved:', user.name)

    try {
      await fetch('https://api.kick.com/public/v1/events/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: [
  { name: 'channel.reward.redemption.updated', version: 1 },
  { name: 'chat.message.sent', version: 1 },
  { name: 'livestream.status.updated', version: 1 },
  { name: 'channel.subscription.new', version: 1 },
],
          method: 'webhook',
          broadcaster_user_id: Number(user.user_id),
        }),
      })
      console.log('Auto-subscribed events for:', user.name)
    } catch (subError) {
      console.error('Auto-subscribe error:', subError)
    }

    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`)
    response.cookies.set('kick_user_id', String(user.user_id), { httpOnly: true })
    response.cookies.set('kick_username', user.name)

    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=auth_failed`)
  }
}