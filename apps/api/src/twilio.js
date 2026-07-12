import crypto from 'node:crypto'
import { otps } from './db.js'

// Phone OTP via Twilio Verify. Configure with:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
// When not configured, falls back to a locally-generated OTP returned in the
// API response (dev mode) so phone login still works during testing.

export const phoneConfigured = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_VERIFY_SERVICE_SID
)

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_RATE_LIMIT = 5

let client = null
if (phoneConfigured) {
  const { default: twilio } = await import('twilio')
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  console.log('[twilio] Verify configured')
}

// Normalize an Indian phone number to E.164 (+91XXXXXXXXXX).
export function normalizePhone(raw) {
  let p = String(raw || '').replace(/[\s\-()]/g, '')
  if (p.startsWith('+')) return p
  p = p.replace(/^0+/, '')
  if (p.length === 10) return '+91' + p
  if (p.length === 12 && p.startsWith('91')) return '+' + p
  return null
}

// Returns { devOtp } when running in fallback mode, else {}.
export async function sendPhoneOtp(phone) {
  if (phoneConfigured) {
    try {
      await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: phone, channel: 'sms' })
      return {}
    } catch (e) {
      // Present a clean message instead of leaking Twilio internals to the user.
      const err = new Error(
        /unverified/i.test(e.message || '')
          ? "We couldn't send an SMS to this number yet. Please try the Email option, or contact support."
          : "Couldn't send OTP right now. Please try again or use the Email option.",
      )
      err.status = 400
      throw err
    }
  }

  // Fallback: generate + store our own OTP (reuses the otps table).
  const now = Date.now()
  const bucket = (await otps.get(phone)) || { attempts: [], code: null, expiresAt: 0 }
  bucket.attempts = bucket.attempts.filter((t) => now - t < 60 * 60 * 1000)
  if (bucket.attempts.length >= OTP_RATE_LIMIT) {
    const err = new Error('Too many OTP requests. Try again in an hour.')
    err.status = 429
    throw err
  }
  const code = String(crypto.randomInt(100000, 999999))
  bucket.code = code
  bucket.expiresAt = now + OTP_TTL_MS
  bucket.attempts.push(now)
  await otps.put(phone, bucket)
  return { devOtp: code }
}

export async function checkPhoneOtp(phone, code) {
  if (phoneConfigured) {
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code })
    if (check.status !== 'approved') {
      const err = new Error('Invalid or expired OTP')
      err.status = 401
      throw err
    }
    return
  }

  const bucket = await otps.get(phone)
  if (!bucket || bucket.code !== code || Date.now() > bucket.expiresAt) {
    const err = new Error('Invalid or expired OTP')
    err.status = 401
    throw err
  }
  await otps.del(phone)
}
