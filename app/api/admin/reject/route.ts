import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendStreamerRejectedEmail } from '@/lib/email'
import { peekAdminActionToken, isTokenUsable, consumeAdminActionToken } from '@/lib/adminTokens'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// SECURITY FIX: see app/api/admin/approve/route.ts for the full rationale.
// GET only previews (no mutation, safe to prefetch). POST performs the
// actual rejection, reading the token from a header, and the token is
// single-use.

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const row = await peekAdminActionToken(token || '')

  if (!isTokenUsable(row) || row.action !== 'reject') {
    return page('Lien invalide', 'Ce lien est invalide, expire, ou a deja ete utilise.', false)
  }

  const { data: streamer } = await supabase
    .from('streamers')
    .select('username, approved')
    .eq('id', row.streamer_id)
    .maybeSingle()

  if (!streamer) {
    return page('Introuvable', "Ce streamer n'existe pas ou a deja ete supprime.", false)
  }

  if (streamer.approved) {
    return page('Deja approuve', `${streamer.username} est deja approuve. Revoque l'acces depuis la base de donnees si necessaire.`, false)
  }

  return confirmPage(streamer.username, token!)
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-admin-token') || (await safeReadTokenFromBody(request))

  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  const row = await peekAdminActionToken(token)

  if (!isTokenUsable(row) || row.action !== 'reject') {
    return NextResponse.json({ error: 'Lien invalide, expire, ou deja utilise' }, { status: 403 })
  }

  const consumed = await consumeAdminActionToken(row.id)
  if (!consumed) {
    return NextResponse.json({ error: 'Ce lien a deja ete utilise' }, { status: 409 })
  }

  const { data: streamer, error: findError } = await supabase
    .from('streamers')
    .select('id, username, email, approved')
    .eq('id', row.streamer_id)
    .maybeSingle()

  if (findError || !streamer) {
    return NextResponse.json({ error: "Ce streamer n'existe pas ou a deja ete supprime" }, { status: 404 })
  }

  if (streamer.approved) {
    return NextResponse.json({ error: `${streamer.username} est deja approuve.` }, { status: 409 })
  }

  if (streamer.email) {
    try {
      await sendStreamerRejectedEmail(streamer.email, streamer.username)
    } catch (emailError) {
      console.error('Failed to send rejection notification:', emailError)
    }
  }

  const { error: deleteError } = await supabase
    .from('streamers')
    .delete()
    .eq('id', streamer.id)

  if (deleteError) {
    console.error('Reject delete error:', deleteError)
    return NextResponse.json({ error: 'Erreur base de donnees' }, { status: 500 })
  }

  console.log('Streamer rejected and removed:', streamer.username)

  const emailNote = streamer.email ? ` Un email a ete envoye a ${streamer.email}.` : ''

  return NextResponse.json({ message: `${streamer.username} a ete refuse et supprime.${emailNote}` })
}

async function safeReadTokenFromBody(request: NextRequest): Promise<string | null> {
  try {
    const body = await request.json()
    return body?.token || null
  } catch {
    return null
  }
}

function confirmPage(username: string, token: string) {
  return new NextResponse(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirmer - BezBez</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;}
  .card{background:#111119;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:48px;text-align:center;max-width:420px;}
  h1{margin:0 0 8px;font-size:22px;}
  p{margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;}
  button{background-color:#ef4444;color:#fff;border:none;font-size:15px;font-weight:600;padding:14px 48px;border-radius:10px;cursor:pointer;}
  button:disabled{opacity:0.5;cursor:default;}
  .status{margin-top:16px;font-size:13px;color:#94a3b8;}
</style></head>
<body><div class="card">
  <h1>Refuser ${username} ?</h1>
  <p>Cette action supprimera le compte et ne sera effectuee qu'apres confirmation. Le lien ne peut etre utilise qu'une seule fois.</p>
  <button id="btn">Refuser</button>
  <p class="status" id="status"></p>
</div>
<script>
  document.getElementById('btn').addEventListener('click', async () => {
    const btn = document.getElementById('btn')
    const status = document.getElementById('status')
    btn.disabled = true
    status.textContent = 'En cours...'
    try {
      const res = await fetch(window.location.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': ${JSON.stringify(token)} },
      })
      const data = await res.json()
      status.textContent = res.ok ? (data.message || 'Fait.') : (data.error || 'Erreur.')
    } catch (e) {
      status.textContent = 'Erreur reseau.'
      btn.disabled = false
    }
  })
</script>
</body></html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function page(title: string, message: string, success: boolean) {
  const color = success ? '#f59e0b' : '#ef4444'
  const icon = success ? '✕' : '!'
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