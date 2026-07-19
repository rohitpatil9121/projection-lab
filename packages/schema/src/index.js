import { z } from 'zod'

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const growth = z.number().min(-0.5).max(0.5)
const age = z.number().int().min(16).max(100)

export const AccountSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  kind: z.enum(['asset', 'liability']),
  type: z.enum(['cash', 'investment', 'retirement', 'real-estate', 'loan']),
  balance: z.number().min(0),
  growth: growth,
  payoff: z.number().min(0).max(1).nullable().optional(),
  color,
})

export const FlowSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  amount: z.number(),
  growth: growth.default(0),
  startAge: age,
  endAge: age,
  color,
  section: z.string().nullable().optional(),
  /** For an expense that services a debt: the liability it pays down (e.g. an EMI).
   *  Without it the projection can't know that this outflow is retiring that loan. */
  accountId: z.string().min(1).max(64).nullable().optional(),
}).refine((d) => d.endAge >= d.startAge, { message: 'endAge must be >= startAge' })

export const ContributionSchema = z.object({
  id: z.string().min(1).max(64),
  accountId: z.string().min(1).max(64),
  amount: z.number().min(0),
  section: z.string().nullable().optional(),
})

/** A goal. One record covers all three things a plan needs to say about a future
 *  moment: what it costs, when it lands, and whether the money actually leaves.
 *  `kind` picks which of those apply:
 *    save   — accumulate `target`; nothing is spent (the classic milestone).
 *    spend  — accumulate `target`, then `cashImpact` leaves the plan at `targetAge`.
 *    marker — no target; just a dated point, optionally with money arriving. */
export const MilestoneSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  target: z.number(),
  kind: z.enum(['save', 'spend', 'marker']).default('save'),
  /** Signed cash applied to the projection at `targetAge`; negative = money out.
   *  0 for a pure tracking goal, which is why `save` never moves the projection. */
  cashImpact: z.number().default(0),
  accountId: z.string().optional(),
  metric: z.string().nullable().optional(),
  icon: z.string().max(8).optional(),
  color: color.optional(),
  achieved: z.boolean().default(false),
  /** Age when tracking started (defaults to current age at creation). */
  startAge: age.optional(),
  /** Target age by which the goal should be met — drives on-track timeline. */
  targetAge: age.optional(),
  /** 1 = highest funding priority. */
  priority: z.number().int().min(1).max(99).optional(),
  /** Expected annual return for SIP calculation (0.12 = 12%). */
  returnRate: growth.optional(),
})

/** Superseded by MilestoneSchema — kept only so plans written before goals and
 *  life events merged still parse. migratePlanPayload folds these into milestones. */
export const EventSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  age: age,
  amount: z.number(),
  icon: z.string().max(8).optional(),
  color,
})

/** A monthly net-worth check-in. The one thing here the user cannot retype from memory,
 *  so it travels with the plan rather than living only on one device. */
export const SnapshotSchema = z.object({
  ym: z.string().regex(/^\d{4}-\d{2}$/),
  netWorth: z.number(),
  score: z.number().min(0).max(100).optional(),
})

export const PlanPayloadSchema = z.object({
  accounts: z.array(AccountSchema).max(100),
  incomes: z.array(FlowSchema).max(100),
  expenses: z.array(FlowSchema).max(100),
  contributions: z.array(ContributionSchema).max(100),
  milestones: z.array(MilestoneSchema).max(100),
  // Optional so plans written before goals and life events merged still validate.
  // Read only by migratePlanPayload; nothing downstream consumes it.
  events: z.array(EventSchema).max(100).optional(),
  // Optional so plans written before check-ins synced still validate.
  snapshots: z.array(SnapshotSchema).max(600).optional(),
}).superRefine((data, ctx) => {
  const assetIds = new Set(data.accounts.filter((a) => a.kind === 'asset').map((a) => a.id))
  data.contributions.forEach((c, i) => {
    if (!assetIds.has(c.accountId)) {
      ctx.addIssue({ code: 'custom', path: ['contributions', i, 'accountId'], message: 'accountId must reference an asset' })
    }
  })
  // An expense may name the debt it services; a dangling link would silently stop
  // paying the loan down, so reject it rather than let the projection drift.
  const liabilityIds = new Set(data.accounts.filter((a) => a.kind === 'liability').map((a) => a.id))
  data.expenses.forEach((e, i) => {
    if (e.accountId != null && !liabilityIds.has(e.accountId)) {
      ctx.addIssue({ code: 'custom', path: ['expenses', i, 'accountId'], message: 'accountId must reference a liability' })
    }
  })
  const size = JSON.stringify(data).length
  if (size > 256 * 1024) {
    ctx.addIssue({ code: 'custom', message: 'payload exceeds 256 KB' })
  }
})

