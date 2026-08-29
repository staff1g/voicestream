import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireOwnStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername, quizName, questions } = await request.json()

    if (!streamerUsername || !quizName || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
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

    const { data: game } = await supabase
      .from('millionaire_games')
      .insert({
        streamer_id: streamer.id,
        status: 'ready',
        current_level: questions.length,
        playing_level: 1,
        name: quizName,
      })
      .select()
      .single()

    if (!game) {
      return NextResponse.json({ error: 'Erreur creation quiz' }, { status: 500 })
    }

    const AMOUNTS = ['1 000', '4 000', '8 000', '16 000', '32 000', '64 000', '125 000', '250 000', '500 000', '1 000 000']

    const questionsToInsert = questions.map((q: any, i: number) => ({
      game_id: game.id,
      level: i + 1,
      question_text: q.question,
      option_a: q.optionA,
      option_b: q.optionB,
      option_c: q.optionC,
      option_d: q.optionD,
      correct_option: q.correctOption,
      amount: AMOUNTS[i] || AMOUNTS[9],
    }))

    await supabase
      .from('millionaire_questions')
      .insert(questionsToInsert)

    return NextResponse.json({ success: true, gameId: game.id })
  } catch (error: any) {
    console.error('Create quiz error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}