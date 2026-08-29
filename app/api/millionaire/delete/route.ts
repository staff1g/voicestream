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

    // SECURITY FIX: previously any authenticated streamer could delete ANY
    // other streamer's quiz just by knowing/guessing its gameId. Verify the
    // game actually belongs to the caller before deleting anything.
    const { data: callerStreamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', auth.session.username)
      .single()

    const { data: game } = await supabase
      .from('millionaire_games')
      .select('id, streamer_id')
      .eq('id', gameId)
      .maybeSingle()

    if (!game || !callerStreamer || game.streamer_id !== callerStreamer.id) {
      return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 })
    }

    await supabase
      .from('millionaire_questions')
      .delete()
      .eq('game_id', gameId)

    await supabase
      .from('millionaire_games')
      .delete()
      .eq('id', gameId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete quiz error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
