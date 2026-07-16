import { verifyAccess } from './auth.js'
import { users } from './db.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = verifyAccess(token)
    const user = await users.byId(payload.sub)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/** Turns a ZodError into one readable line: "accounts.0.balance: must be >= 0". */
function zodMessage(err) {
  const parts = err.issues.slice(0, 3).map((i) => {
    const path = Array.isArray(i.path) ? i.path.join('.') : ''
    return path ? `${path}: ${i.message}` : i.message
  })
  const extra = err.issues.length - parts.length
  return parts.join('; ') + (extra > 0 ? ` (+${extra} more)` : '')
}

export function errorHandler(err, _req, res, _next) {
  // Zod throws when the client sends a malformed payload. It carries no `status`, so
  // without this it fell through to 500 — reporting a caller's mistake as a server
  // fault, dumping the raw issue array to them, and logging it as if we'd crashed.
  const isZod = err?.name === 'ZodError' && Array.isArray(err.issues)
  const status = isZod ? 400 : (err.status || 500)
  const body = { error: isZod ? zodMessage(err) : (err.message || 'Internal server error') }
  if (err.status === 409 && err.plan) {
    body.plan = {
      id: err.plan.id,
      version: err.plan.version,
      payload: err.plan.payload,
      updatedAt: err.plan.updatedAt,
    }
  }
  if (status >= 500) console.error(err)
  res.status(status).json(body)
}
