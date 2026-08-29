import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
// SECURITY FIX: sessions previously lasted 1 year with no rotation, so a
// stolen cookie stayed valid for a year no matter what. Replaced with a
// sliding idle window (re-extended on activity, so active users are never
// interrupted) capped by a hard absolute lifetime (so even a
// continuously-used, stolen session eventually forces re-authentication).

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const IDLE_TTL_MS = 30 * 24 * 60 * 60 * 1000       // 30 days of inactivity -> expired
const ABSOLUTE_TTL_MS = 180 * 24 * 60 * 60 * 1000  // 180 days since creation, hard cap regardless of activity

// Only actually write a refresh to the DB when the session would otherwise
// expire within this window - avoids an UPDATE on literally every request
// for active users, while still keeping them logged in seamlessly.
const REFRESH_WHEN_REMAINING_MS = 5 * 24 * 60 * 60 * 1000 // 5 days

export async function createSession(
  userId: string,
  username: string,
  role: 'streamer' | 'chatter',
  userAgent?: string
) {
  const token = crypto.randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + IDLE_TTL_MS)

  // Remove any previous sessions for this user+role. This keeps the
  // current "one active session per role" behavior, which also means
  // listSessions()/revokeAllSessions() below are mostly forward-looking
  // scaffolding for a future multi-device login model rather than
  // something that does much today - flagging this explicitly since it's
  // a deliberate choice, not an oversight.
  await supabase
    .from('sessions')
    .delete()
    .eq('user_id', userId)
    .eq('role', role)

  const { error } = await supabase.from('sessions').insert({
    token,
    user_id: userId,
    username,
    role,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    last_seen_at: now.toISOString(),
    user_agent: userAgent || null,
  })

  if (error) {
    console.error('Failed to create session:', error)
    throw error
  }

  return { token, expiresAt }
}

export async function validateSession(token: string) {
  if (!token) return null

  const { data, error } = await supabase
    .from('sessions')
    .select('user_id, username, role, expires_at, created_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return null

  const now = new Date()
  const expiresAt = new Date(data.expires_at)

  if (expiresAt < now) {
    await supabase.from('sessions').delete().eq('token', token)
    return null
  }

  // BACKWARD COMPATIBILITY: sessions created before this change may not
  // have created_at backfilled correctly in edge cases - fall back to
  // "now" so they simply get a fresh ABSOLUTE_TTL_MS window rather than
  // erroring or being force-logged-out by this migration.
  const createdAt = data.created_at ? new Date(data.created_at) : now
  const absoluteExpiry = new Date(createdAt.getTime() + ABSOLUTE_TTL_MS)

  if (absoluteExpiry < now) {
    // Hard cap reached even though the idle window hadn't run out -
    // require fresh login.
    await supabase.from('sessions').delete().eq('token', token)
    return null
  }

  // Silent sliding refresh: only bother writing when we're within
  // REFRESH_WHEN_REMAINING_MS of expiring, and never push the new
  // expiry past the absolute cap.
  const remaining = expiresAt.getTime() - now.getTime()
  if (remaining < REFRESH_WHEN_REMAINING_MS) {
    const newExpiry = new Date(Math.min(now.getTime() + IDLE_TTL_MS, absoluteExpiry.getTime()))
    // Fire-and-forget: don't block the request on this write, and don't
    // fail the session check if the refresh itself has a transient error.
    supabase
      .from('sessions')
      .update({ expires_at: newExpiry.toISOString(), last_seen_at: now.toISOString() })
      .eq('token', token)
      .then(({ error: refreshError }) => {
        if (refreshError) console.error('Session refresh failed:', refreshError)
      })
  }

  return {
    userId: data.user_id as string,
    username: data.username as string,
    role: data.role as 'streamer' | 'chatter',
  }
}

export async function deleteSession(token: string) {
  if (!token) return
  await supabase.from('sessions').delete().eq('token', token)
}


export const revokeSession = deleteSession

export interface SessionSummary {
  token: string
  createdAt: string | null
  lastSeenAt: string | null
  expiresAt: string
  userAgent: string | null
}

/**
 * Lists active (non-expired) sessions for a user, for a future
 * "manage devices" / "log out everywhere" UI. Tokens are returned
 * truncated - never show or transmit a full session token back to the
 * client, since that would let the client re-use it to impersonate the
 * session it's supposed to just be describing.
 */
export async function listSessions(userId: string, role?: 'streamer' | 'chatter'): Promise<SessionSummary[]> {
  let query = supabase
    .from('sessions')
    .select('token, created_at, last_seen_at, expires_at, user_agent')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('last_seen_at', { ascending: false })

  if (role) {
    query = query.eq('role', role)
  }

  const { data, error } = await query

  if (error || !data) return []

  return data.map((row) => ({
    token: `${row.token.slice(0, 8)}...`,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    userAgent: row.user_agent,
  }))
}

/**
 * Revokes every active session for a user (optionally scoped to one role),
 * for "log out all devices". Under the current one-session-per-role model
 * this is equivalent to a single deleteSession call, but is written to
 * keep working unchanged if that model is relaxed to allow multiple
 * concurrent sessions per role later.
 */
export async function revokeAllSessions(userId: string, role?: 'streamer' | 'chatter'): Promise<void> {
  let query = supabase.from('sessions').delete().eq('user_id', userId)
  if (role) {
    query = query.eq('role', role)
  }
  await query
}