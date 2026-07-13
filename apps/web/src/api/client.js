import { getAccessToken, getRefreshToken, loadSession, saveSession } from '../auth/session.js'
import { API_BASE, apiConfigError } from './config.js'

const FETCH_TIMEOUT_MS = 20000

function networkError(err) {
  if (err?.name === 'AbortError') return new Error('Server took too long to respond. Check your internet.')
  if (err?.message === 'Failed to fetch') return new Error('Cannot reach server. Check internet or try again later.')
  return err
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    throw networkError(err)
  } finally {
    clearTimeout(timer)
  }
}

async function refreshTokens() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')
  const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
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

  let res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401 && getRefreshToken()) {
    try {
      token = await refreshTokens()
      headers.Authorization = `Bearer ${token}`
      res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers })
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

export async function requestOtp(email) {
  return apiFetch('/auth/otp/request', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function verifyOtp(email, otp) {
  const data = await apiFetch('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, otp }) })
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

export async function forgotPassword(email) {
  return apiFetch('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function resetPassword(email, code, password) {
  const data = await apiFetch('/auth/password/reset', { method: 'POST', body: JSON.stringify({ email, code, password }) })
  saveSession(data)
  return data
}

export async function requestPhoneOtp(phone) {
  return apiFetch('/auth/phone/request', { method: 'POST', body: JSON.stringify({ phone }) })
}

export async function verifyPhoneOtp(phone, otp) {
  const data = await apiFetch('/auth/phone/verify', { method: 'POST', body: JSON.stringify({ phone, otp }) })
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

export async function fetchPlans() {
  return apiFetch('/plans')
}

export async function fetchPlan(planId) {
  return apiFetch(`/plans/${planId}`)
}

export async function syncPlan(planId, body) {
  return apiFetch(`/plans/${planId}`, { method: 'PUT', body: JSON.stringify(body) })
}