export const ProfileSchema = z.object({
  name: z.string().min(1).max(120),
  currentAge: age,
  retirementAge: age,
  lifeExpectancy: age,
  currency: z.string().length(3).default('INR'),
  inflation: z.number().min(0).max(0.2).default(0.06),
  taxRegime: z.enum(['old', 'new']).default('old'),
  taxSlab: z.number().min(0).max(0.5).default(0.3),
  /** Annual gross salary (₹) — used by the tax engine; null = not provided. */
  grossSalary: z.number().min(0).nullable().optional(),
}).refine((d) => d.retirementAge > d.currentAge, { message: 'retirementAge must be > currentAge' })
  .refine((d) => d.lifeExpectancy >= d.retirementAge, { message: 'lifeExpectancy must be >= retirementAge' })

export const defaultPlanPayload = {
  accounts: [
    { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 360000, growth: 0.04, color: '#22c55e' },
    { id: 'equity', name: 'Equity Mutual Funds (SIP)', type: 'investment', kind: 'asset', balance: 850000, growth: 0.12, color: '#6366f1' },
    { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 620000, growth: 0.0815, color: '#8b5cf6' },
    { id: 'ppf', name: 'PPF', type: 'retirement', kind: 'asset', balance: 410000, growth: 0.071, color: '#a855f7' },
    { id: 'nps', name: 'NPS', type: 'retirement', kind: 'asset', balance: 240000, growth: 0.10, color: '#0ea5e9' },
    { id: 'home', name: 'Primary Home', type: 'real-estate', kind: 'asset', balance: 8000000, growth: 0.06, color: '#f59e0b' },
    { id: 'homeloan', name: 'Home Loan', type: 'loan', kind: 'liability', balance: 4500000, growth: 0.087, payoff: 0.05, color: '#ef4444' },
    { id: 'carloan', name: 'Car Loan', type: 'loan', kind: 'liability', balance: 320000, growth: 0.095, payoff: 0.22, color: '#f43f5e' },
  ],
  incomes: [
    { id: 'salary', name: 'Salary (CTC take-home)', amount: 1800000, growth: 0.08, startAge: 32, endAge: 60, color: '#6366f1' },
    { id: 'rental', name: 'Rental Income', amount: 240000, growth: 0.05, startAge: 32, endAge: 85, color: '#14b8a6' },
    { id: 'pension', name: 'NPS Annuity + EPF Pension', amount: 480000, growth: 0.04, startAge: 60, endAge: 85, color: '#0ea5e9' },
  ],
  expenses: [
    { id: 'living', name: 'Household & Living', amount: 600000, growth: 0.06, startAge: 32, endAge: 85, color: '#ef4444' },
    { id: 'emi', name: 'Home Loan EMI', amount: 540000, growth: 0, startAge: 32, endAge: 52, color: '#f59e0b' },
    { id: 'education', name: "Children's Education", amount: 180000, growth: 0.08, startAge: 32, endAge: 55, color: '#ec4899' },
    { id: 'travel', name: 'Travel & Lifestyle', amount: 150000, growth: 0.06, startAge: 32, endAge: 75, color: '#f97316' },
  ],
  contributions: [
    { id: 'c1', accountId: 'epf', amount: 180000, section: '80C' },
    { id: 'c2', accountId: 'ppf', amount: 150000, section: '80C' },
    { id: 'c3', accountId: 'equity', amount: 300000, section: null },
    { id: 'c4', accountId: 'nps', amount: 50000, section: '80CCD1B' },
  ],
  milestones: [
    { id: 'm1', name: 'Emergency Fund (6 months)', kind: 'save', target: 360000, cashImpact: 0, accountId: 'savings', icon: '🛟', achieved: true, priority: 1 },
    { id: 'm2', name: 'First ₹1 Crore Net Worth', kind: 'save', target: 10000000, cashImpact: 0, metric: 'netWorth', icon: '💎', achieved: false, startAge: 32, targetAge: 45, priority: 2 },
    // Saving for this and spending it are the same goal, so target and cashImpact match.
    { id: 'm3', name: "Child's Higher Education", kind: 'spend', target: 5000000, cashImpact: -5000000, metric: 'investable', icon: '🎓', achieved: false, startAge: 32, targetAge: 48, priority: 3 },
    { id: 'm4', name: 'Retirement Corpus (₹5 Cr FI)', kind: 'save', target: 50000000, cashImpact: 0, metric: 'netWorth', icon: '🏝️', achieved: false, startAge: 32, targetAge: 60, priority: 4 },
    { id: 'm5', name: 'Home Loan Free', kind: 'save', target: 0, cashImpact: 0, accountId: 'homeloan', icon: '🏠', achieved: false, startAge: 32, targetAge: 52, priority: 5 },
    { id: 'm6', name: 'Buy a car', kind: 'spend', target: 1200000, cashImpact: -1200000, metric: 'investable', icon: '🚗', achieved: false, startAge: 32, targetAge: 35, priority: 6 },
    { id: 'm7', name: "Child's Marriage", kind: 'spend', target: 2500000, cashImpact: -2500000, metric: 'investable', icon: '💍', achieved: false, startAge: 32, targetAge: 55, priority: 7 },
    { id: 'm8', name: 'Downsize / sell 2nd property', kind: 'marker', target: 0, cashImpact: 4000000, icon: '📦', achieved: false, targetAge: 70, priority: 8 },
  ],
}

