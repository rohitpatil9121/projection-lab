import { OAuth2Client } from 'google-auth-library'

// The WEB client ID. Both sign-in paths produce a token addressed to it:
// the browser gets one from Google Identity Services, and the Android app asks
// for one via `serverClientId`. So a single audience verifies both.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

export const googleConfigured = !!GOOGLE_CLIENT_ID

const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

/**
 * Verifies a Google ID token and returns the identity it proves.
 *
 * verifyIdToken checks the signature against Google's rotating public keys and
 * enforces issuer, audience and expiry — so a token minted for someone else's
 * app, or a self-signed one, is rejected here rather than trusted downstream.
 */
export async function verifyGoogleIdToken(idToken) {
  if (!client) {
    const err = new Error('Google sign-in is not configured. Set GOOGLE_CLIENT_ID.')
    err.status = 503
    throw err
  }
  if (!idToken) {
    const err = new Error('Missing Google credential')
    err.status = 400
    throw err
  }

  let payload
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
    payload = ticket.getPayload()
  } catch {
    const err = new Error('Invalid Google credential')
    err.status = 401
    throw err
  }

  // Google mints tokens for unverified addresses on some Workspace/custom domains.
  // Trusting one would let an attacker claim an email they don't own — and since we
  // key accounts on email, that is account takeover. Require proof.
  if (!payload?.email || payload.email_verified !== true) {
    const err = new Error('Your Google account has no verified email address')
    err.status = 401
    throw err
  }

  return {
    email: String(payload.email).trim().toLowerCase(),
    name: payload.name || payload.given_name || String(payload.email).split('@')[0],
    googleId: payload.sub,
  }
}
