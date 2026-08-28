import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireChatter } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireChatter(request)
  if (auth.error) return auth.error

  const chatterUsername = request.nextUrl.searchParams.get('chatter')
  const streamerUsername = request.nextUrl.searchParams.get('streamer')

  if (!chatterUsername || !streamerUsername) {
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
    return NextResponse.json({ profiles: [] })
  }

  const { data: myProfile } = await supabase
    .from('dating_profiles')
    .select('id, looking_for')
    .eq('chatter_id', chatter.id)
    .eq('streamer_id', streamer.id)
    .maybeSingle()

  if (!myProfile) {
    return NextResponse.json({ profiles: [] })
  }

  const { data: alreadySwiped } = await supabase
    .from('dating_swipes')
    .select('to_profile_id')
    .eq('from_profile_id', myProfile.id)

  const swipedIds = (alreadySwiped || []).map(s => s.to_profile_id)
  swipedIds.push(myProfile.id)

  const { data: profiles } = await supabase
    .from('dating_profiles')
    .select('id, display_name, bio, photo_url, gender, discord_username')
    .eq('streamer_id', streamer.id)
    .eq('gender', myProfile.looking_for)
    .not('id', 'in', `(${swipedIds.join(',')})`)
    .limit(20)

  return NextResponse.json({ profiles: profiles || [] })
}