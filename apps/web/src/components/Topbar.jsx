import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../data/store.js'
import { IconSun, IconMoon } from './Icons.jsx'

const titles = {
  '/': 'Today',
  '/dashboard': 'Dashboard',
  '/plan': 'Plan & Timeline',
  '/accounts': 'Accounts',
  '/cash-flow': 'Cash Flow',
  '/monte-carlo': 'Monte Carlo Simulation',
  '/milestones': 'Milestones',
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

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-ink-100 dark:border-ink-800 bg-ink-50/80 dark:bg-ink-950/80 backdrop-blur px-5 md:px-8 py-4">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-extrabold tracking-tight">{titles[pathname] || 'ProjectLab'}</h1>
        <div className="flex items-center gap-1 text-xs text-ink-400 font-medium">
          <select
            value={activeScenarioId}
            onChange={(e) => switchScenario(e.target.value)}
            className="bg-transparent font-semibold text-ink-500 dark:text-ink-300 outline-none cursor-pointer max-w-[140px] truncate"
            title="Switch scenario"
          >
            {scenarios.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
          <button
            onClick={() => { const name = prompt('New scenario name (copies current plan):'); if (name?.trim()) addScenario(name.trim()) }}
            className="px-1 text-brand-600 hover:text-brand-700 font-bold" title="New scenario (copy of current)"
          >+</button>
          {scenarios.length > 1 && (
            <button
              onClick={() => { const sc = scenarios.find((x) => x.id === activeScenarioId); if (confirm(`Delete scenario "${sc?.name}"?`)) deleteScenario(activeScenarioId) }}
              className="px-1 text-ink-400 hover:text-rose-500" title="Delete this scenario"
            >×</button>
          )}
          <span className="hidden sm:inline truncate">· {auth?.user?.email || profile.name}</span>
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

        {!auth && (
          <Link to="/login" className="btn-ghost text-xs sm:text-sm">Sign in</Link>
        )}

        <button onClick={toggleDark} className="btn-ghost !px-2.5" title="Toggle theme">
          {dark ? <IconSun size={19} /> : <IconMoon size={19} />}
        </button>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 px-2.5 py-1.5">
          <div className="grid place-items-center h-7 w-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
            {profile.name.split(' ').map((w) => w[0]).join('')}
          </div>
          <span className="text-sm font-semibold pr-1">{profile.name}</span>
        </div>
      </div>
    </header>
  )
}
