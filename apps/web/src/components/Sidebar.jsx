import { NavLink } from 'react-router-dom'
import { IconPlan, IconAccounts, IconFlow, IconMilestone, IconSettings, IconDice, IconHome } from './Icons.jsx'
import AppLogo from './AppLogo.jsx'

const links = [
  { to: '/', label: 'Today', Icon: IconHome, end: true },
  { to: '/plan', label: 'Plan', Icon: IconPlan },
  { to: '/accounts', label: 'Accounts', Icon: IconAccounts },
  { to: '/cash-flow', label: 'Cash Flow', Icon: IconFlow },
  { to: '/monte-carlo', label: 'Monte Carlo', Icon: IconDice },
  { to: '/milestones', label: 'Goals', Icon: IconMilestone },
  { to: '/settings', label: 'Settings', Icon: IconSettings },
]

export default function Sidebar() {
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

    </aside>
  )
}
