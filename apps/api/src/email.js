import nodemailer from 'nodemailer'

// OTP email delivery. Two backends, in priority order:
//   1. Brevo HTTP API  — set BREVO_API_KEY (+ EMAIL_FROM). Works on hosts that
//      block outbound SMTP (e.g. Render free tier). Recommended.
//   2. SMTP (nodemailer) — set SMTP_HOST/PORT/USER/PASS (e.g. Gmail).
// When neither is set, the API returns the OTP in the response (dev mode).

const BREVO_API_KEY = process.env.BREVO_API_KEY
const smtpReady = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

export const emailConfigured = !!(BREVO_API_KEY || smtpReady)

// From address: "Name <email>" — parsed for the Brevo payload.
const FROM_RAW = process.env.EMAIL_FROM || process.env.SMTP_FROM || `ProjectLab <${process.env.SMTP_USER || 'no-reply@projectlab.in'}>`
const fromMatch = FROM_RAW.match(/^\s*(.*?)\s*<(.+)>\s*$/)
const FROM = { name: fromMatch ? fromMatch[1] || 'ProjectLab' : 'ProjectLab', email: fromMatch ? fromMatch[2] : FROM_RAW }

let transporter = null
if (!BREVO_API_KEY && smtpReady) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  })
  console.log('[email] SMTP configured via', process.env.SMTP_HOST)
} else if (BREVO_API_KEY) {
  console.log('[email] Brevo HTTP API configured')
}

function otpHtml(code) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px">
      <div style="font-size:20px;font-weight:800;margin-bottom:4px">ProjectLab</div>
      <p style="color:#555">Your login code:</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#f4f4f8;border-radius:12px;padding:16px;text-align:center">${code}</div>
      <p style="color:#888;font-size:13px;margin-top:16px">Expires in 5 minutes. If you didn't request this, ignore this email.</p>
    </div>`
}

export async function sendOtpEmail(to, code) {
  const subject = `${code} — your ProjectLab login code`
  const text = `Your ProjectLab login code is: ${code}\n\nIt expires in 5 minutes.`

  if (BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: FROM, to: [{ email: to }], subject, htmlContent: otpHtml(code), textContent: text }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Brevo send failed (${res.status}): ${detail.slice(0, 120)}`)
    }
    return
  }

  await transporter.sendMail({ from: FROM_RAW, to, subject, text, html: otpHtml(code) })
}
