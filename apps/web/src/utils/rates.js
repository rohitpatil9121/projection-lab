/** Rates are stored as decimals (0.06) but users edit/see percentages (6). */

export function toPct(decimal) {
  const n = Number(decimal)
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n * 1000) / 10)
}

export function fromPct(pct) {
  const n = Number(pct)
  if (!Number.isFinite(n)) return 0
  return n / 100
}

export function fmtRate(decimal) {
  const n = Number(decimal)
  if (!Number.isFinite(n)) return '0%'
  const p = Math.round(n * 1000) / 10
  return `${Number.isInteger(p) ? p : p}%`
}
