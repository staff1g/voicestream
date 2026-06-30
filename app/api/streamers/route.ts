 
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data: streamers } = await supabase
    .from('streamers')
    .select('id, username')
    .order('username')

  return NextResponse.json({ streamers: streamers || [] })
}