import { useStore } from '../data/store.js'
import { emptyProfile } from '@projectlab/schema'
import { Card, SectionLabel, PageHero } from '../components/ui.jsx'
import { IconPlus, IconTrash, IconChevron, IconMoon, IconTrend, IconShield, IconAccounts, IconSettings } from '../components/Icons.jsx'
import { Link, useNavigate } from 'react-router-dom'

// iOS-style switch used by every preference row.
function Switch({ checked, onChange }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

// Shared settings row: icon tile + label (+ optional sub) + right-side control.
function Row({ icon, label, sub, right, onClick, as: As = 'div', ...rest }) {
  return (
    <As
      onClick={onClick}
      className={`flex items-center gap-3 py-3.5 w-full text-left ${onClick || rest.href || rest.to ? 'cursor-pointer' : ''}`}
      {...rest}
    >
      <div className="grid place-items-center h-10 w-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{label}</div>
        {sub && <div className="text-[11px] text-ink-400 font-medium mt-0.5">{sub}</div>}
      </div>
      <div className="shrink-0 flex items-center gap-2">{right}</div>
    </As>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile) || emptyProfile
  const setProfile = useStore((s) => s.setProfile)
  const reset = useStore((s) => s.reset)
  const resetAccountData = useStore((s) => s.resetAccountData)
  const deleteAccount = useStore((s) => s.deleteAccount)
  const auth = useStore((s) => s.auth)
  const logout = useStore((s) => s.logout)
  const ui = useStore((s) => s.ui)
  const toggleDark = useStore((s) => s.toggleDark)
  const setRealTerms = useStore((s) => s.setRealTerms)

  const signOut = async () => { await logout(); navigate('/login') }
  const startFresh = async () => {
    if (!confirm('Clear this account data and start onboarding again?')) return
    // resetAccountData re-throws when the sync fails. Unhandled, that left local data
    // already wiped, the navigation never run, and the button looking dead.
    try {
      await resetAccountData()
      navigate('/onboarding', { replace: true })
    } catch (err) {
      alert(`Could not clear your account data: ${err.message || 'please try again.'}`)
    }
  }
  const removeAccount = async () => {
    if (!confirm('Permanently delete your account, your plan and all your data?\n\nThis cannot be undone.')) return
    if (!confirm('Last chance — this permanently deletes everything. Continue?')) return
    try {
      await deleteAccount()
      navigate('/login', { replace: true })
    } catch (err) {
      alert(`Could not delete your account: ${err.message || 'please try again.'}`)
    }
  }
  const initials = (profile.name || '')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

  return (
    <div className="space-y-6">
      <PageHero tone="ink" icon={<IconSettings size={24} />} eyebrow="Settings"
        title="Your profile and preferences" subtitle="Who the plan is for, how the app looks, and what happens to your data" />

      {/* ---- User profile ---- */}
      <div>
        <SectionLabel>User Profile</SectionLabel>
        <Card className="!py-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="grid place-items-center h-12 w-12 rounded-full bg-brand-600 text-white font-bold">{initials}</div>
              {auth && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-ink-900" />}
            </div>
            <div className="min-w-0 flex-1">
              <input
                value={profile.name}
                placeholder="Your name"
                onChange={(e) => setProfile({ name: e.target.value })}
                className="w-full text-base font-bold bg-transparent outline-none focus:text-brand-600"
              />
              <div className={`text-[11px] font-medium mt-0.5 ${auth ? 'text-emerald-600' : 'text-ink-400'}`}>
                {auth ? 'Cloud sync enabled' : 'Local device only'}
              </div>
            </div>
          </div>
        </Card>
        {auth ? (
          <Card className="!py-3.5 mt-3">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 shrink-0">
                <IconAccounts size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{auth.user?.email ? 'Email Address' : 'Account'}</div>
                <div className="text-sm font-bold truncate">{auth.user?.email || auth.user?.phone || 'Signed in'}</div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="!py-3.5 mt-3 flex items-center justify-between gap-4">
            <div className="text-sm text-ink-500">Using local storage only. Sign in to back up and sync.</div>
            <Link to="/login" className="btn-primary shrink-0">Sign in</Link>
          </Card>
        )}
      </div>

      {/* ---- Preferences ---- */}
      <div>
        <SectionLabel>Preferences</SectionLabel>
        <Card className="!py-1">
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            <Row icon={<IconMoon size={18} />} label="Dark Mode"
              right={<Switch checked={!!ui.dark} onChange={toggleDark} />} />
            <Row icon={<IconTrend size={18} />} label="Real Terms" sub="Show projections in today's rupees"
              right={<Switch checked={!!ui.realTerms} onChange={() => setRealTerms(!ui.realTerms)} />} />
          </div>
        </Card>
      </div>

      {/* ---- Support & data ---- */}
      <div>
        <SectionLabel>Support</SectionLabel>
        <Card className="!py-1">
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            <Row as="a" href="/privacy-policy.html" target="_blank" rel="noreferrer"
              icon={<IconShield size={18} />} label="Privacy Policy"
              right={<IconChevron size={16} className="text-ink-300" />} />
            <Row icon={<IconTrash size={18} />} label="Reset all data" sub="Erase your plan and start over from setup"
              onClick={() => { if (confirm('Erase your whole plan and start setup again? This cannot be undone.')) reset() }}
              right={<span className="text-xs font-bold text-rose-500">Reset</span>} />
            {auth && (
              <Row icon={<IconPlus size={18} />} label="Start fresh for this account" sub="Clears this account's cloud plan and reopens onboarding"
                onClick={startFresh}
                right={<span className="text-xs font-bold text-amber-600">Clear</span>} />
            )}
            {auth && (
              <Row icon={<IconTrash size={18} />} label="Delete my account" sub="Permanently removes your account and all data from our servers"
                onClick={removeAccount}
                right={<span className="text-xs font-bold text-rose-600">Delete</span>} />
            )}
          </div>
        </Card>
      </div>

      {/* ---- Sign out ---- */}
      {auth && (
        <button
          onClick={signOut}
          className="btn w-full text-rose-600 dark:text-rose-400 ring-1 ring-rose-300 dark:ring-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/10"
        >
          Sign out
        </button>
      )}

      <p className="text-center text-[11px] text-ink-400 font-medium pb-4">
        Financial Blueprint v{__APP_VERSION__} · build {__BUILD_STAMP__}
      </p>

    </div>
  )
}
