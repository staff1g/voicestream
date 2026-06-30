 
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

  return NextResponse.json({
    game,
    question: question ? {
      hint: question.hint,
      length: question.secret_answer.length,
      answered_by: question.answered_by,
    } : null,
    totalQuestions: totalQuestions?.length || 0,
    scores: scores || [],
  })
}