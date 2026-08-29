import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createSession } from '@/lib/session'

// SECURITY FIX: matches the new server-side session TTL in lib/session.ts
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

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

    // Upsert chatter 
    let chatterId: string

    const { data: byKickId } = await supabase
      .from('chatters')
      .select('id')
      .eq('kick_user_id', String(user.user_id))
      .maybeSingle()

    if (byKickId) {
      chatterId = byKickId.id
      await supabase
        .from('chatters')
        .update({
          username: user.name,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        })
        .eq('id', byKickId.id)
    } else {
      const { data: byName } = await supabase
        .from('chatters')
        .select('id')
        .ilike('username', user.name)
        .maybeSingle()

      if (byName) {
        chatterId = byName.id
        await supabase
          .from('chatters')
          .update({
            kick_user_id: String(user.user_id),
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          })
          .eq('id', byName.id)
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('chatters')
          .insert({
            kick_user_id: String(user.user_id),
            username: user.name,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          })
          .select('id')
          .single()

        if (insertError || !inserted) {
          console.error('Insert error:', JSON.stringify(insertError))
          return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=db_error`)
        }
        chatterId = inserted.id
      }
    }

    // Create secure session
    const session = await createSession(chatterId, user.name, 'chatter', request.headers.get('user-agent') || undefined)

    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/streamers`)
    const sameSite = 'lax' as const

    response.cookies.set('bez_session', session.token, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite,
    })

    response.cookies.set('chatter_username', user.name, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite,
    })

    // Clean up PKCE cookies
    response.cookies.set('chatter_code_verifier', '', { path: '/', maxAge: 0 })
    response.cookies.set('chatter_state', '', { path: '/', maxAge: 0 })

    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=auth_failed`)
  }
}