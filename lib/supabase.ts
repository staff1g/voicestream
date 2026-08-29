import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// SECURITY FIX: this client is imported by ~40 server-side routes across
// the app and was hardcoded to the anon key only, with no service-role
// fallback - unlike every other Supabase client in the codebase
// (lib/session.ts, lib/adminTokens.ts, the admin/ban routes). That was
// invisible before RLS was enabled (the anon key had full access anyway),
// but became a hard failure the moment RLS went on everywhere: every route
// using this shared client - including streamer/chatter signup - started
// getting rejected by Postgres. Use the service role key when available,
// matching the pattern used everywhere else in the app.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)