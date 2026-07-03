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
    const { data: activity } = await supabase
      .from('chat_activity')
      .select('session_id, created_at')
      .eq('streamer_id', streamer.id)
      .ilike('chatter_username', chatterUsername)
      .limit(50000)

    const totalMessages = activity?.length || 0
    const distinctSessions = new Set((activity || []).map(a => a.session_id))
    const presenceCount = distinctSessions.size

    const lastMessage = activity && activity.length > 0
      ? activity.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b)
      : null

    return NextResponse.json({
      chatter: chatterUsername,
      totalMessages,
      presenceCount,
      lastSeen: lastMessage?.created_at || null,
    })
  }

  const { data: allActivity } = await supabase
    .from('chat_activity')
    .select('chatter_username, session_id')
    .eq('streamer_id', streamer.id)
    .limit(50000)

  const statsMap: Record<string, { messages: number; sessions: Set<string> }> = {}

  for (const a of allActivity || []) {
    if (!statsMap[a.chatter_username]) {
      statsMap[a.chatter_username] = { messages: 0, sessions: new Set() }
    }
    statsMap[a.chatter_username].messages++
    statsMap[a.chatter_username].sessions.add(a.session_id)
  }

  const chatters = Object.entries(statsMap).map(([username, data]) => ({
    username,
    totalMessages: data.messages,
    presenceCount: data.sessions.size,
  })).sort((a, b) => b.totalMessages - a.totalMessages)

  return NextResponse.json({ chatters })
}