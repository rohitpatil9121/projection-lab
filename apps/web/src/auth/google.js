import { Capacitor } from '@capacitor/core'

/**
 * Getting a Google ID token, on both platforms.
 *
 * Google refuses OAuth inside embedded WebViews (it answers `403
 * disallowed_useragent`), so the browser flow cannot work inside the APK. The two
 * platforms therefore take different routes to the same destination:
 *
 *   web      → Google Identity Services, loaded on demand
 *   Android  → native Google Sign-In through a Capacitor plugin
 *
 * Both return an ID token whose audience is the WEB client ID — on Android that is
 * what `serverClientId` asks for — so the API verifies either one the same way.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GSI_SRC = 'https://accounts.google.com/gsi/client'

export function isGoogleConfigured() {
  return !!CLIENT_ID
}

export function googleConfigError() {
  if (CLIENT_ID) return null
  return 'Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID and rebuild.'
}

let gsiPromise = null

function loadGsi() {
  if (gsiPromise) return gsiPromise
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google)
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google))
      existing.addEventListener('error', () => reject(new Error('Could not reach Google. Check your connection.')))
      return
    }
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve(window.google)
    s.onerror = () => reject(new Error('Could not reach Google. Check your connection.'))
    document.head.appendChild(s)
  })
  // A failed load must not be cached, or every later attempt fails too.
  gsiPromise.catch(() => { gsiPromise = null })
  return gsiPromise
}

let nativeReady = null

async function nativeIdToken() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  // initialize() is idempotent per app run, but calling it once keeps sign-in snappy.
  nativeReady ??= SocialLogin.initialize({ google: { webClientId: CLIENT_ID } })
  await nativeReady

  // Deliberately no `scopes`: the native side already requests email, profile and
  // openid by default, and passing *any* scopes array makes the plugin demand a
  // patched MainActivity (GoogleProvider.java:412) — work we'd be doing to ask for
  // what we already get.
  const { result } = await SocialLogin.login({ provider: 'google', options: {} })
  const idToken = result?.idToken
  if (!idToken) throw new Error('Google did not return a credential')
  return idToken
}

function webIdToken() {
  return new Promise((resolve, reject) => {
    loadGsi().then((google) => {
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: ({ credential }) => credential
          ? resolve(credential)
          : reject(new Error('Google did not return a credential')),
        // We render our own button, so One Tap's auto-select would be a surprise.
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      // Render an invisible official button and click it: this keeps the popup
      // inside a real user gesture, which browsers require, while letting our own
      // styled button be the thing the user actually sees.
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;opacity:0;pointer-events:none;z-index:-1;top:0;left:0'
      document.body.appendChild(host)
      google.accounts.id.renderButton(host, { type: 'standard', size: 'large' })
      const real = host.querySelector('div[role=button]') || host.querySelector('div')
      if (!real) { host.remove(); return reject(new Error('Google button failed to render')) }
      real.click()
      setTimeout(() => host.remove(), 60000)
    }).catch(reject)
  })
}

/** Returns a Google ID token, or throws with a message worth showing the user. */
export async function getGoogleIdToken() {
  const configErr = googleConfigError()
  if (configErr) throw new Error(configErr)
  return Capacitor.isNativePlatform() ? nativeIdToken() : webIdToken()
}
