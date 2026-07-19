import { Capacitor } from '@capacitor/core'
import { isAuthenticated } from '../data/store.js'

const KEY = 'fb-landing-seen'

export function shouldShowLanding() {
  return !sessionStorage.getItem(KEY)
}

export function markLandingSeen() {
  sessionStorage.setItem(KEY, '1')
}

/** Where to send the user after the landing screen. Its one CTA always lands here;
 *  signing in or trying the sample plan are both choices the login screen offers. */
export function landingDestination({ onboarded } = {}) {
  if (isAuthenticated() && !onboarded) return '/onboarding'
  if (onboarded || isAuthenticated()) return '/'
  return Capacitor.isNativePlatform() ? '/login' : '/login'
}
