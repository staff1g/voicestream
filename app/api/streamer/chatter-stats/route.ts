import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const streamerUsername = request.nextUrl.searchParams.get('streamer')
  const chatterUsername = request.nextUrl.searchParams.get('chatter')

  if (!streamerUsername) {
    return NextResponse.json({ error: 'Streamer manquant' }, { status: 400 })
  }

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .ilike('username', streamerUsername)
    .single()

  if (!streamer) {
    return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
  }

  if (chatterUsername) {
    const { data } = await supabase.rpc('get_chatter_stats', { p_streamer_id: streamer.id })
    const chatterData = (data || []).find((c: any) => c.chatter_username.toLowerCase() === chatterUsername.toLowerCase())

    if (!chatterData) {
      return NextResponse.json({ chatter: chatterUsername, totalMessages: 0, presenceCount: 0, lastSeen: null })
    }

    const { data: lastMsg } = await supabase
      .from('chat_activity')
      .select('created_at')
      .eq('streamer_id', streamer.id)
      .ilike('chatter_username', chatterUsername)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({
      chatter: chatterUsername,
      totalMessages: Number(chatterData.total_messages),
      presenceCount: Number(chatterData.presence_count),
      lastSeen: lastMsg?.[0]?.created_at || null,
    })
  }

  const { data, error: statsError } = await supabase.rpc(
    'get_chatter_stats',
    {
      p_streamer_id: streamer.id
    }
  )

  if (statsError) {
    console.error('Error fetching chatter stats:', statsError)

    return NextResponse.json(
      { error: 'Failed to fetch chatter stats' },
      { status: 500 }
    )
  }

  // Get all chatters banned by this streamer
  const { data: bannedChatters, error: bannedError } = await supabase
    .from('streamer_banned_chatters')
    .select('chatter_username')
    .ilike('streamer_username', streamerUsername)

  if (bannedError) {
    console.error('Error fetching banned chatters:', bannedError)

    return NextResponse.json(
      { error: 'Failed to fetch banned chatters' },
      { status: 500 }
    )
  }

  // Set ,so checking whether someone is banned is fast
  const bannedSet = new Set(
    (bannedChatters || []).map(
      (b: any) => b.chatter_username.toLowerCase()
    )
  )

  // Combine chatter statistics with ban status
  const chatters = (data || []).map((c: any) => ({
    username: c.chatter_username,
    totalMessages: Number(c.total_messages),
    presenceCount: Number(c.presence_count),
    isBanned: bannedSet.has(c.chatter_username.toLowerCase()),
  }))

  return NextResponse.json({ chatters })
}