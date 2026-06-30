import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername, chosenOption } = await request.json()

    if (!streamerUsername || !chosenOption) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

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

    const { data: question } = await supabase
      .from('millionaire_questions')
      .select('*')
      .eq('game_id', game.id)
      .eq('level', game.playing_level)
      .single()

    if (!question) {
      return NextResponse.json({ error: 'Aucune question active' }, { status: 404 })
    }

    const isCorrect = chosenOption === question.correct_option

    if (!isCorrect) {
      await supabase
        .from('millionaire_games')
        .update({ status: 'finished' })
        .eq('id', game.id)
    } else {
      await supabase
        .from('millionaire_games')
        .update({ playing_level: game.playing_level + 1 })
        .eq('id', game.id)
    }

    return NextResponse.json({
      correct: isCorrect,
      correctOption: question.correct_option,
      chosenOption,
    })
  } catch (error: any) {
    console.error('Answer error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}