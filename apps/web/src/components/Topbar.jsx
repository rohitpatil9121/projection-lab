import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../data/store.js'
import { Modal } from './ui.jsx'
import AppLogo from './AppLogo.jsx'
import { NAV_LINKS } from './navLinks.js'
import { IconSun, IconMoon, IconChevron } from './Icons.jsx'
import { registerBackHandler } from '../hooks/backButton.js'

const titles = {
  '/plan': 'Financial Plan',
  '/accounts': 'Accounts',
  '/cash-flow': 'Cash Flow',
  '/monte-carlo': 'Monte Carlo',
  '/milestones': 'Goals',
  '/settings': 'Settings',
  '/enough': 'FIRE number',
  '/enough/plan': 'Your plan',
  '/enough/what-if': 'What if',
}

const syncLabels = {
  idle: null,
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline',
  error: 'Sync error',
  conflict: 'Conflict',
  // A what-if scenario is deliberately never uploaded — say so, so its absence
  // from the cloud doesn't look like a sync failure.
  local: 'What-if · not synced',
}

/* A floating glass bar, detached from the top edge. On desktop the page links sit in
   the middle of it as an island; on a phone the bar carries the page title and the
   dock at the bottom carries the links. */
export default function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile)
  const dark = useStore((s) => s.ui.dark)
  const toggleDark = useStore((s) => s.toggleDark)
  const auth = useStore((s) => s.auth)
  const syncStatus = useStore((s) => s.syncStatus)
  const syncError = useStore((s) => s.syncError)
  const resolveConflict = useStore((s) => s.resolveConflict)
  const scenarios = useStore((s) => s.scenarios) || []
  const activeScenarioId = useStore((s) => s.activeScenarioId)
  const switchScenario = useStore((s) => s.switchScenario)
  const addScenario = useStore((s) => s.addScenario)
  const deleteScenario = useStore((s) => s.deleteScenario)
  const logout = useStore((s) => s.logout)

  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [delOpen, setDelOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined
    return registerBackHandler(() => {
      setMenuOpen(false)
      return true
    })
  }, [menuOpen])

  const createScenario = () => {
    if (!newName.trim()) return
    addScenario(newName.trim())
    setNewName('')
    setNewOpen(false)
    navigate('/onboarding', { state: { newScenario: true } })
  }

  const confirmDelete = () => {
    deleteScenario(activeScenarioId)
    setDelOpen(false)
  }

  const signOut = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login')
  }

  const activeName = scenarios.find((x) => x.id === activeScenarioId)?.name
  const initials = (profile.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-30 px-4 pt-3 md:px-6 md:pt-4">
      <div className="glass mx-auto flex max-w-6xl items-center gap-3 rounded-[1.6rem] px-3 py-2 md:rounded-full md:px-3">
        {/* Left: brand on desktop, page title on a phone. */}
        <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
          <AppLogo size={38} className="!rounded-full shadow-card" />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold tracking-tight leading-tight md:hidden">
              {titles[pathname] || 'Financial Blueprint'}
            </div>
            <div className="hidden md:block text-[15px] font-extrabold tracking-tight leading-tight">Financial Blueprint</div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-ink-400 leading-tight">
              <select
                value={activeScenarioId}
                onChange={(e) => switchScenario(e.target.value)}
                className="bg-transparent font-semibold text-ink-500 dark:text-ink-300 outline-none cursor-pointer max-w-[130px] truncate rounded"
                title="Switch scenario"
              >
                {scenarios.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
              <button
                onClick={() => { setNewName(''); setNewOpen(true) }}
                className="px-1 text-brand-600 hover:text-brand-700 font-bold rounded" title="New scenario (fresh setup)"
              >+</button>
              {scenarios.length > 1 && (
                <button
                  onClick={() => setDelOpen(true)}
                  className="px-1 text-ink-400 hover:text-rose-500 rounded" title="Delete this scenario"
                >×</button>
              )}
            </div>
          </div>
        </div>

        {/* Centre: the island. */}
        <nav aria-label="Primary" className="hidden md:flex flex-1 justify-center">
          <div className="inline-flex items-center gap-0.5 rounded-full bg-ink-900/[0.04] dark:bg-white/[0.05] p-1">
            {NAV_LINKS.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Right: status, theme, account. */}
        <div className="flex shrink-0 items-center gap-1.5">
          {syncStatus === 'conflict' ? (
            <div className="hidden sm:flex items-center gap-1 text-xs">
              <button onClick={() => resolveConflict(true)} className="chip bg-brand-100 text-brand-700">Keep mine</button>
              <button onClick={() => resolveConflict(false)} className="chip bg-ink-100 text-ink-600">Reload</button>
            </div>
          ) : syncLabels[syncStatus] && (
            <span className={`hidden sm:inline chip text-xs ${
              syncStatus === 'synced' ? 'bg-emerald-100 text-emerald-700' :
              syncStatus === 'offline' ? 'bg-amber-100 text-amber-700' :
              syncStatus === 'error' ? 'bg-rose-100 text-rose-700' :
              'bg-ink-100 text-ink-500'
            }`} title={syncError || ''}>
              {syncLabels[syncStatus]}
            </span>
          )}

          {!auth?.user && (
            <Link to="/login" className="hidden sm:inline-flex btn-ghost !min-h-[40px] !px-3 whitespace-nowrap text-sm">Sign in</Link>
          )}

          <button onClick={toggleDark} className="btn-ghost !min-h-[40px] !px-2.5" title="Toggle theme" aria-label="Toggle theme">
            {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>

          {/* Avatar + dropdown menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full bg-white/70 dark:bg-white/[0.06] pl-1 pr-1.5 py-1 shadow-card transition-transform duration-300 ease-silk hover:-translate-y-px"
              aria-haspopup="true" aria-expanded={menuOpen}
            >
              <div className="grid place-items-center h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold">{initials}</div>
              <span className="hidden lg:inline text-sm font-semibold max-w-[120px] truncate">{profile.name || 'Guest'}</span>
              <IconChevron size={14} className={`text-ink-400 transition-transform duration-300 ease-silk ${menuOpen ? 'rotate-90' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-3xl glass p-1.5 animate-scale-in origin-top-right">
                <div className="px-3 py-2.5 mb-1">
                  <div className="text-sm font-bold truncate">{profile.name || 'Guest'}</div>
                  <div className="text-xs text-ink-400 truncate">{auth?.user?.email || auth?.user?.phone || 'Not signed in'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); navigate('/settings') }}
                  className="w-full text-left rounded-2xl px-3 py-2.5 text-sm font-medium hover:bg-ink-900/[0.05] dark:hover:bg-white/[0.06] transition-colors"
                >Settings</button>
                {auth ? (
                  <button onClick={signOut} className="w-full text-left rounded-2xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors">Sign out</button>
                ) : (
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-2xl px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors">Sign in</Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New scenario modal */}
      <Modal open={newOpen} onClose={() => { setNewOpen(false); setNewName('') }} title="New scenario">
        <p className="text-sm text-ink-400 mb-3">Start a fresh plan from scratch — you'll fill in your details in the setup wizard.</p>
        <input
          autoFocus value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') createScenario() }}
          placeholder="e.g. Retire at 50"
          className="input"
        />
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={() => setNewOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={createScenario} className="btn-primary" disabled={!newName.trim()}>Create</button>
        </div>
      </Modal>

      {/* Delete scenario confirm */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete scenario?">
        <p className="text-sm text-ink-500 dark:text-ink-300">
          "<span className="font-semibold">{activeName}</span>" and its data will be removed. This can't be undone.
        </p>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={() => setDelOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={confirmDelete} className="btn bg-rose-600 text-white hover:bg-rose-700">Delete</button>
        </div>
      </Modal>
    </header>
  )
}
