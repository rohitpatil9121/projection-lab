import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../data/store.js'
import { Modal } from './ui.jsx'
import { IconSun, IconMoon, IconChevron } from './Icons.jsx'
import { registerBackHandler } from '../hooks/backButton.js'

const titles = {
  '/': 'Today',
  '/dashboard': 'Dashboard',
  '/plan': 'Financial Plan',
  '/accounts': 'Accounts',
  '/cash-flow': 'Cash Flow',
  '/monte-carlo': 'Monte Carlo Simulation',
  '/milestones': 'Goals',
  '/settings': 'Settings',
}

const syncLabels = {
  idle: null,
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline',
  error: 'Sync error',
  conflict: 'Conflict',
}

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
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-950 supports-[backdrop-filter]:bg-ink-50/80 supports-[backdrop-filter]:dark:bg-ink-950/80 supports-[backdrop-filter]:backdrop-blur px-5 md:px-8 py-4">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-extrabold tracking-tight">{titles[pathname] || 'Financial Blueprint'}</h1>
        <div className="flex items-center gap-1 text-xs text-ink-400 font-medium">
          <select
            value={activeScenarioId}
            onChange={(e) => switchScenario(e.target.value)}
            className="bg-transparent font-semibold text-ink-500 dark:text-ink-300 outline-none cursor-pointer max-w-[140px] truncate rounded"
            title="Switch scenario"
          >
            {scenarios.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
          <button
            onClick={() => { setNewName(''); setNewOpen(true) }}
            className="px-1.5 text-brand-600 hover:text-brand-700 font-bold rounded" title="New scenario (fresh setup)"
          >+</button>
          {scenarios.length > 1 && (
            <button
              onClick={() => setDelOpen(true)}
              className="px-1.5 text-ink-400 hover:text-rose-500 rounded" title="Delete this scenario"
            >×</button>
          )}
          <span className="hidden sm:inline truncate">· {auth?.user?.email || auth?.user?.phone || profile.name}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
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
          <Link to="/login" className="btn-ghost text-xs sm:text-sm">Sign in</Link>
        )}

        <button onClick={toggleDark} className="btn-ghost !px-2.5" title="Toggle theme" aria-label="Toggle theme">
          {dark ? <IconSun size={19} /> : <IconMoon size={19} />}
        </button>

        {/* Avatar + dropdown menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 pl-1.5 pr-2 py-1.5 hover:border-ink-200 dark:hover:border-ink-700 transition-colors"
            aria-haspopup="true" aria-expanded={menuOpen}
          >
            <div className="grid place-items-center h-7 w-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold">{initials}</div>
            <span className="hidden sm:inline text-sm font-semibold max-w-[120px] truncate">{profile.name || 'Guest'}</span>
            <IconChevron size={14} className={`text-ink-400 transition-transform ${menuOpen ? 'rotate-90' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-lift p-1.5 animate-scale-in origin-top-right">
              <div className="px-3 py-2 border-b border-ink-100 dark:border-ink-800 mb-1">
                <div className="text-sm font-bold truncate">{profile.name || 'Guest'}</div>
                <div className="text-xs text-ink-400 truncate">{auth?.user?.email || auth?.user?.phone || 'Not signed in'}</div>
              </div>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); navigate('/settings') }}
                className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              >⚙️ Settings</button>
              {auth ? (
                <button onClick={signOut} className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors">↩ Sign out</button>
              ) : (
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors">→ Sign in</Link>
              )}
            </div>
          )}
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
