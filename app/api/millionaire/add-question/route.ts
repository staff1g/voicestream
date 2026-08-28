import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
  const auth = await requireStreamer(request)
  if (auth.error) return auth.error

    const { streamerUsername, question, optionA, optionB, optionC, optionD, correctOption, amount } = await request.json()

    if (!streamerUsername || !question) {
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

    const { data: activeGames } = await supabase
      .from('millionaire_games')
      .select('id, current_level')
      .eq('streamer_id', streamer.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    let game = activeGames?.[0] || null

    if (!game) {
      const { data: newGame } = await supabase
        .from('millionaire_games')
        .insert({ streamer_id: streamer.id, status: 'active', current_level: 1 })
        .select()
        .single()
      game = newGame
    }

    if (!game) {
      return NextResponse.json({ error: 'Erreur creation game' }, { status: 500 })
    }

    const { data: existingQuestions } = await supabase
      .from('millionaire_questions')
      .select('id', { count: 'exact' })
      .eq('game_id', game.id)

    const level = (existingQuestions?.length || 0) + 1

    await supabase
      .from('millionaire_questions')
      .insert({
        game_id: game.id,
        level,
        question_text: question,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_option: correctOption,
        amount,
      })

    await supabase
      .from('millionaire_games')
      .update({
        current_level: level,
        used_5050: false,
        used_audience: false,
        used_phone: false,
        eliminated_options: [],
      })
      .eq('id', game.id)

    return NextResponse.json({ success: true, gameId: game.id })
  } catch (error: any) {
    console.error('Add question error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}