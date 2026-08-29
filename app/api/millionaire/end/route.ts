import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireOwnStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername } = await request.json()

    if (!streamerUsername) {
      return NextResponse.json({ error: 'Streamer manquant' }, { status: 400 })
    }

    // SECURITY FIX: verify caller owns this streamer account (IDOR fix)
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

    await supabase
      .from('millionaire_games')
      .update({ status: 'finished' })
      .eq('streamer_id', streamer.id)
      .eq('status', 'active')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}