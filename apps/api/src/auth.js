import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { users, otps, sessions, hashToken, id } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'projectlab-dev-secret-change-me'
const ACCESS_TTL = '15m'
const REFRESH_DAYS = 30
const OTP_TTL_MS = 5 * 60 * 1000
const OTP_RATE_LIMIT = 5

export function signAccess(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: ACCESS_TTL })
}

export function verifyAccess(token) {
  return jwt.verify(token, JWT_SECRET)
}

function otpCode() {
  return String(crypto.randomInt(100000, 999999))
}

export async function requestOtp(email) {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    const err = new Error('Invalid email address')
    err.status = 400
    throw err
  }

  const now = Date.now()
  const bucket = await otps.get(normalized) || { attempts: [], code: null, expiresAt: 0 }
  bucket.attempts = bucket.attempts.filter((t) => now - t < 60 * 60 * 1000)
  if (bucket.attempts.length >= OTP_RATE_LIMIT) {
    const err = new Error('Too many OTP requests. Try again in an hour.')
    err.status = 429
    throw err
  }
  const code = otpCode()
  bucket.code = code
  bucket.expiresAt = now + OTP_TTL_MS
  bucket.attempts.push(now)
  await otps.put(normalized, bucket)
  console.log(`[OTP] ${normalized} → ${code}`)
  return code
}

export async function verifyOtp(email, otp) {
  const normalized = email.trim().toLowerCase()
  const bucket = await otps.get(normalized)
  if (!bucket || bucket.code !== otp || Date.now() > bucket.expiresAt) {
    const err = new Error('Invalid or expired OTP')
    err.status = 401
    throw err
  }
  await otps.del(normalized)

  let user = await users.byEmail(normalized)
  if (!user) {
    user = await users.create({
      id: id(),
      email: normalized,
      name: normalized.split('@')[0],
      currentAge: 32,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflation: 0.06,
      taxRegime: 'old',
      taxSlab: 0.3,
      currency: 'INR',
      uiPrefs: { dark: false, realTerms: true },
      createdAt: new Date().toISOString(),
    })
  }

  const refreshToken = crypto.randomBytes(32).toString('hex')
  const session = await sessions.create({
    id: id(),
    userId: user.id,
    refreshHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  })

  return { user, accessToken: signAccess(user.id), refreshToken, sessionId: session.id }
}

// ---- Phone (SMS OTP via Twilio) ----

export async function requestPhoneOtp(phone) {
  const { normalizePhone, sendPhoneOtp } = await import('./twilio.js')
  const e164 = normalizePhone(phone)
  if (!e164) {
    const err = new Error('Enter a valid 10-digit mobile number')
    err.status = 400
    throw err
  }
  const result = await sendPhoneOtp(e164)
  return { phone: e164, ...result }
}

export async function verifyPhoneOtp(phone, otp) {
  const { normalizePhone, checkPhoneOtp } = await import('./twilio.js')
  const e164 = normalizePhone(phone)
  if (!e164) {
    const err = new Error('Enter a valid mobile number')
    err.status = 400
    throw err
  }
  await checkPhoneOtp(e164, otp)

  let user = await users.byPhone(e164)
  if (!user) {
    user = await users.create({
      id: id(),
      phone: e164,
      name: 'User ' + e164.slice(-4),
      currentAge: 32,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflation: 0.06,
      taxRegime: 'old',
      taxSlab: 0.3,
      currency: 'INR',
      uiPrefs: { dark: false, realTerms: true },
      createdAt: new Date().toISOString(),
    })
  }

  const refreshToken = crypto.randomBytes(32).toString('hex')
  const session = await sessions.create({
    id: id(),
    userId: user.id,
    refreshHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  })

  return { user, accessToken: signAccess(user.id), refreshToken, sessionId: session.id }
}

export async function refreshSession(refreshToken) {
  const session = await sessions.byHash(hashToken(refreshToken))
  if (!session || new Date(session.expiresAt) < new Date()) {
    const err = new Error('Invalid refresh token')
    err.status = 401
    throw err
  }
  const user = await users.byId(session.userId)
  if (!user) {
    const err = new Error('User not found')
    err.status = 401
    throw err
  }
  const newRefresh = crypto.randomBytes(32).toString('hex')
  await sessions.rotate(session.id, hashToken(newRefresh), new Date(Date.now() + REFRESH_DAYS * 86400000).toISOString())
  return { user, accessToken: signAccess(user.id), refreshToken: newRefresh, sessionId: session.id }
}

export async function logout(refreshToken) {
  if (!refreshToken) return
  await sessions.deleteByHash(hashToken(refreshToken))
}
