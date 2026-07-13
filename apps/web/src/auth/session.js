const SESSION_KEY = 'projectlab-session-v1'

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

export function getAccessToken() {
  return loadSession()?.accessToken ?? null
}

export function getRefreshToken() {
  return loadSession()?.refreshToken ?? null
}

export function isAuthenticated() {
  return !!(loadSession()?.accessToken && loadSession()?.refreshToken)
}
