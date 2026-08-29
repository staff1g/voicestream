import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // SECURITY FIX: this route imported requireAuth but never called it,
  // making it fully public. It's only ever used by the app to fetch the
  // logged-in user's own profile, so require a valid session.
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  const username = request.nextUrl.searchParams.get('username')
  const role = request.nextUrl.searchParams.get('role') || 'chatter'

  if (!username) {
    return NextResponse.json({ error: 'Username manquant' }, { status: 400 })
  }

  const table = role === 'streamer' ? 'streamers' : 'chatters'

  const selectFields = role === 'streamer'
    ? 'username, profile_picture, bio, approved'
    : 'username, profile_picture, bio'

  const { data } = await supabase
    .from(table)
    .select(selectFields)
    .ilike('username', username)
    .maybeSingle()

  return NextResponse.json({ profile: data })
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const form = await request.formData()
    const username = form.get('username') as string
    const role = form.get('role') as string || 'chatter'
    const bio = form.get('bio') as string || ''
    const image = form.get('image') as File | null

    if (!username) {
      return NextResponse.json({ error: 'Username manquant' }, { status: 400 })
    }

    // SECURITY FIX: `username`/`role` came from the form body and were
    // never checked against the session, so any authenticated user could
    // overwrite another account's bio/profile picture by just naming them
    // in the request. Verify the caller is editing their own profile.
    if (
      auth.session.role !== role ||
      auth.session.username.toLowerCase() !== username.toLowerCase()
    ) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }

    const table = role === 'streamer' ? 'streamers' : 'chatters'

    let profilePictureUrl: string | null = null

    if (image && image.size > 0) {
      if (image.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image trop volumineuse (max 5MB)' }, { status: 400 })
      }

      const ext = image.name.split('.').pop() || 'png'
      const filename = `${role}_${username}_${Date.now()}.${ext}`
      const bytes = await image.arrayBuffer()

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filename, bytes, { contentType: image.type })

      if (uploadError) {
        return NextResponse.json({ error: 'Erreur upload image' }, { status: 500 })
      }

      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filename)

      profilePictureUrl = urlData.publicUrl
    }

    const updateData: any = { bio }
    if (profilePictureUrl) {
      updateData.profile_picture = profilePictureUrl
    }

    await supabase
      .from(table)
      .update(updateData)
      .ilike('username', username)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}