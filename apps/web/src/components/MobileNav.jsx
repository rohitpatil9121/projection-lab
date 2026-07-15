import { NavLink } from 'react-router-dom'
import { IconAccounts, IconMilestone, IconSettings, IconPlan, IconHome } from './Icons.jsx'

const links = [
  { to: '/', label: 'Today', Icon: IconHome, end: true },
  { to: '/plan', label: 'Plan', Icon: IconPlan },
  { to: '/accounts', label: 'Accounts', Icon: IconAccounts },
  { to: '/milestones', label: 'Goals', Icon: IconMilestone },
  { to: '/settings', label: 'Settings', Icon: IconSettings },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex justify-around border-t border-ink-100 dark:border-ink-800 bg-white/95 dark:bg-ink-900/95 backdrop-blur px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
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
