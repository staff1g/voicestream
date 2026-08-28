import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
  const auth = await requireStreamer(request)
  if (auth.error) return auth.error

    const { streamerUsername } = await request.json()

    if (!streamerUsername) {
      return NextResponse.json({ error: 'Streamer manquant' }, { status: 400 })
    }

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id, kick_user_id, access_token')
      .ilike('username', streamerUsername)
      .single()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    const { data: sessions } = await supabase
      .from('stream_sessions')
      .select('id')
      .eq('streamer_id', streamer.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)

    const session = sessions?.[0]
    if (!session) {
      return NextResponse.json({ error: 'Aucun stream actif' }, { status: 404 })
    }

    const res = await fetch(`https://api.kick.com/public/v1/channels?broadcaster_user_id=${streamer.kick_user_id}`, {
      headers: { Authorization: `Bearer ${streamer.access_token}` },
    })

    const data = await res.json()
    const channel = data.data?.[0]
    const viewerCount = channel?.stream?.viewer_count || 0

    await supabase
      .from('viewer_snapshots')
      .insert({
        session_id: session.id,
        viewer_count: viewerCount,
      })

    return NextResponse.json({ success: true, viewer_count: viewerCount })
  } catch (error: any) {
    console.error('Viewer snapshot error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}