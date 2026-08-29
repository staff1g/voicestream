import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendStreamerApprovedEmail } from '@/lib/email'
import { peekAdminActionToken, isTokenUsable, consumeAdminActionToken } from '@/lib/adminTokens'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// SECURITY FIX: this used to be a GET request that mutated data directly,
// with a static, reusable secret in the URL query string. That's risky:
// the token can leak via browser history, server access logs, Referer
// headers, or get silently triggered by email link-scanners/prefetchers
// that follow links automatically.
//
// GET now only *previews* the action (no mutation, safe to prefetch).
// The actual approval happens via POST, with the token read from a header
// so it never appears in a URL, and the token is single-use.

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const row = await peekAdminActionToken(token || '')

  if (!isTokenUsable(row) || row.action !== 'approve') {
    return page('Lien invalide', 'Ce lien est invalide, expire, ou a deja ete utilise.', false)
  }

  const { data: streamer } = await supabase
    .from('streamers')
    .select('username, approved')
    .eq('id', row.streamer_id)
    .maybeSingle()

  if (!streamer) {
    return page('Erreur', 'Streamer introuvable.', false)
  }

  if (streamer.approved) {
    return page('Deja approuve', `${streamer.username} a deja acces a BezBez.`, true)
  }

  return confirmPage(streamer.username, token!, 'approve')
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-admin-token') || (await safeReadTokenFromBody(request))

  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  const row = await peekAdminActionToken(token)

  if (!isTokenUsable(row) || row.action !== 'approve') {
    return NextResponse.json({ error: 'Lien invalide, expire, ou deja utilise' }, { status: 403 })
  }

  const consumed = await consumeAdminActionToken(row.id)
  if (!consumed) {
    // Someone else already consumed it between our check and this update
    // (e.g. two clicks on the confirm button) - treat as already-used.
    return NextResponse.json({ error: 'Ce lien a deja ete utilise' }, { status: 409 })
  }

  const { data: streamer, error: findError } = await supabase
    .from('streamers')
    .select('id, username, email, approved')
    .eq('id', row.streamer_id)
    .maybeSingle()

  if (findError || !streamer) {
    return NextResponse.json({ error: 'Streamer introuvable' }, { status: 404 })
  }

  if (streamer.approved) {
    return NextResponse.json({ message: `${streamer.username} a deja acces a BezBez.` })
  }

  const { error: updateError } = await supabase
    .from('streamers')
    .update({ approved: true })
    .eq('id', streamer.id)

  if (updateError) {
    console.error('Approve error:', updateError)
    return NextResponse.json({ error: 'Erreur base de donnees' }, { status: 500 })
  }

  console.log('Streamer approved:', streamer.username)

  if (streamer.email) {
    try {
      await sendStreamerApprovedEmail(streamer.email, streamer.username)
    } catch (emailError) {
      console.error('Failed to send approval notification:', emailError)
    }
  }

  const emailNote = streamer.email
    ? `Un email de confirmation a ete envoye a ${streamer.email}.`
    : 'Aucun email enregistre - le streamer devra rafraichir la page.'

  return NextResponse.json({ message: `${streamer.username} a maintenant acces a BezBez. ${emailNote}` })
}

async function safeReadTokenFromBody(request: NextRequest): Promise<string | null> {
  try {
    const body = await request.json()
    return body?.token || null
  } catch {
    return null
  }
}
function confirmPage(username: string, token: string, action: 'approve' | 'reject') {
  const label = action === 'approve' ? 'Approuver' : 'Refuser'
  const color = action === 'approve' ? '#22c55e' : '#ef4444'
  
  return new NextResponse(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirmer - BezBez</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0a0a0f; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#fff; }
  .card { background:#111119; border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:48px; text-align:center; max-width:420px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
  h1 { margin:0 0 8px; font-size:22px; }
  p { margin:0 0 24px; color:#94a3b8; font-size:14px; line-height:1.6; }
  
  /* Button UX Enhancements */
  button { 
    background-color:${color}; color:#fff; border:none; font-size:15px; font-weight:600; 
    padding:14px 48px; border-radius:10px; cursor:pointer; 
    display:inline-flex; align-items:center; justify-content:center; gap:8px;
    transition: all 0.2s ease;
    min-width: 160px; /* Prevents button from shrinking too much when text changes */
  }
  button:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
  button:active:not(:disabled) { transform: translateY(0); filter: brightness(0.95); }
  button:disabled { opacity:0.7; cursor:not-allowed; }
  
  /* Success State */
  button.success { background-color: #22c55e !important; color: #fff; cursor: default; pointer-events: none; }
  
  /* Status Text */
  .status { margin-top:16px; font-size:13px; color:#94a3b8; min-height:20px; transition: color 0.3s ease; }
  .status.error { color: #ef4444; }
  .status.success { color: #22c55e; }

  /* Spinner Animation */
  @keyframes spin { 100% { transform: rotate(360deg); } }
  .spinner { animation: spin 1s linear infinite; }
</style></head>
<body><div class="card">
  <h1>${label} ${username} ?</h1>
  <p>Cette action ne sera effectuée qu'après confirmation. Le lien ne peut être utilisé qu'une seule fois.</p>
  <button id="btn">${label}</button>
  <p class="status" id="status"></p>
</div>
<script>
  const btn = document.getElementById('btn');
  const status = document.getElementById('status');
  const originalLabel = '${label}';

  // SVGs for UI feedback
  const spinnerSvg = '<svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>';
  const checkSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  btn.addEventListener('click', async () => {
    // 1. Loading State
    btn.disabled = true;
    btn.innerHTML = spinnerSvg + ' En cours...';
    status.textContent = '';
    status.className = 'status';
    
    try {
      const res = await fetch(window.location.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': ${JSON.stringify(token)} },
      });
      const data = await res.json();
      
      if (res.ok) {
        // 2. Success State
        btn.classList.add('success');
        btn.innerHTML = checkSvg + ' Fait';
        status.textContent = data.message || 'Action réussie.';
        status.classList.add('success');
      } else {
        // 3. Error State (revert button so they can see it failed)
        btn.disabled = false;
        btn.innerHTML = originalLabel;
        status.textContent = data.error || 'Une erreur est survenue.';
        status.classList.add('error');
      }
    } catch (e) {
      // 4. Network Error
      btn.disabled = false;
      btn.innerHTML = originalLabel;
      status.textContent = 'Erreur réseau. Veuillez réessayer.';
      status.classList.add('error');
    }
  });
</script>
</body></html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
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