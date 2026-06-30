 
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername, answer, hint } = await request.json()

    if (!streamerUsername || !answer) {
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

    let { data: game } = await supabase
      .from('games')
      .select('id, current_question_index')
      .eq('streamer_id', streamer.id)
      .eq('status', 'active')
      .single()

    if (!game) {
      const { data: newGame } = await supabase
        .from('games')
        .insert({ streamer_id: streamer.id, status: 'active', current_question_index: 0 })
        .select()
        .single()
      game = newGame
    }

    if (!game) {
      return NextResponse.json({ error: 'Erreur creation game' }, { status: 500 })
    }

    const { data: existingQuestions } = await supabase
      .from('game_questions')
      .select('id', { count: 'exact' })
      .eq('game_id', game.id)

    const nextOrderIndex = existingQuestions?.length || 0

    await supabase
      .from('game_questions')
      .insert({
        game_id: game.id,
        secret_answer: answer.trim().toLowerCase(),
        hint: hint || '',
        order_index: nextOrderIndex,
      })

    await supabase
      .from('games')
      .update({ current_question_index: nextOrderIndex })
      .eq('id', game.id)

    return NextResponse.json({ success: true, gameId: game.id })
  } catch (error: any) {
    console.error('Add question error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}