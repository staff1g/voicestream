import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireChatter } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireChatter(request)
    if (auth.error) return auth.error

    const { streamerUsername, displayName, bio, photoUrl, discordUsername, gender, lookingFor } = await request.json()

    // SECURITY FIX: identity comes from the session, never from the client
    // body. Previously `chatterUsername` was trusted from the request,
    // letting any chatter create/overwrite another chatter's dating profile.
    const chatterUsername = auth.session.username

    if (!streamerUsername || !displayName || !gender || !lookingFor) {
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
  // SECURITY FIX: this endpoint had no auth at all and returned another
  // chatter's dating profile (including Discord username) to anyone who
  // knew/guessed their username. Require the caller to be a logged-in
  // chatter, and only return their own profile.
  const auth = await requireChatter(request)
  if (auth.error) return auth.error

  const streamerUsername = request.nextUrl.searchParams.get('streamer')

  if (!streamerUsername) {
    return NextResponse.json({ error: 'Params manquants' }, { status: 400 })
  }

  const { data: chatter } = await supabase
    .from('chatters')
    .select('id')
    .ilike('username', auth.session.username)
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
