// CFP-style goal evaluation: on-track status, required SIP, inflation-adjusted targets.

export function milestoneValue(m, accounts, projection) {
  if (m.accountId) {
    return accounts.find((a) => a.id === m.accountId)?.balance ?? 0
  }
  if (m.metric === 'netWorth') return projection[0]?.netWorth ?? 0
  if (m.metric === 'investable') return projection[0]?.investable ?? 0
  return 0
}

export function isPayoffGoal(m, accounts) {
  return !!(m.accountId && accounts.find((a) => a.id === m.accountId)?.kind === 'liability')
}

export function projectedAchievementYear(m, accounts, projection) {
  const payoff = isPayoffGoal(m, accounts)
  for (const row of projection) {
    const val = m.metric === 'netWorth'
      ? row.netWorth
      : m.metric === 'investable'
        ? row.investable
        : (row[m.accountId] ?? 0)
    if (payoff ? val <= (m.target || 0) : val >= m.target) return row.year
  }
  return null
}

/** Nominal future value of a today's-money target at goal year. */
export function inflationAdjustedTarget(target, years, inflation = 0.06) {
  if (years <= 0 || target <= 0) return target
  return Math.round(target * Math.pow(1 + inflation, years))
}

/** Monthly SIP needed to close the gap (standard annuity-due approximation). */
export function requiredMonthlySip({ current, targetFv, yearsRemaining, annualReturn = 0.12 }) {
  if (targetFv <= 0 || yearsRemaining <= 0) return 0
  const n = Math.round(yearsRemaining * 12)
  if (n <= 0) return 0
  const r = annualReturn / 12
  const fvFromPv = current * Math.pow(1 + r, n)
  const gap = targetFv - fvFromPv
  if (gap <= 0) return 0
  if (r < 1e-9) return Math.ceil(gap / n)
  const factor = (Math.pow(1 + r, n) - 1) / r
  return Math.ceil(gap / factor)
}

/** Linear timeline progress expected by now (0–100). */
export function expectedProgress({ startAge, targetAge, currentAge }) {
  if (!targetAge || !startAge || targetAge <= startAge) return null
  if (currentAge >= targetAge) return 100
  if (currentAge <= startAge) return 0
  return Math.min(100, Math.round(((currentAge - startAge) / (targetAge - startAge)) * 100))
}

export function onTrackStatus(actualProgress, expectedProgress) {
  if (expectedProgress == null) return null
  if (actualProgress >= expectedProgress + 8) return 'ahead'
  if (actualProgress >= expectedProgress - 8) return 'on-track'
  return 'behind'
}

export function actualMonthlySip(m, contributions) {
  if (m.accountId) {
    const yearly = contributions
      .filter((c) => c.accountId === m.accountId)
      .reduce((s, c) => s + c.amount, 0)
    return Math.round(yearly / 12)
  }
  const yearly = contributions.reduce((s, c) => s + c.amount, 0)
  return Math.round(yearly / 12)
}

export function defaultReturnRate(m, accounts) {
  if (m.returnRate != null) return m.returnRate
  if (m.accountId) {
    const acct = accounts.find((a) => a.id === m.accountId)
    if (acct?.growth != null) return acct.growth
  }
  return 0.12
}

export function evaluateGoal(m, { accounts, projection, profile, contributions, currentYear }) {
  const current = milestoneValue(m, accounts, projection)
  const payoff = isPayoffGoal(m, accounts)
  const achievedYear = projectedAchievementYear(m, accounts, projection)

  const progress = m.achieved
    ? 100
    : payoff
      ? Math.min(100, Math.round((1 - current / Math.max(accounts.find((a) => a.id === m.accountId)?.balance || 1, 1)) * 100))
      : m.target > 0
        ? Math.min(100, Math.round((current / m.target) * 100))
        : 0

  const startAge = m.startAge ?? profile.currentAge
  const targetAge = m.targetAge ?? (achievedYear != null ? achievedYear - currentYear + profile.currentAge : null)
  const yearsRemaining = targetAge != null ? Math.max(0, targetAge - profile.currentAge) : null

  const inflation = profile.inflation ?? 0.06
  const nominalTarget = payoff
    ? current
    : inflationAdjustedTarget(m.target, yearsRemaining ?? 0, inflation)

  const annualReturn = defaultReturnRate(m, accounts)
  const requiredSip = payoff || m.target <= 0
    ? 0
    : requiredMonthlySip({
        current,
        targetFv: nominalTarget,
        yearsRemaining: yearsRemaining ?? 1,
        annualReturn,
      })

  const actualSip = actualMonthlySip(m, contributions)
  const expected = expectedProgress({ startAge, targetAge, currentAge: profile.currentAge })
  const track = onTrackStatus(progress, expected)

  return {
    current,
    progress,
    achievedYear,
    isPayoff: payoff,
    startAge,
    targetAge,
    yearsRemaining,
    nominalTarget,
    inflationAdjusted: !payoff && yearsRemaining > 0 && m.target > 0,
    requiredSip,
    actualSip,
    sipGap: Math.max(0, requiredSip - actualSip),
    expectedProgress: expected,
    track,
    priority: m.priority ?? 99,
  }
}
