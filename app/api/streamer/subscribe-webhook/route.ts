import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { username, rewardId } = await request.json()

    if (!username || !rewardId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id, kick_user_id, access_token')
      .ilike('username', username)
      .single()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    // Save reward ID
    await supabase
      .from('streamers')
      .update({ reward_id: rewardId })
      .eq('id', streamer.id)

    // Subscribe to webhook events
    const subRes = await fetch('https://api.kick.com/public/v1/events/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${streamer.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [{ name: 'channel.reward.redemption.updated', version: 1 }],
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
