import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateSession } from '@/lib/session';

    // SECURITY FIX: verify this voice_queue row actually belongs to the
    // caller's own stream before marking it played (previously any streamer
    // could mark/dismiss another streamer's queued voice messages).
export async function POST(request: NextRequest) {
  try {
    const { id, token } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing message ID' }, { status: 400 });
    }

    // Fetch message and related streamer
    const { data: item, error: fetchErr } = await supabase
      .from('voice_queue')
      .select('id, streamer_id, streamers(username, overlay_token)')
      .eq('id', id)
      .single();

    if (fetchErr || !item) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    let isAuthorized = false;
    const streamerData = Array.isArray(item.streamers) ? item.streamers[0] : item.streamers;

    //  Authenticate via Overlay Token (No cookies required)
    if (token && streamerData?.overlay_token === token) {
      isAuthorized = true;
    }

    //  Fallback to session authentication (Dashboard use)
    if (!isAuthorized) {
      const sessionCookie = request.cookies.get('bez_session')?.value;
      if (sessionCookie) {
        const session = await validateSession(sessionCookie);
        if (session && session.username.toLowerCase() === streamerData?.username.toLowerCase()) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark message as played
    const { error: updateErr } = await supabase
      .from('voice_queue')
      .update({ played: true })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update message status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Played API] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}