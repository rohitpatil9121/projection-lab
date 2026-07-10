import nodemailer from 'nodemailer'

// OTP email via SMTP. Configure with env vars (works with Gmail, Brevo, etc.):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (optional)
// When not configured, the API falls back to returning the OTP in the response.

export const emailConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

let transporter = null
if (emailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  console.log('[email] SMTP configured via', process.env.SMTP_HOST)
}

export async function sendOtpEmail(to, code) {
  const from = process.env.SMTP_FROM || `ProjectLab <${process.env.SMTP_USER}>`
  await transporter.sendMail({
    from,
    to,
    subject: `${code} — your ProjectLab login code`,
    text: `Your ProjectLab login code is: ${code}\n\nIt expires in 5 minutes. If you didn't request this, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <div style="font-size:20px;font-weight:800;margin-bottom:4px">ProjectLab</div>
        <p style="color:#555">Your login code:</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#f4f4f8;border-radius:12px;padding:16px;text-align:center">${code}</div>
        <p style="color:#888;font-size:13px;margin-top:16px">Expires in 5 minutes. If you didn't request this, ignore this email.</p>
      </div>`,
  })
}
