import { supabase } from './supabase'

export async function getValidToken(streamerUsername: string): Promise<string | null> {
  const { data: streamer } = await supabase
    .from('streamers')
    .select('id, access_token, refresh_token')
    .ilike('username', streamerUsername)
    .single()

  if (!streamer) return null

  const testRes = await fetch('https://api.kick.com/public/v1/users', {
    headers: { Authorization: `Bearer ${streamer.access_token}` },
  })

  if (testRes.ok) {
    return streamer.access_token
  }

  if (!streamer.refresh_token) return null

  const refreshRes = await fetch('https://id.kick.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: streamer.refresh_token,
      client_id: process.env.KICK_CLIENT_ID || '',
      client_secret: process.env.KICK_CLIENT_SECRET || '',
    }),
  })

  if (!refreshRes.ok) return null

  const tokens = await refreshRes.json()

  await supabase
    .from('streamers')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || streamer.refresh_token,
    })
    .eq('id', streamer.id)

  return tokens.access_token
} 
