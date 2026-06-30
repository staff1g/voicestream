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

    if (audio.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10MB)' }, { status: 400 })
    }

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', streamerUsername)
      .single()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    const { data: chatter } = await supabase
      .from('chatters')
      .select('id')
      .ilike('username', chatterUsername)
      .single()

    if (chatter) {
      const { data: passRecord } = await supabase
        .from('chatter_passes')
        .select('passes')
        .eq('chatter_id', chatter.id)
        .eq('streamer_id', streamer.id)
        .single()

      const currentPasses = passRecord?.passes || 0

      if (currentPasses <= 0) {
        return NextResponse.json({ error: 'Aucun pass disponible' }, { status: 403 })
      }

      await supabase
        .from('chatter_passes')
        .update({ passes: currentPasses - 1 })
        .eq('chatter_id', chatter.id)
        .eq('streamer_id', streamer.id)
    }

    const ext = audio.name?.split('.').pop() || 'webm'
    const filename = `voice_${Date.now()}.${ext}`
    const bytes = await audio.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(filename, bytes, { contentType: audio.type || 'audio/webm' })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: `Upload: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(filename)

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
  } catch (error: any) {
    console.error('Voice send error:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}