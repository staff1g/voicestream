 
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  const role = request.nextUrl.searchParams.get('role') || 'chatter'

  if (!username) {
    return NextResponse.json({ error: 'Username manquant' }, { status: 400 })
  }

  const table = role === 'streamer' ? 'streamers' : 'chatters'

  const { data } = await supabase
    .from(table)
    .select('username, profile_picture, bio')
    .ilike('username', username)
    .maybeSingle()

  return NextResponse.json({ profile: data })
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const username = form.get('username') as string
    const role = form.get('role') as string || 'chatter'
    const bio = form.get('bio') as string || ''
    const image = form.get('image') as File | null

    if (!username) {
      return NextResponse.json({ error: 'Username manquant' }, { status: 400 })
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