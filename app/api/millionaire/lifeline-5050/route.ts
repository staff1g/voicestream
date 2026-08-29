import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireOwnStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername } = await request.json()

    if (!streamerUsername) {
      return NextResponse.json({ error: 'Streamer manquant' }, { status: 400 })
    }

    // SECURITY FIX: this endpoint had NO authentication at all previously -
    // anyone on the internet could trigger a streamer's lifelines for them.
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

    const { data: games } = await supabase
      .from('millionaire_games')
      .select('*')
      .eq('streamer_id', streamer.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    const game = games?.[0]
    if (!game) {
      return NextResponse.json({ error: 'Aucun jeu actif' }, { status: 404 })
    }

    if (game.used_5050) {
      return NextResponse.json({ error: 'Deja utilise' }, { status: 400 })
    }

    const { data: question } = await supabase
      .from('millionaire_questions')
      .select('*')
      .eq('game_id', game.id)
      .eq('level', game.playing_level)
      .single()

    if (!question) {
      return NextResponse.json({ error: 'Aucune question active' }, { status: 404 })
    }

    const wrongOptions = ['A', 'B', 'C', 'D'].filter(o => o !== question.correct_option)
    const shuffled = wrongOptions.sort(() => Math.random() - 0.5)
    const eliminated = shuffled.slice(0, 2)

    await supabase
      .from('millionaire_games')
      .update({ used_5050: true, eliminated_options: eliminated })
      .eq('id', game.id)

    return NextResponse.json({ success: true, eliminated })
  } catch (error: any) {
    console.error('5050 error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 
