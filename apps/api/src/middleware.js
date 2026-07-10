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

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500
  const body = { error: err.message || 'Internal server error' }
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
