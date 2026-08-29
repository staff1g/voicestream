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

const FORBIDDEN = () =>
  NextResponse.json({ error: 'Interdit' }, { status: 403 })

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

/**
 * Use this on any route that receives a `streamerUsername` (or `streamer`)
 * value from the client and performs an action scoped to that streamer.
 * It verifies the caller IS that streamer (via the trusted session, never
 * via a client-supplied cookie or body field) before letting the action proceed.
 */
export async function requireOwnStreamer(
  request: NextRequest,
  claimedUsername: string | null | undefined
): Promise<AuthResult> {
  const result = await requireStreamer(request)
  if (result.error) return result

  if (!claimedUsername || result.session.username.toLowerCase() !== claimedUsername.toLowerCase()) {
    return { session: null, error: FORBIDDEN() }
  }

  return result
}

/**
 * Same idea, but for game/quiz ids: loads the resource's owning streamer_id
 * from the DB and checks it against the caller's session. Pass a loader
 * function that returns the streamer_id for the given resource id (or null
 * if not found).
 */
export async function requireOwnsResource(
  request: NextRequest,
  loadOwnerStreamerId: () => Promise<string | null>,
  lookupStreamerIdBySessionUsername: (username: string) => Promise<string | null>
): Promise<AuthResult> {
  const result = await requireStreamer(request)
  if (result.error) return result

  const ownerId = await loadOwnerStreamerId()
  if (!ownerId) return { session: null, error: NextResponse.json({ error: 'Introuvable' }, { status: 404 }) }

  const callerStreamerId = await lookupStreamerIdBySessionUsername(result.session.username)
  if (!callerStreamerId || callerStreamerId !== ownerId) {
    return { session: null, error: FORBIDDEN() }
  }

  return result
}
