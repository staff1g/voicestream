 
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('Webhook received:', JSON.stringify(body))

    // Kick sends event type in header
    const eventType = request.headers.get('Kick-Event-Type')

    if (eventType !== 'channel.reward_redemption.created') {
      return NextResponse.json({ received: true })
    }

    const redemption = body.redemption || body.data?.redemption
    if (!redemption) {
      return NextResponse.json({ received: true })
    }

    const chatterKickId = String(redemption.user?.id)
    const chatterUsername = redemption.user?.display_name || redemption.user?.login
    const broadcasterChannelId = String(redemption.channel_id)
    const rewardId = redemption.reward?.id

    // Find streamer by kick_user_id
    const { data: streamer } = await supabase
      .from('streamers')
      .select('id, reward_id')
      .eq('kick_user_id', broadcasterChannelId)
      .single()

    if (!streamer) {
      console.error('Streamer not found for channel:', broadcasterChannelId)
      return NextResponse.json({ received: true })
    }

    // Verify this is the right reward
    if (streamer.reward_id && streamer.reward_id !== rewardId) {
      return NextResponse.json({ received: true })
    }

    // Find or create chatter
    let { data: chatter } = await supabase
      .from('chatters')
      .select('id')
      .eq('kick_user_id', chatterKickId)
      .single()

    if (!chatter) {
      const { data: newChatter } = await supabase
        .from('chatters')
        .insert({
          kick_user_id: chatterKickId,
          username: chatterUsername,
        })
        .select()
        .single()
      chatter = newChatter
    }

    if (!chatter) {
      return NextResponse.json({ received: true })
    }

    // Add a pass
    const { data: existing } = await supabase
      .from('chatter_passes')
      .select('passes')
      .eq('chatter_id', chatter.id)
      .eq('streamer_id', streamer.id)
      .single()

    if (existing) {
      await supabase
        .from('chatter_passes')
        .update({ passes: existing.passes + 1, updated_at: new Date().toISOString() })
        .eq('chatter_id', chatter.id)
        .eq('streamer_id', streamer.id)
    } else {
      await supabase
        .from('chatter_passes')
        .insert({
          chatter_id: chatter.id,
          streamer_id: streamer.id,
          passes: 1,
        })
    }

    console.log(`Pass added for ${chatterUsername} on streamer ${streamer.id}`)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ received: true })
  }
}