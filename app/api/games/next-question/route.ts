import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStreamer(request)
    if (auth.error) return auth.error

    const { gameId } = await request.json()

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID manquant' }, { status: 400 })
    }

    const { data: callerStreamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', auth.session.username)
      .single()

    const { data: game } = await supabase
      .from('games')
      .select('current_question_index, streamer_id')
      .eq('id', gameId)
      .single()

    // SECURITY FIX: verify ownership before advancing another streamer's game.
    if (!game || !callerStreamer || game.streamer_id !== callerStreamer.id) {
      return NextResponse.json({ error: 'Game introuvable' }, { status: 404 })
    }

    await supabase
      .from('games')
      .update({ current_question_index: game.current_question_index + 1 })
      .eq('id', gameId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
