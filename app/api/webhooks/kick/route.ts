import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

// ─── Kick's RSA public key (from https://api.kick.com/public/v1/public-key) ──

const KICK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----`

const MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes replay window

// ─── Signature verification ─────────────────────────────────────────

async function verifyWebhook(request: NextRequest): Promise<{ body: any; eventType: string } | NextResponse> {
  const signature = request.headers.get('Kick-Event-Signature')
  const messageId = request.headers.get('Kick-Event-Message-Id')
  const timestamp = request.headers.get('Kick-Event-Message-Timestamp')
  const eventType = request.headers.get('Kick-Event-Type')

  if (!signature || !messageId || !timestamp || !eventType) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 401 })
  }

  // Replay protection
  const ts = new Date(timestamp).getTime()
  if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) {
    return NextResponse.json({ error: 'Webhook timestamp too old' }, { status: 401 })
  }

  // Read raw body
  const rawBody = await request.text()

  // Build the signed payload: messageId.timestamp.rawBody
  const signedPayload = `${messageId}.${timestamp}.${rawBody}`

  // Verify RSA-SHA256 signature using Kick's public key
  try {
    const verifier = crypto.createVerify('SHA256')
    verifier.update(signedPayload)
    verifier.end()

    const isValid = verifier.verify(KICK_PUBLIC_KEY, signature, 'base64')

    if (!isValid) {
      console.warn('Webhook signature verification failed — rejecting')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch (err) {
    console.error('Signature verification error:', err)
    return NextResponse.json({ error: 'Signature verification error' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  return { body, eventType }
}

// ─── Main handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const result = await verifyWebhook(request)

    if (result instanceof NextResponse) return result

    const { body, eventType } = result

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

// ─── Helpers (unchanged) ────────────────────────────────────────────

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

async function addPasses(chatterId: string, streamerId: string, amount: number, chatterUsername?: string, streamerUsername?: string) {
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
      .insert({
        chatter_id: chatterId,
        streamer_id: streamerId,
        passes: amount,
        chatter_username: chatterUsername,
        streamer_username: streamerUsername,
      })
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

  const { data: streamerData } = await supabase.from('streamers').select('username').eq('id', streamer.id).maybeSingle()
  await addPasses(chatter.id, streamer.id, 1, chatterUsername, streamerData?.username)
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

  const session = sessions?.[0]

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
    const { data: streamerData } = await supabase
      .from('streamers')
      .select('username')
      .eq('id', streamer.id)
      .maybeSingle()

    await supabase
      .from('stream_sessions')
      .insert({ streamer_id: streamer.id, streamer_username: streamerData?.username })
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

  const { data: streamerData } = await supabase.from('streamers').select('username').eq('id', streamer.id).maybeSingle()
  await addPasses(chatter.id, streamer.id, 5, subscriberUsername, streamerData?.username)
}