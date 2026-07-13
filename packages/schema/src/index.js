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
}).refine((d) => d.endAge >= d.startAge, { message: 'endAge must be >= startAge' })

export const ContributionSchema = z.object({
  id: z.string().min(1).max(64),
  accountId: z.string().min(1).max(64),
  amount: z.number().min(0),
  section: z.string().nullable().optional(),
})

export const MilestoneSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  target: z.number(),
  accountId: z.string().optional(),
  metric: z.string().nullable().optional(),
  icon: z.string().max(8).optional(),
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

export const EventSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  age: age,
  amount: z.number(),
  icon: z.string().max(8).optional(),
  color,
})

export const PlanPayloadSchema = z.object({
  accounts: z.array(AccountSchema).max(100),
  incomes: z.array(FlowSchema).max(100),
  expenses: z.array(FlowSchema).max(100),
  contributions: z.array(ContributionSchema).max(100),
  milestones: z.array(MilestoneSchema).max(100),
  events: z.array(EventSchema).max(100),
}).superRefine((data, ctx) => {
  const assetIds = new Set(data.accounts.filter((a) => a.kind === 'asset').map((a) => a.id))
  data.contributions.forEach((c, i) => {
    if (!assetIds.has(c.accountId)) {
      ctx.addIssue({ code: 'custom', path: ['contributions', i, 'accountId'], message: 'accountId must reference an asset' })
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
    { id: 'health', name: 'Health Insurance (80D)', amount: 30000, growth: 0.08, startAge: 32, endAge: 85, section: '80D', color: '#f43f5e' },
  ],
  contributions: [
    { id: 'c1', accountId: 'epf', amount: 180000, section: '80C' },
    { id: 'c2', accountId: 'ppf', amount: 150000, section: '80C' },
    { id: 'c3', accountId: 'equity', amount: 300000, section: null },
    { id: 'c4', accountId: 'nps', amount: 50000, section: '80CCD1B' },
  ],
  milestones: [
    { id: 'm1', name: 'Emergency Fund (6 months)', target: 360000, accountId: 'savings', icon: '🛟', achieved: true, priority: 1 },
    { id: 'm2', name: 'First ₹1 Crore Net Worth', target: 10000000, metric: 'netWorth', icon: '💎', achieved: false, startAge: 32, targetAge: 45, priority: 2 },
    { id: 'm3', name: "Child's Education Corpus", target: 5000000, metric: 'investable', icon: '🎓', achieved: false, startAge: 32, targetAge: 48, priority: 3 },
    { id: 'm4', name: 'Retirement Corpus (₹5 Cr FI)', target: 50000000, metric: 'netWorth', icon: '🏝️', achieved: false, startAge: 32, targetAge: 60, priority: 4 },
    { id: 'm5', name: 'Home Loan Free', target: 0, accountId: 'homeloan', icon: '🏠', achieved: false, startAge: 32, targetAge: 52, priority: 5 },
  ],
  events: [
    { id: 'e1', name: 'Buy a car', age: 35, amount: -1200000, icon: '🚗', color: '#f59e0b' },
    { id: 'e2', name: "Child's higher education", age: 48, amount: -3000000, icon: '🎓', color: '#0ea5e9' },
    { id: 'e3', name: "Child's marriage", age: 55, amount: -2500000, icon: '💍', color: '#ec4899' },
    { id: 'e4', name: 'Retire', age: 60, amount: 0, icon: '🌴', color: '#22c55e' },
    { id: 'e5', name: 'Downsize / sell 2nd property', age: 70, amount: 4000000, icon: '📦', color: '#8b5cf6' },
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
}

export const emptyPlanPayload = {
  accounts: [],
  incomes: [],
  expenses: [],
  contributions: [],
  milestones: [],
  events: [],
}

export const emptyProfile = {
  ...defaultProfile,
  name: '',
}

export function parsePlanPayload(data) {
  return PlanPayloadSchema.parse(data)
}

export function parseProfile(data) {
  return ProfileSchema.parse(data)
}
