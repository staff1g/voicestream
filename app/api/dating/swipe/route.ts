import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireChatter } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireChatter(request)
    if (auth.error) return auth.error

    const { fromProfileId, toProfileId, liked } = await request.json()

    if (!fromProfileId || !toProfileId) {
      return NextResponse.json({ error: 'Donnees manquantes' }, { status: 400 })
    }

    // SECURITY FIX: verify fromProfileId actually belongs to the caller.
    // Previously any authenticated chatter could pass ANY profile id as
    // `fromProfileId` and record swipes/matches on someone else's behalf.
    const { data: chatter } = await supabase
      .from('chatters')
      .select('id')
      .ilike('username', auth.session.username)
      .maybeSingle()

    const { data: fromProfile } = await supabase
      .from('dating_profiles')
      .select('id, chatter_id')
      .eq('id', fromProfileId)
      .maybeSingle()

    if (!chatter || !fromProfile || fromProfile.chatter_id !== chatter.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
    }

    await supabase
      .from('dating_swipes')
      .upsert({
        from_profile_id: fromProfileId,
        to_profile_id: toProfileId,
        liked,
      }, { onConflict: 'from_profile_id,to_profile_id' })

    let matched = false

    if (liked) {
      const { data: reverse } = await supabase
        .from('dating_swipes')
        .select('liked')
        .eq('from_profile_id', toProfileId)
        .eq('to_profile_id', fromProfileId)
        .eq('liked', true)
        .maybeSingle()

      if (reverse) {
        const { data: existingMatch } = await supabase
          .from('dating_matches')
          .select('id')
          .or(`and(profile_1_id.eq.${fromProfileId},profile_2_id.eq.${toProfileId}),and(profile_1_id.eq.${toProfileId},profile_2_id.eq.${fromProfileId})`)
          .maybeSingle()

        if (!existingMatch) {
          await supabase
            .from('dating_matches')
            .insert({ profile_1_id: fromProfileId, profile_2_id: toProfileId })
          matched = true
        }
      }
    }

    return NextResponse.json({ success: true, matched })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
