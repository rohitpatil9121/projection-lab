// Example personas for Sandbox mode — India edition.
// Each includes a full plan so users can see the app fully populated.

const L = 100000

export const PERSONAS = [
  {
    id: 'fresh-grad',
    icon: '🎓',
    title: 'Fresh Graduate, Single',
    desc: 'First job, education loan, starting SIPs.',
    profile: { name: 'Ananya Verma', currentAge: 24, retirementAge: 60, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 80000, growth: 0.04, color: '#22c55e' },
      { id: 'equity', name: 'Equity Mutual Funds', type: 'investment', kind: 'asset', balance: 50000, growth: 0.12, color: '#6366f1' },
      { id: 'eduloan', name: 'Education Loan', type: 'loan', kind: 'liability', balance: 300000, growth: 0.10, payoff: 0.2, color: '#ef4444' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 420000, growth: 0.09, startAge: 24, endAge: 60, color: '#6366f1' },
    ],
    expenses: [
      { id: 'living', name: 'Rent & Living', amount: 240000, growth: 0.06, startAge: 24, endAge: 85, color: '#ef4444' },
      { id: 'emi', name: 'Education Loan EMI', amount: 66000, growth: 0, startAge: 24, endAge: 30, color: '#f59e0b' },
    ],
    contributions: [
      { id: 'c1', accountId: 'equity', amount: 60000, section: null },
    ],
    milestones: [
      { id: 'm1', name: 'Emergency Fund (6 months)', target: 120000, accountId: 'savings', icon: '🛟', achieved: false },
      { id: 'm2', name: 'Education Loan Free', target: 0, accountId: 'eduloan', icon: '🎓', achieved: false },
      { id: 'm3', name: 'First ₹10 Lakh Net Worth', target: 10 * L, metric: 'netWorth', icon: '💎', achieved: false },
    ],
    events: [
      { id: 'e1', name: 'Buy a bike', age: 26, amount: -150000, icon: '🏍️', color: '#f59e0b' },
      { id: 'e2', name: 'Retire', age: 60, amount: 0, icon: '🌴', color: '#22c55e' },
    ],
  },
  {
    id: 'early-married',
    icon: '💑',
    title: 'Early Career, Married',
    desc: 'Double income, saving for a house and a baby.',
    profile: { name: 'Rahul & Sneha', currentAge: 29, retirementAge: 58, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 250000, growth: 0.04, color: '#22c55e' },
      { id: 'equity', name: 'Equity Mutual Funds', type: 'investment', kind: 'asset', balance: 400000, growth: 0.12, color: '#6366f1' },
      { id: 'epf', name: 'EPF (both)', type: 'retirement', kind: 'asset', balance: 300000, growth: 0.0815, color: '#8b5cf6' },
      { id: 'carloan', name: 'Car Loan', type: 'loan', kind: 'liability', balance: 250000, growth: 0.095, payoff: 0.3, color: '#f43f5e' },
    ],
    incomes: [
      { id: 'salary1', name: 'Salary — Rahul', amount: 1200000, growth: 0.08, startAge: 29, endAge: 58, color: '#6366f1' },
      { id: 'salary2', name: 'Salary — Sneha', amount: 600000, growth: 0.07, startAge: 29, endAge: 55, color: '#14b8a6' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 700000, growth: 0.06, startAge: 29, endAge: 85, color: '#ef4444' },
      { id: 'emi', name: 'Car Loan EMI', amount: 90000, growth: 0, startAge: 29, endAge: 33, color: '#f59e0b' },
      { id: 'health', name: 'Health Insurance (80D)', amount: 25000, growth: 0.08, startAge: 29, endAge: 85, section: '80D', color: '#f43f5e' },
    ],
    contributions: [
      { id: 'c1', accountId: 'equity', amount: 240000, section: null },
      { id: 'c2', accountId: 'epf', amount: 100000, section: '80C' },
    ],
    milestones: [
      { id: 'm1', name: 'House Down Payment', target: 15 * L, metric: 'investable', icon: '🏠', achieved: false },
      { id: 'm2', name: 'First ₹1 Crore Net Worth', target: 100 * L, metric: 'netWorth', icon: '💎', achieved: false },
    ],
    events: [
      { id: 'e1', name: 'Buy a house', age: 32, amount: -2500000, icon: '🏠', color: '#f59e0b' },
      { id: 'e2', name: 'Baby arrives', age: 31, amount: -200000, icon: '👶', color: '#ec4899' },
      { id: 'e3', name: 'Retire', age: 58, amount: 0, icon: '🌴', color: '#22c55e' },
    ],
  },
  {
    id: 'mid-debt',
    icon: '🏦',
    title: 'Mid Career, High Debt',
    desc: 'Working to pay down home + personal loans.',
    profile: { name: 'Vikram Singh', currentAge: 36, retirementAge: 60, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 200000, growth: 0.04, color: '#22c55e' },
      { id: 'equity', name: 'Equity Mutual Funds', type: 'investment', kind: 'asset', balance: 350000, growth: 0.12, color: '#6366f1' },
      { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 550000, growth: 0.0815, color: '#8b5cf6' },
      { id: 'home', name: 'Primary Home', type: 'real-estate', kind: 'asset', balance: 7500000, growth: 0.06, color: '#f59e0b' },
      { id: 'homeloan', name: 'Home Loan', type: 'loan', kind: 'liability', balance: 5500000, growth: 0.087, payoff: 0.04, color: '#ef4444' },
      { id: 'ploan', name: 'Personal Loan', type: 'loan', kind: 'liability', balance: 400000, growth: 0.14, payoff: 0.3, color: '#f43f5e' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 1600000, growth: 0.07, startAge: 36, endAge: 60, color: '#6366f1' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 650000, growth: 0.06, startAge: 36, endAge: 85, color: '#ef4444' },
      { id: 'emi1', name: 'Home Loan EMI', amount: 550000, growth: 0, startAge: 36, endAge: 56, color: '#f59e0b' },
      { id: 'emi2', name: 'Personal Loan EMI', amount: 140000, growth: 0, startAge: 36, endAge: 39, color: '#f97316' },
    ],
    contributions: [
      { id: 'c1', accountId: 'epf', amount: 120000, section: '80C' },
    ],
    milestones: [
      { id: 'm1', name: 'Personal Loan Free', target: 0, accountId: 'ploan', icon: '🔥', achieved: false },
      { id: 'm2', name: 'Home Loan Free', target: 0, accountId: 'homeloan', icon: '🏠', achieved: false },
      { id: 'm3', name: 'Emergency Fund (6 months)', target: 400000, accountId: 'savings', icon: '🛟', achieved: false },
    ],
    events: [
      { id: 'e1', name: "Child's higher education", age: 50, amount: -2500000, icon: '🎓', color: '#0ea5e9' },
      { id: 'e2', name: 'Retire', age: 60, amount: 0, icon: '🌴', color: '#22c55e' },
    ],
  },
  {
    id: 'fire',
    icon: '🔥',
    title: 'FIRE Aspirant',
    desc: 'Aggressive SIPs, targeting retirement at 45.',
    profile: { name: 'Karan Mehta', currentAge: 30, retirementAge: 45, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 500000, growth: 0.04, color: '#22c55e' },
      { id: 'equity', name: 'Equity MF + Stocks', type: 'investment', kind: 'asset', balance: 2500000, growth: 0.12, color: '#6366f1' },
      { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 600000, growth: 0.0815, color: '#8b5cf6' },
      { id: 'ppf', name: 'PPF', type: 'retirement', kind: 'asset', balance: 350000, growth: 0.071, color: '#a855f7' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 2400000, growth: 0.08, startAge: 30, endAge: 45, color: '#6366f1' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 600000, growth: 0.06, startAge: 30, endAge: 85, color: '#ef4444' },
      { id: 'health', name: 'Health Insurance (80D)', amount: 30000, growth: 0.08, startAge: 30, endAge: 85, section: '80D', color: '#f43f5e' },
    ],
    contributions: [
      { id: 'c1', accountId: 'equity', amount: 900000, section: null },
      { id: 'c2', accountId: 'ppf', amount: 150000, section: '80C' },
    ],
    milestones: [
      { id: 'm1', name: 'First ₹1 Crore', target: 100 * L, metric: 'netWorth', icon: '💎', achieved: false },
      { id: 'm2', name: 'FI Corpus (₹3.5 Cr)', target: 350 * L, metric: 'netWorth', icon: '🏝️', achieved: false },
    ],
    events: [
      { id: 'e1', name: 'Retire early (FIRE)', age: 45, amount: 0, icon: '🔥', color: '#22c55e' },
      { id: 'e2', name: 'World travel year', age: 46, amount: -1000000, icon: '✈️', color: '#0ea5e9' },
    ],
  },
  {
    id: 'mid-family',
    icon: '👨‍👩‍👧',
    title: 'Mid Career, Family',
    desc: "Kids' education, home loan, on track to retire at 60.",
    profile: { name: 'Aarav Sharma', currentAge: 40, retirementAge: 60, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 500000, growth: 0.04, color: '#22c55e' },
      { id: 'equity', name: 'Equity Mutual Funds (SIP)', type: 'investment', kind: 'asset', balance: 1500000, growth: 0.12, color: '#6366f1' },
      { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 1200000, growth: 0.0815, color: '#8b5cf6' },
      { id: 'ppf', name: 'PPF', type: 'retirement', kind: 'asset', balance: 700000, growth: 0.071, color: '#a855f7' },
      { id: 'nps', name: 'NPS', type: 'retirement', kind: 'asset', balance: 400000, growth: 0.10, color: '#0ea5e9' },
      { id: 'home', name: 'Primary Home', type: 'real-estate', kind: 'asset', balance: 9000000, growth: 0.06, color: '#f59e0b' },
      { id: 'homeloan', name: 'Home Loan', type: 'loan', kind: 'liability', balance: 3500000, growth: 0.087, payoff: 0.06, color: '#ef4444' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 2000000, growth: 0.07, startAge: 40, endAge: 60, color: '#6366f1' },
      { id: 'rental', name: 'Rental Income', amount: 240000, growth: 0.05, startAge: 40, endAge: 85, color: '#14b8a6' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 800000, growth: 0.06, startAge: 40, endAge: 85, color: '#ef4444' },
      { id: 'emi', name: 'Home Loan EMI', amount: 540000, growth: 0, startAge: 40, endAge: 55, color: '#f59e0b' },
      { id: 'education', name: "Children's Education", amount: 250000, growth: 0.08, startAge: 40, endAge: 58, color: '#ec4899' },
      { id: 'health', name: 'Health Insurance (80D)', amount: 35000, growth: 0.08, startAge: 40, endAge: 85, section: '80D', color: '#f43f5e' },
    ],
    contributions: [
      { id: 'c1', accountId: 'epf', amount: 180000, section: '80C' },
      { id: 'c2', accountId: 'ppf', amount: 150000, section: '80C' },
      { id: 'c3', accountId: 'equity', amount: 360000, section: null },
      { id: 'c4', accountId: 'nps', amount: 50000, section: '80CCD1B' },
    ],
    milestones: [
      { id: 'm1', name: 'Emergency Fund (6 months)', target: 500000, accountId: 'savings', icon: '🛟', achieved: true },
      { id: 'm2', name: "Child's Education Corpus", target: 50 * L, metric: 'investable', icon: '🎓', achieved: false },
      { id: 'm3', name: 'Retirement Corpus (₹5 Cr)', target: 500 * L, metric: 'netWorth', icon: '🏝️', achieved: false },
      { id: 'm4', name: 'Home Loan Free', target: 0, accountId: 'homeloan', icon: '🏠', achieved: false },
    ],
    events: [
      { id: 'e1', name: "Child's higher education", age: 48, amount: -3000000, icon: '🎓', color: '#0ea5e9' },
      { id: 'e2', name: "Child's marriage", age: 55, amount: -2500000, icon: '💍', color: '#ec4899' },
      { id: 'e3', name: 'Retire', age: 60, amount: 0, icon: '🌴', color: '#22c55e' },
    ],
  },
  {
    id: 'pre-retiree',
    icon: '🌅',
    title: 'Pre-Retiree',
    desc: 'Retiring in 6 years — will the corpus last to 85?',
    profile: { name: 'Suresh Iyer', currentAge: 52, retirementAge: 58, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 1500000, growth: 0.045, color: '#22c55e' },
      { id: 'equity', name: 'Equity Mutual Funds', type: 'investment', kind: 'asset', balance: 4000000, growth: 0.11, color: '#6366f1' },
      { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 3500000, growth: 0.0815, color: '#8b5cf6' },
      { id: 'ppf', name: 'PPF', type: 'retirement', kind: 'asset', balance: 1800000, growth: 0.071, color: '#a855f7' },
      { id: 'home', name: 'Primary Home', type: 'real-estate', kind: 'asset', balance: 12000000, growth: 0.06, color: '#f59e0b' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 2200000, growth: 0.05, startAge: 52, endAge: 58, color: '#6366f1' },
      { id: 'pension', name: 'EPF Pension + Annuity', amount: 600000, growth: 0.04, startAge: 58, endAge: 85, color: '#0ea5e9' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 900000, growth: 0.06, startAge: 52, endAge: 85, color: '#ef4444' },
      { id: 'travel', name: 'Travel & Lifestyle', amount: 200000, growth: 0.06, startAge: 52, endAge: 75, color: '#f97316' },
      { id: 'health', name: 'Health Insurance (80D)', amount: 60000, growth: 0.10, startAge: 52, endAge: 85, section: '80D', color: '#f43f5e' },
    ],
    contributions: [
      { id: 'c1', accountId: 'equity', amount: 300000, section: null },
      { id: 'c2', accountId: 'ppf', amount: 150000, section: '80C' },
    ],
    milestones: [
      { id: 'm1', name: 'Retirement Corpus (₹5 Cr)', target: 500 * L, metric: 'netWorth', icon: '🏝️', achieved: false },
    ],
    events: [
      { id: 'e1', name: 'Retire', age: 58, amount: 0, icon: '🌴', color: '#22c55e' },
      { id: 'e2', name: 'World trip', age: 60, amount: -1500000, icon: '✈️', color: '#0ea5e9' },
      { id: 'e3', name: 'Downsize home', age: 70, amount: 4000000, icon: '📦', color: '#8b5cf6' },
    ],
  },
]
