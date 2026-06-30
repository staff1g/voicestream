import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername, chatterUsername, amount } = await request.json()

    if (!streamerUsername || !chatterUsername) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const passAmount = Number(amount) || 1

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', streamerUsername)
      .single()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    let { data: chatter } = await supabase
      .from('chatters')
      .select('id')
      .ilike('username', chatterUsername)
      .single()

    if (!chatter) {
      const { data: newChatter } = await supabase
        .from('chatters')
        .insert({
          kick_user_id: `manual_${Date.now()}`,
          username: chatterUsername,
        })
        .select()
        .single()
      chatter = newChatter
    }

    if (!chatter) {
      return NextResponse.json({ error: 'Erreur creation chatter' }, { status: 500 })
    }

    const { data: existing } = await supabase
      .from('chatter_passes')
      .select('passes')
      .eq('chatter_id', chatter.id)
      .eq('streamer_id', streamer.id)
      .single()

    if (existing) {
      await supabase
        .from('chatter_passes')
        .update({ passes: existing.passes + passAmount, updated_at: new Date().toISOString() })
        .eq('chatter_id', chatter.id)
        .eq('streamer_id', streamer.id)
    } else {
      await supabase
        .from('chatter_passes')
        .insert({
          chatter_id: chatter.id,
          streamer_id: streamer.id,
          passes: passAmount,
        })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Give pass error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 
