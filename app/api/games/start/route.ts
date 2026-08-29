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

    // SECURITY FIX: verify gameId belongs to the caller's streamer account
    // before starting it (previously any streamer could start/hijack any
    // other streamer's "guess the word" game).
    const { data: callerStreamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', auth.session.username)
      .single()

    const { data: game } = await supabase
      .from('games')
      .select('id, streamer_id')
      .eq('id', gameId)
      .maybeSingle()

    if (!game || !callerStreamer || game.streamer_id !== callerStreamer.id) {
      return NextResponse.json({ error: 'Game introuvable' }, { status: 404 })
    }

    await supabase
      .from('games')
      .update({ status: 'active', current_question_index: 0 })
      .eq('id', gameId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
