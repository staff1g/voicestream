import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('bez_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionCookie);
    if (!session || session.role !== 'streamer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: streamer, error } = await supabase
      .from('streamers')
      .select('overlay_token')
      .ilike('username', session.username)
      .single();

    if (error || !streamer) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    return NextResponse.json({ token: streamer.overlay_token });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}