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
    return NextResponse.json({ chatters: [] })
  }

  const { data: passes } = await supabase
    .from('chatter_passes')
    .select('passes, updated_at, chatters(id, username)')
    .eq('streamer_id', streamer.id)
    .order('updated_at', { ascending: false })

  const chatters = (passes || []).map((p: any) => ({
    id: p.chatters?.id,
    username: p.chatters?.username,
    passes: p.passes,
    updated_at: p.updated_at,
  }))

  return NextResponse.json({ chatters })
}