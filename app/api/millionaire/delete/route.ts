 
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
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