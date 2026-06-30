import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername } = await request.json()

    if (!streamerUsername) {
      return NextResponse.json({ error: 'Streamer manquant' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'Aucun jeu actif' }, { status: 404 })
    }

    if (game.used_phone) {
      return NextResponse.json({ error: 'Deja utilise' }, { status: 400 })
    }

    await supabase
      .from('millionaire_games')
      .update({ used_phone: true })
      .eq('id', game.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Phone lifeline error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 
