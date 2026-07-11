import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { requestOtp, verifyOtp, requestPhoneOtp, verifyPhoneOtp, refreshSession, logout } from './auth.js'
import { listPlans, getPlan, createPlan, ensureDefaultPlan, updatePlan, deletePlan } from './plans.js'
import { requireAuth, errorHandler } from './middleware.js'
import { users, ready } from './db.js'
import { emailConfigured, sendOtpEmail } from './email.js'

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
  res.json({ ok: true, service: 'projectlab-api', time: new Date().toISOString() })
})

app.post('/v1/auth/otp/request', async (req, res, next) => {
  try {
    const code = await requestOtp(req.body.email || '')
    const body = { ok: true, message: 'OTP sent' }
    if (emailConfigured) {
      await sendOtpEmail(req.body.email.trim().toLowerCase(), code)
    } else {
      body.devOtp = code
    }
    res.json(body)
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

app.post('/v1/auth/phone/request', async (req, res, next) => {
  try {
    const { phone, devOtp } = await requestPhoneOtp(req.body.phone || '')
    const body = { ok: true, message: 'OTP sent', phone }
    if (devOtp) body.devOtp = devOtp
    res.json(body)
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
    const allowed = ['name', 'currentAge', 'retirementAge', 'lifeExpectancy', 'inflation', 'taxRegime', 'taxSlab']
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
  res.json({
    fy: '2026-27',
    config: {
      old: {
        deductions: { '80C': 150000, '80CCD1B': 50000, '80D': { self: 25000, senior: 50000 } },
        slabs: [[250000, 0], [500000, 0.05], [1000000, 0.2], [null, 0.3]],
      },
      new: {
        slabs: [[300000, 0], [700000, 0.05], [1000000, 0.1], [1200000, 0.15], [1500000, 0.2], [null, 0.3]],
        standardDeduction: 75000,
      },
      cess: 0.04,
    },
  })
})

app.use(errorHandler)

await ready
app.listen(PORT, () => {
  console.log(`ProjectLab API listening on http://localhost:${PORT}`)
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
    currency: user.currency,
    uiPrefs: user.uiPrefs,
  }
}
