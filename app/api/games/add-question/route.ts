import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireOwnStreamer } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let streamerUsername: string
    let answer: string
    let hint: string
    let imageUrl: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      streamerUsername = form.get('streamerUsername') as string
      answer = form.get('answer') as string
      hint = (form.get('hint') as string) || ''
      const image = form.get('image') as File | null

      if (image && image.size > 0) {
        const filename = `game_${Date.now()}.${image.name.split('.').pop()}`
        const bytes = await image.arrayBuffer()
        await supabase.storage.from('game-images').upload(filename, bytes, { contentType: image.type })
        const { data: urlData } = supabase.storage.from('game-images').getPublicUrl(filename)
        imageUrl = urlData.publicUrl
      }
    } else {
      const body = await request.json()
      streamerUsername = body.streamerUsername
      answer = body.answer
      hint = body.hint || ''
    }

    if (!streamerUsername || !answer) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    // SECURITY FIX: verify caller owns this streamer account (IDOR fix)
    const auth = await requireOwnStreamer(request, streamerUsername)
    if (auth.error) return auth.error

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', streamerUsername)
      .single()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    const { data: activeGames } = await supabase
      .from('games')
      .select('id, current_question_index')
      .eq('streamer_id', streamer.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    let game = activeGames?.[0] || null

    if (!game) {
      const { data: newGame } = await supabase
        .from('games')
        .insert({ streamer_id: streamer.id, status: 'active', current_question_index: 0 })
        .select()
        .single()
      game = newGame
    }

    if (!game) {
      return NextResponse.json({ error: 'Erreur creation game' }, { status: 500 })
    }

    const { data: existingQuestions } = await supabase
      .from('game_questions')
      .select('id', { count: 'exact' })
      .eq('game_id', game.id)

    const nextOrderIndex = existingQuestions?.length || 0

    await supabase
      .from('game_questions')
      .insert({
        game_id: game.id,
        secret_answer: answer.trim().toLowerCase(),
        hint: hint || '',
        order_index: nextOrderIndex,
        image_url: imageUrl,
      })

    await supabase
      .from('games')
      .update({ current_question_index: nextOrderIndex })
      .eq('id', game.id)

    return NextResponse.json({ success: true, gameId: game.id })
  } catch (error: any) {
    console.error('Add question error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}