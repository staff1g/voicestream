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

  return NextResponse.json({ game, question })
}