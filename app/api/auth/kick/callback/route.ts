import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createSession } from '@/lib/session'
import { sendApprovalEmail } from '@/lib/email'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

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

    console.log('Kick user fields:', Object.keys(user))
    const userEmail = user.email || null

    // Check if streamer already exists
    const { data: existingStreamer } = await supabase
      .from('streamers')
      .select('id, approved')
      .eq('kick_user_id', String(user.user_id))
      .maybeSingle()

    const isNew = !existingStreamer
    let streamerId: string

    if (isNew) {
      const { data: inserted, error: insertError } = await supabase
        .from('streamers')
        .insert({
          kick_user_id: String(user.user_id),
          username: user.name,
          email: userEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          approved: false,
        })
        .select('id')
        .single()

      if (insertError || !inserted) {
        console.error('Supabase insert error:', insertError)
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=db_error`)
      }

      streamerId = inserted.id
      console.log('New streamer registered (pending):', user.name)

      try {
        await sendApprovalEmail(user.name, String(user.user_id))
        console.log('Approval email sent for:', user.name)
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError)
      }
    } else {
      streamerId = existingStreamer.id

      const updateData: Record<string, string | null> = {
        username: user.name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }
      if (userEmail) updateData.email = userEmail

      await supabase
        .from('streamers')
        .update(updateData)
        .eq('kick_user_id', String(user.user_id))

      console.log('Streamer login:', user.name)
    }

    // Subscribe to events
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

    // Create secure session
    const session = await createSession(streamerId, user.name, 'streamer')

    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`)
    const sameSite = 'lax' as const

    // Primary auth: httpOnly session token (not readable by JS)
    response.cookies.set('bez_session', session.token, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite,
    })

    // Backward compat: username cookie (readable by existing pages)
    response.cookies.set('kick_username', user.name, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite,
    })

    // Clean up PKCE cookies
    response.cookies.set('kick_code_verifier', '', { path: '/', maxAge: 0 })
    response.cookies.set('kick_state', '', { path: '/', maxAge: 0 })

    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=auth_failed`)
  }
}