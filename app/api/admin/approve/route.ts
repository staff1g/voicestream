import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendStreamerApprovedEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  const token = request.nextUrl.searchParams.get('token')

  if (!token || token !== process.env.ADMIN_SECRET) {
    return page('Acces refuse', 'Token invalide.', false)
  }

  if (!username) {
    return page('Erreur', 'Username manquant.', false)
  }

  const { data: streamer, error: findError } = await supabase
    .from('streamers')
    .select('id, email, approved')
    .ilike('username', username)
    .maybeSingle()

  if (findError || !streamer) {
    return page('Erreur', `Streamer "${username}" introuvable.`, false)
  }

  if (streamer.approved) {
    return page('Deja approuve', `${username} a deja acces a BezBez.`, true)
  }

  const { error: updateError } = await supabase
    .from('streamers')
    .update({ approved: true })
    .eq('id', streamer.id)

  if (updateError) {
    console.error('Approve error:', updateError)
    return page('Erreur', 'Erreur base de donnees.', false)
  }

  console.log('Streamer approved:', username)

  // Notify the streamer by email if we have their address
  if (streamer.email) {
    try {
      await sendStreamerApprovedEmail(streamer.email, username)
      console.log('Approval notification sent to:', streamer.email)
    } catch (emailError) {
      console.error('Failed to send approval notification:', emailError)
    }
  }

  const emailNote = streamer.email
    ? `Un email de confirmation a ete envoye a ${streamer.email}.`
    : 'Aucun email enregistre - le streamer devra rafraichir la page.'

  return page('Approuve !', `${username} a maintenant acces a BezBez. ${emailNote}`, true)
}

function page(title: string, message: string, success: boolean) {
  const color = success ? '#22c55e' : '#ef4444'
  const icon = success ? '✓' : '✕'
  return new NextResponse(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - BezBez</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;}
  .card{background:#111119;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:48px;text-align:center;max-width:420px;}
  .icon{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:24px;font-weight:700;background:${color}20;color:${color};border:2px solid ${color}40;}
  h1{margin:0 0 8px;font-size:22px;}
  p{margin:0;color:#94a3b8;font-size:14px;line-height:1.6;}
</style></head>
<body><div class="card"><div class="icon">${icon}</div><h1>${title}</h1><p>${message}</p></div></body></html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}