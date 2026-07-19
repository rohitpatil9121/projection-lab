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
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 80000, growth: 0.04, color: '#469b88' },
      { id: 'equity', name: 'Equity Mutual Funds', type: 'investment', kind: 'asset', balance: 50000, growth: 0.12, color: '#377cc8' },
      { id: 'eduloan', name: 'Education Loan', type: 'loan', kind: 'liability', balance: 300000, growth: 0.10, payoff: 0.2, color: '#e0533d' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 420000, growth: 0.09, startAge: 24, endAge: 60, color: '#377cc8' },
    ],
    expenses: [
      { id: 'living', name: 'Rent & Living', amount: 240000, growth: 0.06, startAge: 24, endAge: 85, color: '#e0533d' },
      { id: 'emi', name: 'Education Loan EMI', amount: 66000, growth: 0, startAge: 24, endAge: 30, accountId: 'eduloan', color: '#eed868' },
    ],
    contributions: [
      { id: 'c1', accountId: 'equity', amount: 60000, section: null },
    ],
    milestones: [
      { id: 'm1', name: 'Emergency Fund (6 months)', kind: 'save', target: 120000, cashImpact: 0, accountId: 'savings', icon: '🛟', achieved: false },
      { id: 'm2', name: 'Education Loan Free', kind: 'save', target: 0, cashImpact: 0, accountId: 'eduloan', icon: '🎓', achieved: false },
      { id: 'm3', name: 'First ₹10 Lakh Net Worth', kind: 'save', target: 10 * L, cashImpact: 0, metric: 'netWorth', icon: '💎', achieved: false },
      { id: 'm4', name: 'Buy a bike', kind: 'spend', target: 150000, cashImpact: -150000, metric: 'investable', icon: '🏍️', achieved: false, targetAge: 26 },
      { id: 'm5', name: 'Retire', kind: 'marker', target: 0, cashImpact: 0, icon: '🌴', achieved: false, targetAge: 60 },
    ],
  },
  {
    id: 'early-married',
    icon: '💑',
    title: 'Early Career, Married',
    desc: 'Double income, saving for a house and a baby.',
    profile: { name: 'Rahul & Sneha', currentAge: 29, retirementAge: 58, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 250000, growth: 0.04, color: '#469b88' },
      { id: 'equity', name: 'Equity Mutual Funds', type: 'investment', kind: 'asset', balance: 400000, growth: 0.12, color: '#377cc8' },
      { id: 'epf', name: 'EPF (both)', type: 'retirement', kind: 'asset', balance: 300000, growth: 0.0815, color: '#9da7d0' },
      { id: 'carloan', name: 'Car Loan', type: 'loan', kind: 'liability', balance: 250000, growth: 0.095, payoff: 0.3, color: '#e0533d' },
    ],
    incomes: [
      { id: 'salary1', name: 'Salary — Rahul', amount: 1200000, growth: 0.08, startAge: 29, endAge: 58, color: '#377cc8' },
      { id: 'salary2', name: 'Salary — Sneha', amount: 600000, growth: 0.07, startAge: 29, endAge: 55, color: '#469b88' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 700000, growth: 0.06, startAge: 29, endAge: 85, color: '#e0533d' },
      { id: 'emi', name: 'Car Loan EMI', amount: 90000, growth: 0, startAge: 29, endAge: 33, accountId: 'carloan', color: '#eed868' },
    ],
    contributions: [
      { id: 'c1', accountId: 'equity', amount: 240000, section: null },
      { id: 'c2', accountId: 'epf', amount: 100000, section: '80C' },
    ],
    milestones: [
      // "House Down Payment" and "Buy a house" were the same plan written twice.
      { id: 'm1', name: 'Buy a house', kind: 'spend', target: 25 * L, cashImpact: -2500000, metric: 'investable', icon: '🏠', achieved: false, targetAge: 32 },
      { id: 'm2', name: 'First ₹1 Crore Net Worth', kind: 'save', target: 100 * L, cashImpact: 0, metric: 'netWorth', icon: '💎', achieved: false },
      { id: 'm3', name: 'Baby arrives', kind: 'spend', target: 200000, cashImpact: -200000, metric: 'investable', icon: '👶', achieved: false, targetAge: 31 },
      { id: 'm4', name: 'Retire', kind: 'marker', target: 0, cashImpact: 0, icon: '🌴', achieved: false, targetAge: 58 },
    ],
  },
  {
    id: 'mid-debt',
    icon: '🏦',
    title: 'Mid Career, High Debt',
    desc: 'Working to pay down home + personal loans.',
    profile: { name: 'Vikram Singh', currentAge: 36, retirementAge: 60, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 200000, growth: 0.04, color: '#469b88' },
      { id: 'equity', name: 'Equity Mutual Funds', type: 'investment', kind: 'asset', balance: 350000, growth: 0.12, color: '#377cc8' },
      { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 550000, growth: 0.0815, color: '#9da7d0' },
      { id: 'home', name: 'Primary Home', type: 'real-estate', kind: 'asset', balance: 7500000, growth: 0.06, color: '#eed868' },
      { id: 'homeloan', name: 'Home Loan', type: 'loan', kind: 'liability', balance: 5500000, growth: 0.087, payoff: 0.04, color: '#e0533d' },
      { id: 'ploan', name: 'Personal Loan', type: 'loan', kind: 'liability', balance: 400000, growth: 0.14, payoff: 0.3, color: '#e0533d' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 1600000, growth: 0.07, startAge: 36, endAge: 60, color: '#377cc8' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 650000, growth: 0.06, startAge: 36, endAge: 85, color: '#e0533d' },
      // ₹55L at 8.7% needs ~₹5.82L/yr to clear in 20 years; the old ₹5.5L barely beat
      // the interest and left the loan running forever once amortisation became real.
      { id: 'emi1', name: 'Home Loan EMI', amount: 582000, growth: 0, startAge: 36, endAge: 56, accountId: 'homeloan', color: '#eed868' },
      { id: 'emi2', name: 'Personal Loan EMI', amount: 140000, growth: 0, startAge: 36, endAge: 39, accountId: 'ploan', color: '#eed868' },
    ],
    contributions: [
      { id: 'c1', accountId: 'epf', amount: 120000, section: '80C' },
    ],
    milestones: [
      { id: 'm1', name: 'Personal Loan Free', kind: 'save', target: 0, cashImpact: 0, accountId: 'ploan', icon: '🔥', achieved: false },
      { id: 'm2', name: 'Home Loan Free', kind: 'save', target: 0, cashImpact: 0, accountId: 'homeloan', icon: '🏠', achieved: false },
      { id: 'm3', name: 'Emergency Fund (6 months)', kind: 'save', target: 400000, cashImpact: 0, accountId: 'savings', icon: '🛟', achieved: false },
      { id: 'm4', name: "Child's Higher Education", kind: 'spend', target: 2500000, cashImpact: -2500000, metric: 'investable', icon: '🎓', achieved: false, targetAge: 50 },
      { id: 'm5', name: 'Retire', kind: 'marker', target: 0, cashImpact: 0, icon: '🌴', achieved: false, targetAge: 60 },
    ],
  },
  {
    id: 'fire',
    icon: '🔥',
    title: 'FIRE Aspirant',
    desc: 'Aggressive SIPs, targeting retirement at 45.',
    profile: { name: 'Karan Mehta', currentAge: 30, retirementAge: 45, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 500000, growth: 0.04, color: '#469b88' },
      { id: 'equity', name: 'Equity MF + Stocks', type: 'investment', kind: 'asset', balance: 2500000, growth: 0.12, color: '#377cc8' },
      { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 600000, growth: 0.0815, color: '#9da7d0' },
      { id: 'ppf', name: 'PPF', type: 'retirement', kind: 'asset', balance: 350000, growth: 0.071, color: '#9da7d0' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 2400000, growth: 0.08, startAge: 30, endAge: 45, color: '#377cc8' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 600000, growth: 0.06, startAge: 30, endAge: 85, color: '#e0533d' },
    ],
    contributions: [
      { id: 'c1', accountId: 'equity', amount: 900000, section: null },
      { id: 'c2', accountId: 'ppf', amount: 150000, section: '80C' },
    ],
    milestones: [
      { id: 'm1', name: 'First ₹1 Crore', kind: 'save', target: 100 * L, cashImpact: 0, metric: 'netWorth', icon: '💎', achieved: false },
      { id: 'm2', name: 'FI Corpus (₹3.5 Cr)', kind: 'save', target: 350 * L, cashImpact: 0, metric: 'netWorth', icon: '🏝️', achieved: false, targetAge: 45 },
      { id: 'm3', name: 'Retire early (FIRE)', kind: 'marker', target: 0, cashImpact: 0, icon: '🔥', achieved: false, targetAge: 45 },
      { id: 'm4', name: 'World travel year', kind: 'spend', target: 1000000, cashImpact: -1000000, metric: 'investable', icon: '✈️', achieved: false, targetAge: 46 },
    ],
  },
  {
    id: 'mid-family',
    icon: '👨‍👩‍👧',
    title: 'Mid Career, Family',
    desc: "Kids' education, home loan, on track to retire at 60.",
    profile: { name: 'Aarav Sharma', currentAge: 40, retirementAge: 60, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 500000, growth: 0.04, color: '#469b88' },
      { id: 'equity', name: 'Equity Mutual Funds (SIP)', type: 'investment', kind: 'asset', balance: 1500000, growth: 0.12, color: '#377cc8' },
      { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 1200000, growth: 0.0815, color: '#9da7d0' },
      { id: 'ppf', name: 'PPF', type: 'retirement', kind: 'asset', balance: 700000, growth: 0.071, color: '#9da7d0' },
      { id: 'nps', name: 'NPS', type: 'retirement', kind: 'asset', balance: 400000, growth: 0.10, color: '#9da7d0' },
      { id: 'home', name: 'Primary Home', type: 'real-estate', kind: 'asset', balance: 9000000, growth: 0.06, color: '#eed868' },
      { id: 'homeloan', name: 'Home Loan', type: 'loan', kind: 'liability', balance: 3500000, growth: 0.087, payoff: 0.06, color: '#e0533d' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 2000000, growth: 0.07, startAge: 40, endAge: 60, color: '#377cc8' },
      { id: 'rental', name: 'Rental Income', amount: 240000, growth: 0.05, startAge: 40, endAge: 85, color: '#469b88' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 800000, growth: 0.06, startAge: 40, endAge: 85, color: '#e0533d' },
      { id: 'emi', name: 'Home Loan EMI', amount: 540000, growth: 0, startAge: 40, endAge: 55, accountId: 'homeloan', color: '#eed868' },
      { id: 'education', name: "Children's Education", amount: 250000, growth: 0.08, startAge: 40, endAge: 58, color: '#e78c9d' },
    ],
    contributions: [
      { id: 'c1', accountId: 'epf', amount: 180000, section: '80C' },
      { id: 'c2', accountId: 'ppf', amount: 150000, section: '80C' },
      { id: 'c3', accountId: 'equity', amount: 360000, section: null },
      { id: 'c4', accountId: 'nps', amount: 50000, section: '80CCD1B' },
    ],
    milestones: [
      { id: 'm1', name: 'Emergency Fund (6 months)', kind: 'save', target: 500000, cashImpact: 0, accountId: 'savings', icon: '🛟', achieved: true },
      // "Child's Education Corpus" and "Child's higher education" were the same plan
      // written twice, at two different amounts. One goal: save it, then spend it.
      { id: 'm2', name: "Child's Higher Education", kind: 'spend', target: 50 * L, cashImpact: -5000000, metric: 'investable', icon: '🎓', achieved: false, targetAge: 48 },
      { id: 'm3', name: 'Retirement Corpus (₹5 Cr)', kind: 'save', target: 500 * L, cashImpact: 0, metric: 'netWorth', icon: '🏝️', achieved: false, targetAge: 60 },
      { id: 'm4', name: 'Home Loan Free', kind: 'save', target: 0, cashImpact: 0, accountId: 'homeloan', icon: '🏠', achieved: false },
      { id: 'm5', name: "Child's Marriage", kind: 'spend', target: 2500000, cashImpact: -2500000, metric: 'investable', icon: '💍', achieved: false, targetAge: 55 },
      { id: 'm6', name: 'Retire', kind: 'marker', target: 0, cashImpact: 0, icon: '🌴', achieved: false, targetAge: 60 },
    ],
  },
  {
    id: 'pre-retiree',
    icon: '🌅',
    title: 'Pre-Retiree',
    desc: 'Retiring in 6 years — will the corpus last to 85?',
    profile: { name: 'Suresh Iyer', currentAge: 52, retirementAge: 58, lifeExpectancy: 85 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 1500000, growth: 0.045, color: '#469b88' },
      { id: 'equity', name: 'Equity Mutual Funds', type: 'investment', kind: 'asset', balance: 4000000, growth: 0.11, color: '#377cc8' },
      { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 3500000, growth: 0.0815, color: '#9da7d0' },
      { id: 'ppf', name: 'PPF', type: 'retirement', kind: 'asset', balance: 1800000, growth: 0.071, color: '#9da7d0' },
      { id: 'home', name: 'Primary Home', type: 'real-estate', kind: 'asset', balance: 12000000, growth: 0.06, color: '#eed868' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 2200000, growth: 0.05, startAge: 52, endAge: 58, color: '#377cc8' },
      { id: 'pension', name: 'EPF Pension + Annuity', amount: 600000, growth: 0.04, startAge: 58, endAge: 85, color: '#9da7d0' },
    ],
    expenses: [
      { id: 'living', name: 'Household & Living', amount: 900000, growth: 0.06, startAge: 52, endAge: 85, color: '#e0533d' },
      { id: 'travel', name: 'Travel & Lifestyle', amount: 200000, growth: 0.06, startAge: 52, endAge: 75, color: '#eed868' },
    ],
    contributions: [
      { id: 'c1', accountId: 'equity', amount: 300000, section: null },
      { id: 'c2', accountId: 'ppf', amount: 150000, section: '80C' },
    ],
    milestones: [
      { id: 'm1', name: 'Retirement Corpus (₹5 Cr)', kind: 'save', target: 500 * L, cashImpact: 0, metric: 'netWorth', icon: '🏝️', achieved: false, targetAge: 58 },
      { id: 'm2', name: 'Retire', kind: 'marker', target: 0, cashImpact: 0, icon: '🌴', achieved: false, targetAge: 58 },
      { id: 'm3', name: 'World trip', kind: 'spend', target: 1500000, cashImpact: -1500000, metric: 'investable', icon: '✈️', achieved: false, targetAge: 60 },
      // Money arriving, not a target to save toward.
      { id: 'm4', name: 'Downsize home', kind: 'marker', target: 0, cashImpact: 4000000, icon: '📦', achieved: false, targetAge: 70 },
    ],
  },
  {
    id: 'hni',
    icon: '💼',
    title: 'HNI, Wealth Preservation',
    desc: 'Business + salary, PMS and property, legacy planning.',
    profile: { name: 'Vikram Malhotra', currentAge: 45, retirementAge: 58, lifeExpectancy: 88 },
    accounts: [
      { id: 'savings', name: 'Savings + FD', type: 'cash', kind: 'asset', balance: 80 * L, growth: 0.06, color: '#469b88' },
      { id: 'equity', name: 'Equity MF + Direct', type: 'investment', kind: 'asset', balance: 350 * L, growth: 0.11, color: '#377cc8' },
      { id: 'pms', name: 'PMS / AIF', type: 'investment', kind: 'asset', balance: 200 * L, growth: 0.11, color: '#cdb475' },
      { id: 'epf', name: 'EPF', type: 'retirement', kind: 'asset', balance: 80 * L, growth: 0.0815, color: '#9da7d0' },
      { id: 'ppf', name: 'PPF', type: 'retirement', kind: 'asset', balance: 45 * L, growth: 0.071, color: '#9da7d0' },
      { id: 'nps', name: 'NPS', type: 'retirement', kind: 'asset', balance: 60 * L, growth: 0.10, color: '#9da7d0' },
      { id: 'property', name: 'Real Estate (2 properties)', type: 'real-estate', kind: 'asset', balance: 700 * L, growth: 0.05, color: '#eed868' },
      { id: 'homeloan', name: 'Home Loan', type: 'loan', kind: 'liability', balance: 150 * L, growth: 0.085, payoff: 0.08, color: '#e0533d' },
    ],
    incomes: [
      { id: 'salary', name: 'Salary (take-home)', amount: 90 * L, growth: 0.07, startAge: 45, endAge: 58, color: '#377cc8' },
      { id: 'business', name: 'Business / Consulting', amount: 45 * L, growth: 0.06, startAge: 45, endAge: 65, color: '#469b88' },
      { id: 'rental', name: 'Rental Income', amount: 30 * L, growth: 0.05, startAge: 45, endAge: 88, color: '#9da7d0' },
    ],
    expenses: [
      // An HNI's lifestyle is the thing that actually tests the corpus — without it
      // the plan just compounds to an absurd number and the demo proves nothing.
      { id: 'living', name: 'Household & Lifestyle', amount: 96 * L, growth: 0.06, startAge: 45, endAge: 88, color: '#e0533d' },
      { id: 'emi', name: 'Home Loan EMI', amount: 24 * L, growth: 0, startAge: 45, endAge: 55, accountId: 'homeloan', color: '#eed868' },
      { id: 'education', name: "Children's Schooling", amount: 15 * L, growth: 0.08, startAge: 45, endAge: 55, color: '#e78c9d' },
    ],
    contributions: [
      { id: 'c1', accountId: 'equity', amount: 12 * L, section: null },
      { id: 'c2', accountId: 'pms', amount: 6 * L, section: null },
      { id: 'c3', accountId: 'epf', amount: 3 * L, section: '80C' },
      { id: 'c4', accountId: 'ppf', amount: 150000, section: '80C' },
      { id: 'c5', accountId: 'nps', amount: 50000, section: '80CCD1B' },
    ],
    milestones: [
      { id: 'm1', name: 'Emergency Fund (12 months)', kind: 'save', target: 60 * L, cashImpact: 0, accountId: 'savings', icon: '🛟', achieved: true },
      { id: 'm2', name: "Children's Education (abroad)", kind: 'spend', target: 300 * L, cashImpact: -300 * L, metric: 'investable', icon: '🎓', achieved: false, targetAge: 50 },
      { id: 'm3', name: 'Second Home / Villa', kind: 'spend', target: 500 * L, cashImpact: -500 * L, metric: 'investable', icon: '🏠', achieved: false, targetAge: 52 },
      { id: 'm4', name: 'Home Loan Free', kind: 'save', target: 0, cashImpact: 0, accountId: 'homeloan', icon: '🔥', achieved: false },
      { id: 'm5', name: 'Wealth Corpus (₹50 Cr)', kind: 'save', target: 5000 * L, cashImpact: 0, metric: 'netWorth', icon: '💎', achieved: false, targetAge: 58 },
      { id: 'm6', name: 'Retire', kind: 'marker', target: 0, cashImpact: 0, icon: '🌴', achieved: false, targetAge: 58 },
      { id: 'm7', name: 'Legacy / Trust Corpus', kind: 'save', target: 2500 * L, cashImpact: 0, metric: 'investable', icon: '🎁', achieved: false, targetAge: 70 },
    ],
  },
]
