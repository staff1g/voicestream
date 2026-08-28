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