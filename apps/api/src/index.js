import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { requestOtp, verifyOtp, requestPhoneOtp, verifyPhoneOtp, registerUser, loginUser, requestPasswordReset, resetPassword, refreshSession, logout, signInWithGoogle } from './auth.js'
import { verifyGoogleIdToken, googleConfigured } from './google.js'
import { listPlans, getPlan, createPlan, ensureDefaultPlan, updatePlan, deletePlan } from './plans.js'
import { requireAuth, errorHandler } from './middleware.js'
import { users, sessions, plans, ready } from './db.js'
import { TAX_CONFIG, TAX_FY } from '@projectlab/engine'
import { emailConfigured, sendOtpEmail, sendCodeEmail } from './email.js'
import { askEnough, enoughAskConfigured } from './enough.js'
import { withDevFields, isProduction } from './dev.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const privacyPolicyPath = path.join(__dirname, '../../web/public/privacy-policy.html')
const webDistPath = path.join(__dirname, '../../web/dist')

const app = express()
const PORT = process.env.PORT || 3001

app.set('trust proxy', 1) // behind Render's proxy — needed for correct rate-limit IPs
// CSP is written for the web app this server also hosts: Google Identity Services
// (script + iframe + popup) and Google Fonts are the only external origins it touches.
// COOP must be 'same-origin-allow-popups' or GSI's sign-in popup cannot message back.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", 'https://accounts.google.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      // The Render origin is listed explicitly so a bundle built with an absolute
      // VITE_API_URL (the APK's .env.production) still works when served locally.
      'connect-src': ["'self'", 'https://accounts.google.com', 'https://projection-lab.onrender.com'],
      'frame-src': ['https://accounts.google.com'],
      'img-src': ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginEmbedderPolicy: false,
}))
// Auth is via Bearer tokens (not cookies), so we allow any origin without credentials.
app.use(cors({ origin: true, credentials: false }))
app.use(express.json({ limit: '512kb' }))

// Global rate limit — 300 requests / 15 min per IP.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
}))

// Stricter limit on auth endpoints — 20 attempts / 15 min per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
})
app.use('/v1/auth', authLimiter)

