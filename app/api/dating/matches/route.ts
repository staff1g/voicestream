import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireChatter } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireChatter(request)
  if (auth.error) return auth.error

  // SECURITY FIX: identity comes from the session, never from the
  // client-supplied `chatter` query param - previously any chatter could
  // pass someone else's username and read their matches' Discord handles.
  const chatterUsername = auth.session.username
  const streamerUsername = request.nextUrl.searchParams.get('streamer')

  if (!streamerUsername) {
    return NextResponse.json({ error: 'Params manquants' }, { status: 400 })
  }

  const { data: chatter } = await supabase
    .from('chatters')
    .select('id')
    .ilike('username', chatterUsername)
    .maybeSingle()

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .ilike('username', streamerUsername)
    .maybeSingle()

  if (!chatter || !streamer) {
    return NextResponse.json({ matches: [] })
  }

  const { data: myProfile } = await supabase
    .from('dating_profiles')
    .select('id')
    .eq('chatter_id', chatter.id)
    .eq('streamer_id', streamer.id)
    .maybeSingle()

  if (!myProfile) {
    return NextResponse.json({ matches: [] })
  }

  const { data: matches } = await supabase
    .from('dating_matches')
    .select('id, created_at, profile_1_id, profile_2_id')
    .or(`profile_1_id.eq.${myProfile.id},profile_2_id.eq.${myProfile.id}`)
    .order('created_at', { ascending: false })

  const results = []
  for (const match of matches || []) {
    const otherId = match.profile_1_id === myProfile.id ? match.profile_2_id : match.profile_1_id
    const { data: other } = await supabase
      .from('dating_profiles')
      .select('display_name, photo_url, discord_username')
      .eq('id', otherId)
      .maybeSingle()

    if (other) {
      results.push({
        id: match.id,
        created_at: match.created_at,
        display_name: other.display_name,
        photo_url: other.photo_url,
        discord_username: other.discord_username,
      })
    }
  }

  return NextResponse.json({ matches: results })
}