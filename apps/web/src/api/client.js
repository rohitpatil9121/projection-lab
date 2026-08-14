import { getAccessToken, getRefreshToken, loadSession, saveSession } from '../auth/session.js'
import { API_BASE, apiConfigError } from './config.js'

const FETCH_TIMEOUT_MS = 20000

// The API sleeps on Render's free plan and takes ~25s to wake. Sign-in is usually the
// first request after that nap, so a 20s abort would fail every time the instance had
// gone cold — and blame the user's connection for it. Auth gets room to wait.
const AUTH_TIMEOUT_MS = 60000

function networkError(err, timeoutMs) {
  if (err?.name === 'AbortError') {
    return new Error(`Server didn't respond within ${Math.round(timeoutMs / 1000)}s. It may be waking up — please try again.`)
  }
  if (err?.message === 'Failed to fetch') return new Error('Cannot reach server. Check internet or try again later.')
  return err
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    throw networkError(err, timeoutMs)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Nudges the API awake without blocking anything.
 *
 * Called as the app boots, so the free-tier instance spins up while the user is still
 * reading the landing screen and picking a Google account — by the time they actually
 * sign in, it's usually already listening. Failures are irrelevant here.
 */
export function warmApi() {
  const base = API_BASE.replace(/\/v1$/, '')
  fetch(`${base}/healthz`, { method: 'GET', cache: 'no-store' }).catch(() => {})
}

async function refreshTokens() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')
  const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }, AUTH_TIMEOUT_MS)
  if (!res.ok) throw new Error('Session expired')
  const data = await res.json()
  const prev = loadSession() || {}
  saveSession({ ...prev, ...data })
  return data.accessToken
}

export async function apiFetch(path, options = {}) {
  const configErr = apiConfigError()
  if (configErr) throw new Error(configErr)

  const headers = { 'Content-Type': 'application/json', ...options.headers }
  let token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  // Signing in is typically the first call after the instance has slept, so it waits
  // longer than the rest of the app is willing to.
  const timeout = path.startsWith('/auth/') ? AUTH_TIMEOUT_MS : FETCH_TIMEOUT_MS

  let res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers }, timeout)

  if (res.status === 401 && getRefreshToken()) {
    try {
      token = await refreshTokens()
      headers.Authorization = `Bearer ${token}`
      res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers }, timeout)
    } catch {
      saveSession(null)
      throw new Error('Session expired')
    }
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || res.statusText)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/** Exchanges a Google ID token for our own session. The token is proof of identity;
 *  the API verifies it with Google before trusting the email inside it. */
export async function loginWithGoogle(idToken) {
  const data = await apiFetch('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) })
  saveSession(data)
  return data
}

export async function registerUser(email, password, name) {
  const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) })
  saveSession(data)
  return data
}

export async function loginUser(email, password) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  saveSession(data)
  return data
}

export async function logoutApi() {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    await fetchWithTimeout(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
  saveSession(null)
}

/** Deletes the account and everything on the server. Not reversible. */
export async function deleteAccount() {
  const res = await apiFetch('/me', { method: 'DELETE' })
  saveSession(null)
  return res
}

export async function fetchPlans() {
  return apiFetch('/plans')
}

export async function fetchPlan(planId) {
  return apiFetch(`/plans/${planId}`)
}

export async function syncPlan(planId, body) {
  return apiFetch(`/plans/${planId}`, { method: 'PUT', body: JSON.stringify(body) })
}

/**
 * The "What if" model call. Sends only the sentence — never the plan — and gets back
 * operations the engine applies on this device. Throws (status 503) when the server has no
 * model configured, which the caller treats as "fall back to the on-device reader".
 */
export async function askEnoughModel(text) {
  return apiFetch('/enough/ask', { method: 'POST', body: JSON.stringify({ text }) })
}
