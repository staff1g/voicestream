import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const audio = form.get('audio') as File
    const streamerUsername = form.get('streamer') as string
    const chatterUsername = form.get('chatter_username') as string || 'Anonyme'

    if (!audio || !streamerUsername) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', streamerUsername)
      .single()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    // Upload to Supabase Storage
    const filename = `voice_${Date.now()}.webm`
    const bytes = await audio.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(filename, bytes, {
        contentType: 'audio/webm',
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Erreur upload' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(filename)

    // Save to DB
    await supabase
      .from('voice_queue')
      .insert({
        streamer_id: streamer.id,
        chatter_kick_id: 'web',
        chatter_username: chatterUsername,
        file_url: urlData.publicUrl,
        played: false,
      })

    const { count } = await supabase
      .from('voice_queue')
      .select('*', { count: 'exact' })
      .eq('streamer_id', streamer.id)
      .eq('played', false)

    return NextResponse.json({ success: true, position: count || 1 })
  } catch (error) {
    console.error('Voice send error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}