import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { requestOtp, verifyOtp, requestPhoneOtp, verifyPhoneOtp, registerUser, loginUser, requestPasswordReset, resetPassword, refreshSession, logout, signInWithGoogle } from './auth.js'
import { verifyGoogleIdToken, googleConfigured } from './google.js'
import { listPlans, getPlan, createPlan, ensureDefaultPlan, updatePlan, deletePlan } from './plans.js'
import { requireAuth, errorHandler } from './middleware.js'
import { users, ready } from './db.js'
import { TAX_CONFIG, TAX_FY } from '@projectlab/engine'
import { emailConfigured, sendOtpEmail, sendCodeEmail } from './email.js'
import { withDevFields, isProduction } from './dev.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const privacyPolicyPath = path.join(__dirname, '../../web/public/privacy-policy.html')

const app = express()
const PORT = process.env.PORT || 3001

app.set('trust proxy', 1) // behind Render's proxy — needed for correct rate-limit IPs
app.use(helmet())
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

app.get('/healthz', (_req, res) => {
  // `auth` reports which sign-in methods this deployment can actually serve, so a
  // missing env var shows up here instead of as a mystery 503 at the login screen.
  res.json({
    ok: true,
    service: 'financial-blueprint-api',
    time: new Date().toISOString(),
    auth: { google: googleConfigured, email: emailConfigured },
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

app.post('/v1/auth/login', async (req, res, next) => {
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
