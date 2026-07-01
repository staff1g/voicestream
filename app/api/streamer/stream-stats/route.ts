import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const streamerUsername = request.nextUrl.searchParams.get('streamer')

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

  const { data: sessions } = await supabase
    .from('stream_sessions')
    .select('id, started_at, ended_at')
    .eq('streamer_id', streamer.id)
    .order('started_at', { ascending: false })

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ sessions: [] })
  }

  const results = []

  for (const session of sessions) {
    const { data: activity } = await supabase
      .from('chat_activity')
      .select('chatter_username')
      .eq('session_id', session.id)

    const uniqueChatters = new Set((activity || []).map(a => a.chatter_username))
    const totalMessages = activity?.length || 0

    results.push({
      id: session.id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      uniqueChatters: uniqueChatters.size,
      totalMessages,
    })
  }

  return NextResponse.json({ sessions: results })
} 
