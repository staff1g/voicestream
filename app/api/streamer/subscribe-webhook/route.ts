import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getValidToken } from '@/lib/kickAuth'
import { requireOwnStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, rewardId } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username manquant' }, { status: 400 })
    }

    // SECURITY FIX: verify caller owns this streamer account (IDOR fix) -
    // this endpoint changes another account's reward_id and re-subscribes
    // their Kick channel to webhook events using their own access token.
    const auth = await requireOwnStreamer(request, username)
    if (auth.error) return auth.error

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id, kick_user_id')
      .ilike('username', username)
      .single()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    if (rewardId) {
      await supabase
        .from('streamers')
        .update({ reward_id: rewardId })
        .eq('id', streamer.id)
    }

    const token = await getValidToken(username)
    if (!token) {
      return NextResponse.json({ error: 'Token expire, reconnecte-toi via Kick' }, { status: 401 })
    }

    const subRes = await fetch('https://api.kick.com/public/v1/events/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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
        broadcaster_user_id: Number(streamer.kick_user_id),
      }),
    })

    const subData = await subRes.json()
    console.log('Subscription result:', subData)

    if (!subRes.ok) {
      return NextResponse.json({ error: 'Erreur subscription Kick', details: subData }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Subscribe error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}