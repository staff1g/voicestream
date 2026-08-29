import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamerUsername: string }> }
) {
  const { streamerUsername } = await params

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
    return NextResponse.json({ game: null, question: null })
  }

  const { data: question } = await supabase
    .from('millionaire_questions')
    .select('*')
    .eq('game_id', game.id)
    .eq('level', game.playing_level)
    .single()

  let timerRemaining = null
  if (game.timer_started_at) {
    const elapsed = Math.floor((Date.now() - new Date(game.timer_started_at + 'Z').getTime()) / 1000)
    timerRemaining = Math.max(0, 30 - elapsed)
  }

  // SECURITY FIX: this is a public, unauthenticated endpoint (viewer overlay
  // polls it during the live game). It was returning the full question row
  // via select('*'), which includes `correct_option` - so anyone could read
  // the right answer straight from the API before choosing. Only send the
  // fields the overlay actually needs to render the question, and only
  // reveal correct_option once the game has already recorded an answer for
  // this question (i.e. after the reveal, matching what the UI shows).
  const alreadyRevealed = game.last_answer_status !== null && game.last_answer_status !== undefined
  const safeQuestion = question ? {
    id: question.id,
    level: question.level,
    question: question.question,
    option_a: question.option_a,
    option_b: question.option_b,
    option_c: question.option_c,
    option_d: question.option_d,
    correct_option: alreadyRevealed ? question.correct_option : null,
  } : null

  return NextResponse.json({ game: { ...game, timer_remaining: timerRemaining }, question: safeQuestion })
}