/**
 * Password guessing gets a much tighter budget than the rest of /v1/auth: 4 failures
 * per 15 minutes.
 *
 * Deliberately its own limiter rather than lowering authLimiter, because that one also
 * covers /auth/refresh — dropping it to 4 would 429 the token refresh of an ordinary
 * signed-in user and silently log them out mid-session.
 *
 * `skipSuccessfulRequests` means only FAILURES count, so someone who signs in correctly
 * never spends the budget, and a user who mistypes twice then succeeds starts clean.
 *
 * Keyed on IP + email, not IP alone: keying on email only would let anyone lock a victim
 * out of their own account by guessing at it, and IP only would punish everyone sharing
 * an office or carrier NAT for one person's typo.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // ipKeyGenerator normalises IPv6 into a sane subnet key; required in v8 when
  // writing a custom keyGenerator, or IPv6 clients each get their own bucket.
  keyGenerator: (req, res) =>
    `${ipKeyGenerator(req.ip)}:${String(req.body?.email || '').trim().toLowerCase()}`,
  message: {
    error: 'Too many failed sign-in attempts. Please wait 15 minutes and try again.',
  },
})

app.get('/healthz', (_req, res) => {
  // `auth` reports which sign-in methods this deployment can actually serve, so a
  // missing env var shows up here instead of as a mystery 503 at the login screen.
  res.json({
    ok: true,
    service: 'financial-blueprint-api',
    time: new Date().toISOString(),
    auth: { google: googleConfigured, email: emailConfigured },
    features: { enoughAsk: enoughAskConfigured() },
  })
})

app.get('/privacy-policy.html', (_req, res) => {
  try {
    res.type('html').send(readFileSync(privacyPolicyPath, 'utf8'))
  } catch {
    res.status(404).send('Privacy policy not found')
  }
})

app.post('/v1/auth/otp/request', async (req, res, next) => {
  try {
    if (!emailConfigured && isProduction) {
      return res.status(503).json({ error: 'Email OTP is not configured. Set BREVO_API_KEY or SMTP_* environment variables.' })
    }
    const code = await requestOtp(req.body.email || '')
    if (emailConfigured) {
      await sendOtpEmail(req.body.email.trim().toLowerCase(), code)
      res.json({ ok: true, message: 'OTP sent' })
    } else {
      res.json(withDevFields({ ok: true, message: 'OTP sent' }, { devOtp: code }))
    }
  } catch (err) { next(err) }
})

app.post('/v1/auth/otp/verify', async (req, res, next) => {
  try {
    const session = await verifyOtp(req.body.email || '', req.body.otp || '')
    await ensureDefaultPlan(session.user.id)
    res.json({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: publicUser(session.user),
    })
  } catch (err) { next(err) }
})

app.post('/v1/auth/google', async (req, res, next) => {
  try {
    const identity = await verifyGoogleIdToken(req.body.idToken || req.body.credential || '')
    const session = await signInWithGoogle(identity)
    await ensureDefaultPlan(session.user.id)
    res.json({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: publicUser(session.user) })
  } catch (err) { next(err) }
})

app.post('/v1/auth/register', async (req, res, next) => {
  try {
    const session = await registerUser(req.body.email || '', req.body.password || '', req.body.name)
    await ensureDefaultPlan(session.user.id)
    res.status(201).json({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: publicUser(session.user) })
  } catch (err) { next(err) }
})

app.post('/v1/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const session = await loginUser(req.body.email || '', req.body.password || '')
    await ensureDefaultPlan(session.user.id)
    res.json({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: publicUser(session.user) })
  } catch (err) { next(err) }
})

app.post('/v1/auth/password/forgot', async (req, res, next) => {
  try {
    const result = await requestPasswordReset(req.body.email || '')
    const body = { ok: true, message: 'If that email exists, a reset code has been sent.' }
    if (result.sent) {
      if (emailConfigured) {
        await sendCodeEmail(result.email, result.code, 'reset')
      } else if (!isProduction) {
        Object.assign(body, withDevFields({}, { devCode: result.code }))
      }
    }
    res.json(body)
  } catch (err) { next(err) }
})

app.post('/v1/auth/password/reset', async (req, res, next) => {
  try {
    const session = await resetPassword(req.body.email || '', req.body.code || '', req.body.password || '')
    await ensureDefaultPlan(session.user.id)
    res.json({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: publicUser(session.user) })
  } catch (err) { next(err) }
})

app.post('/v1/auth/phone/request', async (req, res, next) => {
  try {
    const { phone, devOtp } = await requestPhoneOtp(req.body.phone || '')
    res.json(withDevFields({ ok: true, message: 'OTP sent', phone }, devOtp ? { devOtp } : {}))
  } catch (err) { next(err) }
})

app.post('/v1/auth/phone/verify', async (req, res, next) => {
  try {
    const session = await verifyPhoneOtp(req.body.phone || '', req.body.otp || '')
    await ensureDefaultPlan(session.user.id)
    res.json({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: publicUser(session.user),
    })
  } catch (err) { next(err) }
})

app.post('/v1/auth/refresh', async (req, res, next) => {
  try {
    const session = await refreshSession(req.body.refreshToken || '')
    res.json({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: publicUser(session.user),
    })
  } catch (err) { next(err) }
})

app.post('/v1/auth/logout', async (req, res) => {
  await logout(req.body.refreshToken)
  res.json({ ok: true })
})

app.get('/v1/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user))
})

app.patch('/v1/me', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['name', 'currentAge', 'retirementAge', 'lifeExpectancy', 'inflation', 'taxRegime', 'taxSlab', 'grossSalary']
    const patch = {}
    for (const key of allowed) {
      if (req.body[key] != null) patch[key] = req.body[key]
    }
    if (req.body.uiPrefs) patch.uiPrefs = req.body.uiPrefs
    const updated = await users.update(req.user.id, patch)
    res.json(publicUser(updated))
  } catch (err) { next(err) }
})

// Google Play requires apps with accounts to offer in-app deletion of the account
// itself, not just its contents. Removes plans and sessions before the user row so
// a failure part-way can't strand rows pointing at a user that no longer exists.
app.delete('/v1/me', requireAuth, async (req, res, next) => {
  try {
    await plans.deleteByUser(req.user.id)
    await sessions.deleteByUser(req.user.id)
    await users.del(req.user.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

app.get('/v1/plans', requireAuth, async (req, res) => {
  res.json(await listPlans(req.user.id))
})

app.post('/v1/plans', requireAuth, async (req, res, next) => {
  try {
    const plan = await createPlan(req.user.id, req.body)
    res.status(201).json(plan)
  } catch (err) { next(err) }
})

app.get('/v1/plans/:id', requireAuth, async (req, res, next) => {
  try {
    res.json(await getPlan(req.user.id, req.params.id))
  } catch (err) { next(err) }
})

app.put('/v1/plans/:id', requireAuth, async (req, res, next) => {
  try {
    const plan = await updatePlan(req.user.id, req.params.id, {
      payload: req.body.payload,
      version: req.body.version,
      profile: req.body.profile,
      uiPrefs: req.body.uiPrefs,
    })
    res.json(plan)
  } catch (err) { next(err) }
})

app.delete('/v1/plans/:id', requireAuth, async (req, res, next) => {
  try {
    await deletePlan(req.user.id, req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

app.get('/v1/tax/config', (_req, res) => {
  res.json({ fy: TAX_FY, config: TAX_CONFIG[TAX_FY] })
})

/**
 * The "What if" model seam. A single sentence in, operations out — never a figure, never
 * the plan. Its own limiter (per IP) because the model is a shared, billable resource and
 * this is where a bored visitor would otherwise burn the quota. No auth: the tab is usable
 * before sign-in, and only the sentence ever leaves the device.
 */
const enoughAskLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'That is enough questions for now. Try again in a while.' },
})
app.post('/v1/enough/ask', enoughAskLimiter, async (req, res, next) => {
  try {
    const result = await askEnough(req.body?.text || '')
    res.json(result)
  } catch (err) {
    if (err.status === 503) return res.status(503).json({ error: 'The What-if model is not configured.' })
    if (err.status === 502) return res.status(502).json({ error: 'The model did not answer.' })
    next(err)
  }
})

// Serve the built web app (apps/web/dist) so one Render service hosts both the API
// and the webapp on the same origin — the frontend's API_BASE falls back to '/v1'.
// Registered after all API routes; the SPA fallback only answers GET requests that
// aren't API paths, so unknown /v1/* calls still 404 as JSON via errorHandler.
if (existsSync(path.join(webDistPath, 'index.html'))) {
  // Hashed assets cache long; index.html must revalidate or users keep a stale
  // shell pointing at asset files that no longer exist after the next deploy.
  app.use(express.static(webDistPath, {
    index: 'index.html',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache')
      // Only Vite's content-hashed /assets/ files are safe to cache forever;
      // public/ files (logo.png etc.) keep stable names and get a short cache.
      else if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      else res.setHeader('Cache-Control', 'public, max-age=3600')
    },
  }))
  app.get(/^\/(?!v1\/|healthz).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(webDistPath, 'index.html'))
  })
  console.log('Serving web app from', webDistPath)
}

app.use(errorHandler)

await ready
app.listen(PORT, () => {
  console.log(`Financial Blueprint API listening on http://localhost:${PORT}`)
})

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    currentAge: user.currentAge,
    retirementAge: user.retirementAge,
    lifeExpectancy: user.lifeExpectancy,
    inflation: user.inflation,
    taxRegime: user.taxRegime,
    taxSlab: user.taxSlab,
    grossSalary: user.grossSalary,
    currency: user.currency,
    uiPrefs: user.uiPrefs,
  }
}
