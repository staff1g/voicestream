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

  const { data: statsData } = await supabase.rpc('get_stream_stats', { p_streamer_id: streamer.id })

  const statsMap: Record<string, { unique_chatters: number; total_messages: number }> = {}
  for (const s of statsData || []) {
    statsMap[s.session_id] = {
      unique_chatters: Number(s.unique_chatters),
      total_messages: Number(s.total_messages),
    }
  }

  const results = []

  for (const session of sessions) {
    const stats = statsMap[session.id] || { unique_chatters: 0, total_messages: 0 }

    const { data: snapshots } = await supabase
      .from('viewer_snapshots')
      .select('viewer_count')
      .eq('session_id', session.id)

    let avgViewers = 0
    let maxViewers = 0

    if (snapshots && snapshots.length > 0) {
      const counts = snapshots.map(s => s.viewer_count)
      avgViewers = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length)
      maxViewers = Math.max(...counts)
    }

    results.push({
      id: session.id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      uniqueChatters: stats.unique_chatters,
      totalMessages: stats.total_messages,
      avgViewers,
      maxViewers,
      snapshotCount: snapshots?.length || 0,
    })
  }

  return NextResponse.json({ sessions: results })
}