import { Capacitor } from '@capacitor/core'
import { isAuthenticated } from '../data/store.js'

const KEY = 'fb-landing-seen'

export function shouldShowLanding() {
  return !sessionStorage.getItem(KEY)
}

export function markLandingSeen() {
  sessionStorage.setItem(KEY, '1')
}

/** Where to send the user after the landing screen. */
export function landingDestination(action, { onboarded } = {}) {
  if (action === 'signin') return '/login'
  if (action === 'guest') return '/onboarding'
  if (isAuthenticated() && !onboarded) return '/onboarding'
  if (onboarded || isAuthenticated()) return '/'
  return Capacitor.isNativePlatform() ? '/login' : '/login'
}
