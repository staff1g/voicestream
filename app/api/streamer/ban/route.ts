import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireOwnStreamer } from '@/lib/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/streamer/ban
 * Body: { streamerUsername: string, chatterUsername: string }
 * Purpose: Bans a chatter for a specific streamer.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { streamerUsername, chatterUsername } = body;

    if (!streamerUsername || !chatterUsername) {
      return NextResponse.json(
        { error: "streamerUsername et chatterUsername sont requis." },
        { status: 400 }
      );
    }

    // SECURITY FIX: previously this only checked "is the caller *a*
    // streamer", not "is the caller *this* streamer". Any authenticated
    // streamer could ban chatters out of a rival streamer's community.
    const auth = await requireOwnStreamer(req, streamerUsername)
    if (auth.error) return auth.error

    const normalizedStreamer = streamerUsername.trim().toLowerCase();
    const normalizedChatter = chatterUsername.trim().toLowerCase();

    //  Find the streamer
    const { data: streamer } = await supabase
      .from("streamers")
      .select("id")
      .ilike("username", normalizedStreamer)
      .single();

    if (!streamer) {
      return NextResponse.json(
        { error: "Streamer introuvable." },
        { status: 404 }
      );
    }

    //  Check the chatter exists in this streamer's community
    //    First check chatter_passes (chatters with passes for this streamer)
    const { data: chatter } = await supabase
      .from("chatters")
      .select("id")
      .ilike("username", normalizedChatter)
      .maybeSingle();

    let isInCommunity = false;

    if (chatter) {
      const { data: passRecord } = await supabase
        .from("chatter_passes")
        .select("id")
        .eq("chatter_id", chatter.id)
        .eq("streamer_id", streamer.id)
        .maybeSingle();

      isInCommunity = !!passRecord;
    }

    //    Fallback: check chat_activity (chatters who talked in chat)
    if (!isInCommunity) {
      const { count } = await supabase
        .from("chat_activity")
        .select("id", { count: "exact", head: true })
        .eq("streamer_id", streamer.id)
        .ilike("chatter_username", normalizedChatter);

      isInCommunity = (count || 0) > 0;
    }

    if (!isInCommunity) {
      return NextResponse.json(
        { error: "Ce chatter n'existe pas dans ta communaute." },
        { status: 404 }
      );
    }

    //  Check if already banned
    const { data: existingBan } = await supabase
      .from("streamer_banned_chatters")
      .select("id")
      .eq("streamer_username", normalizedStreamer)
      .eq("chatter_username", normalizedChatter)
      .maybeSingle();

    if (existingBan) {
      return NextResponse.json(
        { error: "Ce chatter est deja banni." },
        { status: 409 }
      );
    }

    //  Ban the chatter
    const { data, error } = await supabase
      .from("streamer_banned_chatters")
      .insert({
        streamer_username: normalizedStreamer,
        chatter_username: normalizedChatter,
      })
      .select()
      .single();

    if (error) {
      console.error("Error banning chatter:", error);
      return NextResponse.json(
        { error: "Erreur lors du ban." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: `${chatterUsername} a ete banni(e).`, data },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unhandled ban API error:", err);
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/streamer/ban
 * Body: { streamerUsername: string, chatterUsername: string }
 * Purpose: Unbans a chatter for a specific streamer.
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { streamerUsername, chatterUsername } = body;

    if (!streamerUsername || !chatterUsername) {
      return NextResponse.json(
        { error: "streamerUsername et chatterUsername sont requis." },
        { status: 400 }
      );
    }

    // SECURITY FIX: same ownership check as POST above.
    const auth = await requireOwnStreamer(req, streamerUsername)
    if (auth.error) return auth.error

    const normalizedStreamer = streamerUsername.trim().toLowerCase();
    const normalizedChatter = chatterUsername.trim().toLowerCase();

    const { error } = await supabase
      .from("streamer_banned_chatters")
      .delete()
      .match({
        streamer_username: normalizedStreamer,
        chatter_username: normalizedChatter,
      });

    if (error) {
      console.error("Error unbanning chatter:", error);
      return NextResponse.json(
        { error: "Erreur lors du deban." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: `${chatterUsername} a ete debanni(e).` },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unhandled unban API error:", err);
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/streamer/ban?streamerUsername=XYZ
 * Purpose: Fetches all banned chatters for a given streamer.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const streamerUsername = searchParams.get("streamerUsername");

    if (!streamerUsername) {
      return NextResponse.json(
        { error: "streamerUsername est requis." },
        { status: 400 }
      );
    }

    // SECURITY FIX: same ownership check — a streamer's ban list is
    // private, other streamers shouldn't be able to enumerate it.
    const auth = await requireOwnStreamer(req, streamerUsername)
    if (auth.error) return auth.error

    const normalizedStreamer = streamerUsername.trim().toLowerCase();

    const { data, error } = await supabase
      .from("streamer_banned_chatters")
      .select("chatter_username, banned_at")
      .eq("streamer_username", normalizedStreamer);

    if (error) {
      console.error("Error fetching banned list:", error);
      return NextResponse.json(
        { error: "Erreur lors du chargement de la liste." },
        { status: 500 }
      );
    }

    return NextResponse.json({ bannedChatters: data }, { status: 200 });
  } catch (err) {
    console.error("Unhandled fetch banned list error:", err);
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
