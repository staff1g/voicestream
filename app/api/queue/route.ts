import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; 
import { validateSession } from '@/lib/session';

  // SECURITY FIX: verify caller owns this streamer account (IDOR fix) -
  // this endpoint previously let any streamer read another streamer's
  // pending voice-message queue.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const token = searchParams.get('token');

    if (!username) {
      return NextResponse.json({ error: 'Missing username parameter' }, { status: 400 });
    }

    let isAuthorized = false;

    //  Authenticate via OBS Overlay Token (No cookies required)
    if (token) {
      const { data: streamer } = await supabase
        .from('streamers')
        .select('id, overlay_token')
        .ilike('username', username)
        .single();

      if (streamer && streamer.overlay_token === token) {
        isAuthorized = true;
      }
    }

    // Fallback to session authentication (Dashboard use)
    if (!isAuthorized) {
      const sessionCookie = request.cookies.get('bez_session')?.value;
      if (sessionCookie) {
        const session = await validateSession(sessionCookie);
        if (session && session.username.toLowerCase() === username.toLowerCase()) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve unplayed voice queue for the streamer
    const { data: queue, error } = await supabase
      .from('voice_queue')
      .select('*, streamers!inner(username)')
      .ilike('streamers.username', username)
      .eq('played', false)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    return NextResponse.json({ queue: queue || [] });
  } catch (err) {
    console.error('[Queue API] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}