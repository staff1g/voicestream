import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireStreamer } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireStreamer(request)
  if (auth.error) return auth.error

  const username = request.nextUrl.searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username manquant' }, { status: 400 })
  }

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id, access_token')
    .ilike('username', username)
    .single()

  if (!streamer) {
    return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
  }

  const res = await fetch('https://api.kick.com/public/v1/channels/rewards', {
    headers: { Authorization: `Bearer ${streamer.access_token}` },
  })

  const data = await res.json()

  const rewards = (data.data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    cost: r.cost,
  }))

  return NextResponse.json({ rewards })
}