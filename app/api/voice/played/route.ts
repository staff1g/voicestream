import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStreamer(request)
    if (auth.error) return auth.error

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    // SECURITY FIX: verify this voice_queue row actually belongs to the
    // caller's own stream before marking it played (previously any streamer
    // could mark/dismiss another streamer's queued voice messages).
    const { data: callerStreamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', auth.session.username)
      .single()

    const { data: item } = await supabase
      .from('voice_queue')
      .select('id, streamer_id')
      .eq('id', id)
      .maybeSingle()

    if (!item || !callerStreamer || item.streamer_id !== callerStreamer.id) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }

    await supabase
      .from('voice_queue')
      .update({ played: true })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Played error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
