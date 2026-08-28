import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'

interface Session {
  userId: string
  username: string
  role: 'streamer' | 'chatter'
}

type AuthResult =
  | { session: Session; error: null }
  | { session: null; error: NextResponse }

const UNAUTHORIZED = () =>
  NextResponse.json({ error: 'Non autorise' }, { status: 401 })

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const token = request.cookies.get('bez_session')?.value
  if (!token) return { session: null, error: UNAUTHORIZED() }

  const session = await validateSession(token)
  if (!session) return { session: null, error: UNAUTHORIZED() }

  return { session: session as Session, error: null }
}

export async function requireStreamer(request: NextRequest): Promise<AuthResult> {
  const result = await requireAuth(request)
  if (result.error) return result
  if (result.session.role !== 'streamer') return { session: null, error: UNAUTHORIZED() }
  return result
}

export async function requireChatter(request: NextRequest): Promise<AuthResult> {
  const result = await requireAuth(request)
  if (result.error) return result
  if (result.session.role !== 'chatter') return { session: null, error: UNAUTHORIZED() }
  return result
}