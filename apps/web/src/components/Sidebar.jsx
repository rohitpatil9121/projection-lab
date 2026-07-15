import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { IconDashboard, IconPlan, IconAccounts, IconFlow, IconMilestone, IconSettings, IconDice, IconTax, IconHome } from './Icons.jsx'
import AppLogo from './AppLogo.jsx'
import ProModal from './ProModal.jsx'

const links = [
  { to: '/', label: 'Today', Icon: IconHome, end: true },
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/plan', label: 'Plan', Icon: IconPlan },
  { to: '/accounts', label: 'Accounts', Icon: IconAccounts },
  { to: '/cash-flow', label: 'Cash Flow', Icon: IconFlow },
  { to: '/tax', label: 'Tax', Icon: IconTax },
  { to: '/monte-carlo', label: 'Monte Carlo', Icon: IconDice },
  { to: '/milestones', label: 'Goals', Icon: IconMilestone },
  { to: '/settings', label: 'Settings', Icon: IconSettings },
]

export default function Sidebar() {
  const [proOpen, setProOpen] = useState(false)
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 px-4 py-5">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <AppLogo size={36} />
        <div>
          <div className="font-extrabold tracking-tight leading-none">Financial Blueprint</div>
          <div className="text-[11px] text-ink-400 font-medium">Financial planning</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white">
        <div className="text-sm font-bold">Upgrade to Pro</div>
        <div className="text-xs text-brand-100 mt-1 leading-snug">Unlimited scenarios, Monte Carlo & tax modeling.</div>
        <button
          type="button"
          onClick={() => setProOpen(true)}
          className="mt-3 w-full rounded-lg bg-white/15 hover:bg-white/25 py-1.5 text-xs font-semibold transition-colors"
        >
          Learn more
        </button>
      </div>

      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </aside>
  )
}
