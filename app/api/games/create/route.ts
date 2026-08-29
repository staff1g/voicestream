import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireOwnStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername, questions } = await request.json()

    if (!streamerUsername || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
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

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        streamer_id: streamer.id,
        status: 'waiting',
        current_question_index: 0,
      })
      .select()
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: 'Erreur creation game' }, { status: 500 })
    }

    const questionsToInsert = questions.map((q: any, i: number) => ({
      game_id: game.id,
      secret_answer: q.answer.trim().toLowerCase(),
      hint: q.hint || '',
      order_index: i,
    }))

    const { error: questionsError } = await supabase
      .from('game_questions')
      .insert(questionsToInsert)

    if (questionsError) {
      return NextResponse.json({ error: 'Erreur creation questions' }, { status: 500 })
    }

    return NextResponse.json({ success: true, gameId: game.id })
  } catch (error: any) {
    console.error('Create game error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}