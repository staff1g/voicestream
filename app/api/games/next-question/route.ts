 
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { gameId } = await request.json()

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID manquant' }, { status: 400 })
    }

    const { data: game } = await supabase
      .from('games')
      .select('current_question_index')
      .eq('id', gameId)
      .single()

    if (!game) {
      return NextResponse.json({ error: 'Game introuvable' }, { status: 404 })
    }

    await supabase
      .from('games')
      .update({ current_question_index: game.current_question_index + 1 })
      .eq('id', gameId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}