export const isProduction = process.env.NODE_ENV === 'production'

/** Attach dev-only fields (OTP codes) — never returned in production. */
export function withDevFields(body, fields) {
  if (isProduction) return body
  return { ...body, ...fields }
}
