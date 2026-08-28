import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
  const auth = await requireStreamer(request)
  if (auth.error) return auth.error

    const { gameId } = await request.json()

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID manquant' }, { status: 400 })
    }

    await supabase
      .from('millionaire_questions')
      .delete()
      .eq('game_id', gameId)

    await supabase
      .from('millionaire_games')
      .delete()
      .eq('id', gameId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete quiz error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}