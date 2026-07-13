import { Capacitor } from '@capacitor/core'

/** Deployed API origin without trailing slash */
export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const API_BASE = API_ORIGIN ? `${API_ORIGIN}/v1` : '/v1'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function isApiConfigured() {
  return !!API_ORIGIN || !isNativeApp()
}

export function apiConfigError() {
  if (isApiConfigured()) return null
  return 'Sign-in needs a deployed API. Rebuild the APK with VITE_API_URL set, or continue as guest.'
}
