// Indian number formatting — rupee symbol + lakh/crore grouping.

export const fmtMoney = (n, opts = {}) => {
  const { compact = false, sign = false, sankey = false } = opts
  const abs = Math.abs(n)
  let s
  if (compact) {
    if (abs >= 1e7) {
      s = String(parseFloat((abs / 1e7).toFixed(sankey ? 2 : abs >= 1e8 ? 0 : 2))) + ' Cr'
    } else if (abs >= 1e5) {
      s = String(parseFloat((abs / 1e5).toFixed(sankey ? 1 : abs >= 1e6 ? 0 : 1))) + ' L'
    } else if (abs >= 1e3) {
      s = (abs / 1e3).toFixed(0) + 'K'
    } else {
      s = String(Math.round(abs))
    }
  } else {
    s = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(abs)
  }
  const prefix = n < 0 ? '-₹' : sign ? '+₹' : '₹'
  return `${prefix}${s}`
}

export const fmtPct = (n) => `${(n * 100).toFixed(1)}%`

export const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n)
