 
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  
  if (!username) {
    return NextResponse.json({ error: 'Username manquant' }, { status: 400 })
  }

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .eq('username', username)
    .single()

  if (!streamer) {
    return NextResponse.json({ queue: [] })
  }

  const { data: queue } = await supabase
    .from('voice_queue')
    .select('*')
    .eq('streamer_id', streamer.id)
    .eq('played', false)
    .order('created_at', { ascending: true })

  return NextResponse.json({ queue: queue || [] })
}