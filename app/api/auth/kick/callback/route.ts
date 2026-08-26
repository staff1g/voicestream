import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendApprovalEmail } from '@/lib/email'

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

    // Log available fields once so the dev can check what Kick returns
    console.log('Kick user fields:', Object.keys(user))

    // Grab email if Kick provides it (depends on API version / scope)
    const userEmail = user.email || null

    // Check if this streamer already exists in DB
    const { data: existingStreamer } = await supabase
      .from('streamers')
      .select('id, approved')
      .eq('kick_user_id', String(user.user_id))
      .maybeSingle()

    const isNew = !existingStreamer

    if (isNew) {
      // New streamer: insert with approved = false
      const { error: insertError } = await supabase.from('streamers').insert({
        kick_user_id: String(user.user_id),
        username: user.name,
        email: userEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        approved: false,
      })

      if (insertError) {
        console.error('Supabase insert error:', insertError)
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=db_error`)
      }

      console.log('New streamer registered (pending approval):', user.name, '| email:', userEmail || 'not provided by Kick')

      // Send approval email to the app owner
      try {
        await sendApprovalEmail(user.name, String(user.user_id))
        console.log('Approval email sent for:', user.name)
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError)
      }
    } else {
      // Returning streamer: update tokens + email (in case they didn't have one before)
      const updateData: Record<string, string | null> = {
        username: user.name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }

      // Only overwrite email if we got one from Kick and the DB doesn't have one yet
      if (userEmail) {
        updateData.email = userEmail
      }

      const { error: updateError } = await supabase
        .from('streamers')
        .update(updateData)
        .eq('kick_user_id', String(user.user_id))

      if (updateError) {
        console.error('Supabase update error:', updateError)
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=db_error`)
      }

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

    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`)
    const cookieOpts = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const }
    response.cookies.set('kick_user_id', String(user.user_id), { ...cookieOpts, httpOnly: true })
    response.cookies.set('kick_username', user.name, cookieOpts)

    return response
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=auth_failed`)
  }
}