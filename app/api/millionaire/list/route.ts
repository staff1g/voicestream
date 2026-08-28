import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStreamer } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireStreamer(request)
  if (auth.error) return auth.error

  const streamerUsername = request.nextUrl.searchParams.get('streamer')

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

  const { data: quizzes } = await supabase
    .from('millionaire_games')
    .select('id, name, status, current_level, playing_level, created_at')
    .eq('streamer_id', streamer.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ quizzes: quizzes || [] })
}