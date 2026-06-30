 
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const chatterUsername = request.nextUrl.searchParams.get('chatter')
  const streamerUsername = request.nextUrl.searchParams.get('streamer')

  if (!chatterUsername || !streamerUsername) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { data: chatter } = await supabase
    .from('chatters')
    .select('id')
    .ilike('username', chatterUsername)
    .single()

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .ilike('username', streamerUsername)
    .single()

  if (!chatter || !streamer) {
    return NextResponse.json({ passes: 0 })
  }

  const { data: passRecord } = await supabase
    .from('chatter_passes')
    .select('passes')
    .eq('chatter_id', chatter.id)
    .eq('streamer_id', streamer.id)
    .single()

  return NextResponse.json({ passes: passRecord?.passes || 0 })
}