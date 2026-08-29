import { NextRequest, NextResponse } from 'next/server'
import { validateSession, deleteSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

// GET /api/auth/session → validate session, return user info
export async function GET(request: NextRequest) {
  const token = request.cookies.get('bez_session')?.value

  if (!token) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  const session = await validateSession(token)

  if (!session) {
    const res = NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    res.cookies.set('bez_session', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' })
    res.cookies.set('kick_username', '', { path: '/', maxAge: 0, sameSite: 'lax' })
    return res
  }

  // For streamers, also return approval status
  let approved: boolean | undefined
  if (session.role === 'streamer') {
    const { data } = await supabase
      .from('streamers')
      .select('approved')
      .ilike('username', session.username)
      .maybeSingle()

    // Profile deleted (rejected) → destroy session
    if (!data) {
      await deleteSession(token)
      const res = NextResponse.json({ error: 'Account removed' }, { status: 401 })
      res.cookies.set('bez_session', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' })
      res.cookies.set('kick_username', '', { path: '/', maxAge: 0, sameSite: 'lax' })
      return res
    }

    approved = data.approved ?? false
  }

  return NextResponse.json({
    username: session.username,
    role: session.role,
    ...(approved !== undefined && { approved }),
  })
}

// DELETE /api/auth/session → logout
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('bez_session')?.value

  if (token) {
    await deleteSession(token)
  }

  const res = NextResponse.json({ success: true })
  // httpOnly must match for the browser to clear the session cookie
  res.cookies.set('bez_session', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' })
  // Clear all legacy cookies too
  res.cookies.set('kick_username', '', { path: '/', maxAge: 0, sameSite: 'lax' })
  res.cookies.set('kick_user_id', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' })
  res.cookies.set('chatter_username', '', { path: '/', maxAge: 0, sameSite: 'lax' })
  res.cookies.set('chatter_user_id', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' })

  return res
}