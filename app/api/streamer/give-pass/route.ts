import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername, chatterUsername, amount } = await request.json()

    if (!streamerUsername || !chatterUsername) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    const callerUsername = request.cookies.get('kick_username')?.value
    if (!callerUsername || callerUsername.toLowerCase() !== streamerUsername.toLowerCase()) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
    }

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', streamerUsername)
      .maybeSingle()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    let { data: chatter } = await supabase
      .from('chatters')
      .select('id')
      .ilike('username', chatterUsername)
      .maybeSingle()

    if (!chatter) {
      const { data: newChatter } = await supabase
        .from('chatters')
        .upsert({ kick_user_id: `manual_${Date.now()}`, username: chatterUsername }, { onConflict: 'username' })
        .select()
        .single()
      chatter = newChatter
    }

    if (!chatter) {
      return NextResponse.json({ error: 'Erreur creation chatter' }, { status: 500 })
    }

    const passAmount = parseInt(amount) || 1

    const { data: existing } = await supabase
      .from('chatter_passes')
      .select('passes')
      .eq('chatter_id', chatter.id)
      .eq('streamer_id', streamer.id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('chatter_passes')
        .update({ passes: existing.passes + passAmount, updated_at: new Date().toISOString() })
        .eq('chatter_id', chatter.id)
        .eq('streamer_id', streamer.id)
    } else {
      await supabase
        .from('chatter_passes')
        .insert({ chatter_id: chatter.id, streamer_id: streamer.id, passes: passAmount })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}