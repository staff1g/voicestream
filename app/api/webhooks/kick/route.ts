import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const eventType = request.headers.get('Kick-Event-Type')

    if (eventType === 'channel.reward.redemption.updated') {
      await handleRewardRedemption(body)
      return NextResponse.json({ received: true })
    }

    if (eventType === 'chat.message.sent') {
      await handleChatMessage(body)
      await handleChatActivity(body)
      return NextResponse.json({ received: true })
    }

    if (eventType === 'livestream.status.updated') {
      await handleStreamStatus(body)
      return NextResponse.json({ received: true })
    }

    if (eventType === 'channel.subscription.new') {
      await handleNewSubscription(body)
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ received: true })
  }
}

async function findOrCreateChatter(kickUserId: string, username: string) {
  const { data: existing } = await supabase
    .from('chatters')
    .select('id')
    .ilike('username', username)
    .maybeSingle()

  if (existing) return existing

  const { data: byKickId } = await supabase
    .from('chatters')
    .select('id')
    .eq('kick_user_id', kickUserId)
    .maybeSingle()

  if (byKickId) return byKickId

  const { data: newChatter } = await supabase
    .from('chatters')
    .upsert({ kick_user_id: kickUserId, username }, { onConflict: 'username' })
    .select()
    .single()

  return newChatter
}

async function addPasses(chatterId: string, streamerId: string, amount: number) {
  const { data: existing } = await supabase
    .from('chatter_passes')
    .select('passes')
    .eq('chatter_id', chatterId)
    .eq('streamer_id', streamerId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('chatter_passes')
      .update({ passes: existing.passes + amount, updated_at: new Date().toISOString() })
      .eq('chatter_id', chatterId)
      .eq('streamer_id', streamerId)
  } else {
    await supabase
      .from('chatter_passes')
      .insert({ chatter_id: chatterId, streamer_id: streamerId, passes: amount })
  }
}

async function handleRewardRedemption(body: any) {
  const chatterKickId = String(body.redeemer?.user_id)
  const chatterUsername = body.redeemer?.username
  const broadcasterChannelId = String(body.broadcaster?.user_id)
  const rewardId = body.reward?.id

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id, reward_id')
    .eq('kick_user_id', broadcasterChannelId)
    .maybeSingle()

  if (!streamer) return
  if (streamer.reward_id && streamer.reward_id !== rewardId) return

  const chatter = await findOrCreateChatter(chatterKickId, chatterUsername)
  if (!chatter) return

  await addPasses(chatter.id, streamer.id, 1)
}

async function handleChatMessage(body: any) {
  const broadcasterChannelId = String(body.broadcaster?.user_id)
  const senderUsername = body.sender?.username
  const content = (body.content || '').trim().toLowerCase()

  if (!content || !senderUsername) return

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .eq('kick_user_id', broadcasterChannelId)
    .maybeSingle()

  if (!streamer) return

  const { data: games } = await supabase
    .from('games')
    .select('id, current_question_index')
    .eq('streamer_id', streamer.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  const game = games?.[0]
  if (!game) return

  const { data: question } = await supabase
    .from('game_questions')
    .select('*')
    .eq('game_id', game.id)
    .eq('order_index', game.current_question_index)
    .maybeSingle()

  if (!question || question.answered_by) return

  if (content === question.secret_answer) {
    await supabase
      .from('game_questions')
      .update({ answered_by: senderUsername, answered_at: new Date().toISOString() })
      .eq('id', question.id)

    const { data: existingScore } = await supabase
      .from('game_scores')
      .select('points')
      .eq('game_id', game.id)
      .eq('chatter_username', senderUsername)
      .maybeSingle()

    if (existingScore) {
      await supabase
        .from('game_scores')
        .update({ points: existingScore.points + 1 })
        .eq('game_id', game.id)
        .eq('chatter_username', senderUsername)
    } else {
      await supabase
        .from('game_scores')
        .insert({ game_id: game.id, chatter_username: senderUsername, points: 1 })
    }

    const nextIndex = game.current_question_index + 1

    await supabase
      .from('games')
      .update({ current_question_index: nextIndex })
      .eq('id', game.id)
  }
}

async function handleChatActivity(body: any) {
  const broadcasterChannelId = String(body.broadcaster?.user_id)
  const senderUsername = body.sender?.username
  const content = body.content || ''

  if (!senderUsername) return

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .eq('kick_user_id', broadcasterChannelId)
    .maybeSingle()

  if (!streamer) return

  const { data: sessions } = await supabase
    .from('stream_sessions')
    .select('id')
    .eq('streamer_id', streamer.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)

  let session = sessions?.[0]

  if (!session) {
    const { data: newSession } = await supabase
      .from('stream_sessions')
      .insert({ streamer_id: streamer.id })
      .select()
      .single()
    session = newSession
  }

  if (!session) return

  await supabase
    .from('chat_activity')
    .insert({
      streamer_id: streamer.id,
      session_id: session.id,
      chatter_username: senderUsername,
      message_content: content,
    })
}

async function handleStreamStatus(body: any) {
  const broadcasterChannelId = String(body.broadcaster?.user_id)
  const isLive = body.is_live

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .eq('kick_user_id', broadcasterChannelId)
    .maybeSingle()

  if (!streamer) return

  if (isLive) {
    await supabase
      .from('stream_sessions')
      .insert({ streamer_id: streamer.id })
  } else {
    await supabase
      .from('stream_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('streamer_id', streamer.id)
      .is('ended_at', null)
  }
}

async function handleNewSubscription(body: any) {
  const broadcasterChannelId = String(body.broadcaster?.user_id)
  const subscriberUsername = body.subscriber?.username
  const subscriberKickId = String(body.subscriber?.user_id)

  if (!subscriberUsername || !subscriberKickId) return

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .eq('kick_user_id', broadcasterChannelId)
    .maybeSingle()

  if (!streamer) return

  const chatter = await findOrCreateChatter(subscriberKickId, subscriberUsername)
  if (!chatter) return

  await addPasses(chatter.id, streamer.id, 5)
}