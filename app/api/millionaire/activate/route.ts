import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireOwnStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername, gameId } = await request.json()

    if (!streamerUsername || !gameId) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    // SECURITY FIX: verify caller owns this streamer account
    const auth = await requireOwnStreamer(request, streamerUsername)
    if (auth.error) return auth.error

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', streamerUsername)
      .single()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    // SECURITY FIX: also verify the gameId being activated actually belongs
    // to this streamer, not just that streamerUsername matches the session -
    // otherwise a caller could pass their own username but someone else's
    // gameId and activate/reset a quiz they don't own.
    const { data: game } = await supabase
      .from('millionaire_games')
      .select('id, streamer_id')
      .eq('id', gameId)
      .maybeSingle()

    if (!game || game.streamer_id !== streamer.id) {
      return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 })
    }

    await supabase
      .from('millionaire_games')
      .update({ status: 'finished' })
      .eq('streamer_id', streamer.id)
      .eq('status', 'active')

    await supabase
      .from('millionaire_games')
      .update({
        status: 'active',
        playing_level: 1,
        used_5050: false,
        used_audience: false,
        used_phone: false,
        eliminated_options: [],
        last_chosen_option: null,
        last_answer_status: null,
      })
      .eq('id', gameId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Activate quiz error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