export const defaultProfile = {
  name: 'Aarav Sharma',
  currentAge: 32,
  retirementAge: 60,
  lifeExpectancy: 85,
  currency: 'INR',
  inflation: 0.06,
  taxRegime: 'old',
  taxSlab: 0.30,
  grossSalary: 2400000,
}

export const emptyPlanPayload = {
  accounts: [],
  incomes: [],
  expenses: [],
  contributions: [],
  milestones: [],
}

export const emptyProfile = {
  ...defaultProfile,
  name: '',
  grossSalary: null,
}

/** Folds a pre-merge `events` array into `milestones`. Goals and life events used to
 *  be two collections describing the same future moments, so an event becomes the goal
 *  it always was: what it costs, when, and that the money leaves.
 *  Idempotent — a payload without `events` passes straight through. */
export function migratePlanPayload(data) {
  if (!data || !Array.isArray(data.events) || data.events.length === 0) {
    const { events, ...rest } = data || {}
    return rest
  }
  const { events, ...rest } = data
  const migrated = events.map((e) => {
    const base = { id: e.id, name: e.name, targetAge: e.age, icon: e.icon, color: e.color }
    // Money leaving is a goal you save toward, so the outflow doubles as the target.
    // Anything else (a dated marker, or money arriving) has nothing to save toward.
    return e.amount < 0
      ? { ...base, kind: 'spend', target: Math.abs(e.amount), cashImpact: e.amount, metric: 'investable', achieved: false }
      : { ...base, kind: 'marker', target: 0, cashImpact: e.amount, achieved: false }
  })
  const existing = Array.isArray(rest.milestones) ? rest.milestones : []
  const taken = new Set(existing.map((m) => m.id))
  return {
    ...rest,
    milestones: [...existing, ...migrated.filter((m) => !taken.has(m.id))],
  }
}

export function parsePlanPayload(data) {
  return PlanPayloadSchema.parse(migratePlanPayload(data))
}

export function parseProfile(data) {
  return ProfileSchema.parse(data)
}
