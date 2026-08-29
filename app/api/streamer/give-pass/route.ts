import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireOwnStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { streamerUsername, chatterUsername, amount } = await request.json()

    if (!streamerUsername || !chatterUsername) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    // SECURITY FIX: ownership was previously verified against the
    // `kick_username` cookie, which is NOT httpOnly and can be freely
    // edited in the browser. Any logged-in streamer could rewrite that
    // cookie to another streamer's name and grant themselves unlimited
    // passes. We now verify against the server-validated session instead.
    const auth = await requireOwnStreamer(request, streamerUsername)
    if (auth.error) return auth.error

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

    // Bound the amount so a compromised/careless dashboard call can't mint
    // an absurd number of passes in one request.
    const passAmount = Math.min(Math.max(parseInt(amount) || 1, 1), 1000)

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
