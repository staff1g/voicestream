import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { chatterUsername, streamerUsername, displayName, bio, photoUrl, discordUsername, gender, lookingFor } = await request.json()

    if (!chatterUsername || !streamerUsername || !displayName || !gender || !lookingFor) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    const { data: chatter } = await supabase
      .from('chatters')
      .select('id')
      .ilike('username', chatterUsername)
      .maybeSingle()

    if (!chatter) {
      return NextResponse.json({ error: 'Chatter introuvable' }, { status: 404 })
    }

    const { data: streamer } = await supabase
      .from('streamers')
      .select('id')
      .ilike('username', streamerUsername)
      .maybeSingle()

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('dating_profiles')
      .upsert({
        chatter_id: chatter.id,
        streamer_id: streamer.id,
        display_name: displayName,
        bio: bio || '',
        photo_url: photoUrl || '',
        discord_username: discordUsername || '',
        gender,
        looking_for: lookingFor,
      }, { onConflict: 'chatter_id,streamer_id' })
      .select()
      .single()

    return NextResponse.json({ success: true, profile })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
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

  if (!chatter) {
    return NextResponse.json({ profile: null })
  }

  const { data: streamer } = await supabase
    .from('streamers')
    .select('id')
    .ilike('username', streamerUsername)
    .maybeSingle()

  if (!streamer) {
    return NextResponse.json({ profile: null })
  }

  const { data: profile } = await supabase
    .from('dating_profiles')
    .select('*')
    .eq('chatter_id', chatter.id)
    .eq('streamer_id', streamer.id)
    .maybeSingle()

  return NextResponse.json({ profile })
} 
