import { NavLink } from 'react-router-dom'
import { IconDashboard, IconAccounts, IconFlow, IconMilestone } from './Icons.jsx'

const links = [
  { to: '/', label: 'Today', Icon: IconAccounts, end: true },
  { to: '/dashboard', label: 'Charts', Icon: IconDashboard },
  { to: '/accounts', label: 'Accounts', Icon: IconAccounts },
  { to: '/cash-flow', label: 'Flow', Icon: IconFlow },
  { to: '/milestones', label: 'Goals', Icon: IconMilestone },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex justify-around border-t border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 px-2 py-1.5">
      {links.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold ${
              isActive ? 'text-brand-600' : 'text-ink-400'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
