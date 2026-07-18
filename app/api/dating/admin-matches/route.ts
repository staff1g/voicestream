 
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const streamerUsername = request.nextUrl.searchParams.get('streamer')

  if (!streamerUsername) {
    return NextResponse.json({ error: 'Streamer manquant' }, { status: 400 })
  }

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .ilike('username', streamerUsername)
    .maybeSingle()

  if (!streamer) {
    return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
  }

  const { data: matches } = await supabase
    .from('dating_matches')
    .select('id, created_at, profile_1_id, profile_2_id')
    .order('created_at', { ascending: false })

  const results = []
  for (const match of matches || []) {
    const { data: p1 } = await supabase
      .from('dating_profiles')
      .select('display_name, discord_username, gender, streamer_id')
      .eq('id', match.profile_1_id)
      .maybeSingle()

    const { data: p2 } = await supabase
      .from('dating_profiles')
      .select('display_name, discord_username, gender, streamer_id')
      .eq('id', match.profile_2_id)
      .maybeSingle()

    if (p1 && p2 && p1.streamer_id === streamer.id) {
      results.push({
        id: match.id,
        created_at: match.created_at,
        person1: { name: p1.display_name, discord: p1.discord_username, gender: p1.gender },
        person2: { name: p2.display_name, discord: p2.discord_username, gender: p2.gender },
      })
    }
  }

  return NextResponse.json({ matches: results })
}