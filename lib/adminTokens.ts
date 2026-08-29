import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Uses the service role key when available, same pattern as the other
// admin-only routes - this table must never be reachable via the public
// anon key / RLS.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type AdminAction = 'approve' | 'reject'

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Creates a single-use, streamer-specific token for an admin action
 * (approve/reject). Replaces the old design of reusing one static
 * ADMIN_SECRET forever for every action on every streamer.
 */
export async function createAdminActionToken(streamerId: string, action: AdminAction): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')

  const { error } = await supabase
    .from('admin_action_tokens')
    .insert({
      token,
      streamer_id: streamerId,
      action,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    })

  if (error) {
    throw new Error(`Failed to create admin action token: ${error.message}`)
  }

  return token
}

interface TokenLookup {
  id: string
  streamer_id: string
  action: AdminAction
  expires_at: string
  consumed_at: string | null
}

/**
 * Looks up a token without consuming it - safe to call from a GET
 * confirmation page (no side effects, safe for email link-scanners to hit).
 */
export async function peekAdminActionToken(token: string): Promise<TokenLookup | null> {
  if (!token) return null

  const { data } = await supabase
    .from('admin_action_tokens')
    .select('id, streamer_id, action, expires_at, consumed_at')
    .eq('token', token)
    .maybeSingle()

  return data
}

export function isTokenUsable(row: TokenLookup | null): row is TokenLookup {
  if (!row) return false
  if (row.consumed_at) return false
  if (new Date(row.expires_at).getTime() < Date.now()) return false
  return true
}

/**
 * Atomically marks a token consumed. Uses a conditional update (only where
 * consumed_at IS NULL) so two concurrent requests replaying the same token
 * can't both succeed - only the first wins.
 */
export async function consumeAdminActionToken(tokenId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_action_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', tokenId)
    .is('consumed_at', null)
    .select('id')

  if (error) return false
  return (data?.length || 0) > 0
}