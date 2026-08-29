import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game) {
    return NextResponse.json({ error: 'Game introuvable' }, { status: 404 })
  }

  const { data: question } = await supabase
    .from('game_questions')
    .select('*')
    .eq('game_id', gameId)
    .eq('order_index', game.current_question_index)
    .single()

  const { data: totalQuestions } = await supabase
    .from('game_questions')
    .select('id', { count: 'exact' })
    .eq('game_id', gameId)

  const { data: scores } = await supabase
    .from('game_scores')
    .select('chatter_username, points')
    .eq('game_id', gameId)
    .order('points', { ascending: false })

  // SECURITY FIX: this is a public, unauthenticated endpoint (viewers/overlay
  // poll it while the game is in progress). It was returning `secret_answer`
  // in the plain JSON response, so anyone could just read the API response
  // and get the answer instantly. Only expose it once the game is finished.
  const revealAnswer = game.status === 'finished'

  return NextResponse.json({
    game,
    question: question ? {
      hint: question.hint,
      length: question.secret_answer.length,
      answered_by: question.answered_by,
      secret_answer: revealAnswer ? question.secret_answer : null,
      image_url: question.image_url,
    } : null,
    totalQuestions: totalQuestions?.length || 0,
    scores: scores || [],
  })
}