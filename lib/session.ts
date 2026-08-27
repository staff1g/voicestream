import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000 // 1 year

export async function createSession(
  userId: string,
  username: string,
  role: 'streamer' | 'chatter'
) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  // Remove any previous sessions for this user+role
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
    .select('user_id, username, role, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return null

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from('sessions').delete().eq('token', token)
    return null
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