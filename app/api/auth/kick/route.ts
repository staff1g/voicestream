import { NextResponse } from 'next/server'
import crypto from 'crypto'

function base64URLEncode(buffer: Buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function GET() {
  const clientId = process.env.KICK_CLIENT_ID!
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/kick/callback`

  // PKCE
  const codeVerifier = base64URLEncode(crypto.randomBytes(32))
  const codeChallenge = base64URLEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  )
  const state = base64URLEncode(crypto.randomBytes(16))

  const params = new URLSearchParams({
    client_id: clientId,

    redirect_uri: redirectUri,
    response_type: 'code',
   scope: 'user:read channel:read events:subscribe channel:write channel_points:read channel_points:write channel-points:read channel-points:write moderation:ban',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
  })

  const response = NextResponse.redirect(
    `https://id.kick.com/oauth/authorize?${params.toString()}`
  )

  // Save verifier fel cookie
  response.cookies.set('kick_code_verifier', codeVerifier, { httpOnly: true })
  response.cookies.set('kick_state', state, { httpOnly: true })

  return response
}