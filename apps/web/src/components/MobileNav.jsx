import { NavLink } from 'react-router-dom'
import { NAV_LINKS } from './navLinks.js'

// A floating glass dock, detached from the screen edge, rather than a bar glued to it.
export default function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-4 z-30 mx-auto max-w-sm glass rounded-full p-1.5 flex items-stretch"
      style={{ bottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
    >
      {NAV_LINKS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `dock-link ${isActive ? 'active' : ''}`}>
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
