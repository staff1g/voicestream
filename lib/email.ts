import nodemailer from 'nodemailer'
import { createAdminActionToken } from './adminTokens'

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY,
  },
})

const from = `"BezBez" <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`

// Shared layout 

function wrapEmail(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background-color:#111119;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
${content}
<tr><td style="padding:20px 40px 28px;border-top:1px solid rgba(255,255,255,0.04);">
  <p style="margin:0;color:#475569;font-size:11px;text-align:center;">Cet email a ete envoye automatiquement par BezBez.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

//Email to ADMIN: new streamer wants access 

export async function sendApprovalEmail(streamerUsername: string, kickUserId: string, streamerId: string) {
  const baseUrl = process.env.NEXTAUTH_URL

  // SECURITY FIX: previously both links embedded the same static
  // ADMIN_SECRET, reusable forever for every streamer. Each link now gets
  // its own random, single-use, expiring token tied to this specific
  // streamer and this specific action.
  const approveToken = await createAdminActionToken(streamerId, 'approve')
  const rejectToken = await createAdminActionToken(streamerId, 'reject')
  const approveUrl = `${baseUrl}/api/admin/approve?token=${approveToken}`
  const rejectUrl = `${baseUrl}/api/admin/reject?token=${rejectToken}`
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })

  const html = wrapEmail(`
<tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:32px 40px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">BezBez</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Nouvelle demande d'acces</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 24px;color:#e2e8f0;font-size:15px;line-height:1.6;">Un nouveau streamer souhaite utiliser BezBez&nbsp;:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a24;border-radius:12px;border:1px solid rgba(255,255,255,0.06);margin-bottom:28px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0;color:#a78bfa;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Streamer</p>
    <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;">${streamerUsername}</p>
    <table cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
      <td style="padding-right:20px;"><p style="margin:0;color:#64748b;font-size:11px;">Kick ID</p><p style="margin:2px 0 0;color:#94a3b8;font-size:13px;">${kickUserId}</p></td>
      <td><p style="margin:0;color:#64748b;font-size:11px;">Date</p><p style="margin:2px 0 0;color:#94a3b8;font-size:13px;">${date}</p></td>
    </tr></table>
  </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding-bottom:12px;">
      <a href="${approveUrl}" style="display:inline-block;background-color:#22c55e;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 48px;border-radius:10px;">Approuver</a>
    </td></tr>
    <tr><td align="center">
      <a href="${rejectUrl}" style="display:inline-block;color:#ef4444;font-size:13px;font-weight:500;text-decoration:none;padding:10px 32px;border:1px solid rgba(239,68,68,0.3);border-radius:8px;">Refuser</a>
    </td></tr>
  </table>
</td></tr>`)

  await transporter.sendMail({
    from,
    to: process.env.ADMIN_EMAIL,
    subject: `Nouveau streamer: ${streamerUsername} demande l'acces`,
    html,
  })
}

//Email to STREAMER: approved 

export async function sendStreamerApprovedEmail(streamerEmail: string, streamerUsername: string) {
  const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`

  const html = wrapEmail(`
<tr><td style="background:linear-gradient(135deg,#16a34a 0%,#22c55e 100%);padding:32px 40px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">BezBez</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Demande approuvee</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 8px;color:#fff;font-size:18px;font-weight:600;">Bienvenue, ${streamerUsername} !</p>
  <p style="margin:0 0 28px;color:#94a3b8;font-size:14px;line-height:1.7;">
    Bonne nouvelle ! Ta demande d'acces a ete approuvee. Tu peux maintenant te connecter et profiter de toutes les fonctionnalites de BezBez.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <a href="${dashboardUrl}" style="display:inline-block;background-color:#7c3aed;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 48px;border-radius:10px;">Acceder au dashboard</a>
    </td></tr>
  </table>
</td></tr>`)

  await transporter.sendMail({
    from,
    to: streamerEmail,
    subject: `Bienvenue sur BezBez, ${streamerUsername} !`,
    html,
  })
}

// Email to STREAMER: rejected 

export async function sendStreamerRejectedEmail(streamerEmail: string, streamerUsername: string) {
  const html = wrapEmail(`
<tr><td style="background:linear-gradient(135deg,#dc2626 0%,#ef4444 100%);padding:32px 40px;text-align:center;">
  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">BezBez</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Demande refusee</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 8px;color:#fff;font-size:18px;font-weight:600;">Salut, ${streamerUsername}</p>
  <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.7;">
    Ta demande d'acces a BezBez n'a malheureusement pas ete approuvee pour le moment. Si tu penses qu'il s'agit d'une erreur, contacte l'administrateur.
  </p>
</td></tr>`)

  await transporter.sendMail({
    from,
    to: streamerEmail,
    subject: `BezBez — Demande d'acces refusee`,
    html,
  })
}