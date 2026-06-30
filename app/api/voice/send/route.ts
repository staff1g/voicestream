import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const audio = form.get('audio') as File
    const streamerUsername = form.get('streamer') as string
    const chatterUsername = form.get('chatter_username') as string || 'Anonyme'

    if (!audio || !streamerUsername) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Get streamer from DB
    const { data: streamer } = await supabase
      .from('streamers')
      .select('id')
      .eq('username', streamerUsername)
      .single()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    // Save audio file
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })
    
    const filename = `voice_${Date.now()}.webm`
    const bytes = await audio.arrayBuffer()
    await writeFile(join(uploadsDir, filename), Buffer.from(bytes))

    // Save to DB
    await supabase
      .from('voice_queue')
      .insert({
        streamer_id: streamer.id,
        chatter_kick_id: 'web',
        chatter_username: chatterUsername,
        file_url: `/uploads/${filename}`,
        played: false,
      })

    // Count queue position
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