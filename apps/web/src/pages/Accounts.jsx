import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import { useStore } from '../data/store.js'
import { useProjection } from '../data/useProjection.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionLabel, Fab } from '../components/ui.jsx'
import { IconPlus, IconTrash } from '../components/Icons.jsx'
import CasImport from '../components/CasImport.jsx'
import { toPct, fromPct } from '../utils/rates.js'

const TYPE_LABELS = {
  cash: 'Cash', investment: 'Equity', retirement: 'Retirement',
  'real-estate': 'Property', other: 'Other', loan: 'Loan',
}

// Lightweight SVG donut ring — segments + centered value (no recharts, no animation race).
function DonutRing({ segments, value, label, size = 168, thickness = 13, big = false }) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  let offset = 0
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} stroke="currentColor" className="text-ink-100 dark:text-ink-800" />
        {segments.map((s, i) => {
          const len = (Math.max(0, s.value) / total) * c
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness}
              stroke={s.color} strokeDasharray={`${Math.max(0, len - 1.5)} ${c - Math.max(0, len - 1.5)}`} strokeDashoffset={-offset} />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{label}</div>
          <div className={`${big ? 'text-3xl' : 'text-2xl'} font-extrabold tracking-tight money mt-0.5`}>{value}</div>
        </div>
      </div>
    </div>
  )
}

// Inline-editable bank-style account row: name, balance, growth and SIP all editable; delete on hover.
function EditRow({ a, contrib, updateItem, removeItem, onContribChange, onContribRemove, onContribAdd }) {
  const isLiab = a.kind === 'liability'
  return (
    <div className="group flex items-center gap-3 py-3">
      <div className="grid place-items-center h-10 w-10 rounded-xl shrink-0" style={{ background: `${a.color}1f` }}>
        <span className="h-3 w-3 rounded-full" style={{ background: a.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <input
          value={a.name}
          onChange={(e) => updateItem('accounts', a.id, { name: e.target.value })}
          className="w-full text-sm font-bold bg-transparent outline-none focus:text-brand-600"
        />
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`chip !px-2 !py-0.5 text-[10px] ${isLiab
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
            : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300'}`}>
            {TYPE_LABELS[a.type] || a.type}
          </span>
          <label className="inline-flex items-center gap-1 text-[10px] text-ink-400">
            {isLiab ? 'interest' : 'return'}
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={toPct(a.growth)}
              onChange={(e) => updateItem('accounts', a.id, { growth: fromPct(e.target.value) })}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-12 bg-ink-100 dark:bg-ink-800 rounded px-1 py-0.5 outline-none font-semibold text-ink-600 dark:text-ink-200"
            />
            %
          </label>
          {contrib ? (
            <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 text-[10px] inline-flex items-center gap-0.5">
              ↑ ₹
              <input
                type="number"
                value={Math.round(contrib.amount / 12)}
                onChange={(e) => onContribChange(contrib.id, Number(e.target.value))}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-14 bg-transparent outline-none font-semibold text-right [appearance:textfield]"
              />
              /mo
              <button onClick={() => onContribRemove(contrib.id)} title="Remove SIP" className="ml-0.5 leading-none text-emerald-500 hover:text-rose-500">×</button>
            </span>
          ) : a.kind === 'asset' ? (
            <button onClick={() => onContribAdd(a.id)} className="chip !py-0.5 border border-dashed border-emerald-300 text-emerald-600 text-[10px] hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
              + SIP
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center shrink-0">
        <span className={`text-xs ${isLiab ? 'text-rose-500' : 'text-ink-400'}`}>₹</span>
        <input
          type="number"
          value={a.balance}
          onChange={(e) => updateItem('accounts', a.id, { balance: Number(e.target.value) })}
          onWheel={(e) => e.currentTarget.blur()}
          className={`money w-[92px] text-right bg-transparent text-sm font-bold outline-none focus:text-brand-600 ${isLiab ? 'text-rose-600 dark:text-rose-400' : ''}`}
        />
      </div>
      <button onClick={() => removeItem('accounts', a.id)} className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-ink-400 hover:text-rose-500 transition shrink-0">
        <IconTrash size={14} />
      </button>
    </div>
  )
}

export default function Accounts() {
  const { projection, state } = useProjection()
  const profile = useStore((s) => s.profile)
  const accounts = useStore((s) => s.accounts)
  const contributions = useStore((s) => s.contributions)
  const updateItem = useStore((s) => s.updateItem)
  const addItem = useStore((s) => s.addItem)
  const removeItem = useStore((s) => s.removeItem)
  const [addingKind, setAddingKind] = useState(null) // 'asset' | 'liability' | null
  const [showCas, setShowCas] = useState(false)
  const [draft, setDraft] = useState({ name: '', balance: 100000, growthPct: 8, color: '#377cc8' })
  const accountsRef = useRef(null)

  const FUND_COLORS = ['#377cc8', '#9da7d0', '#469b88', '#9da7d0', '#e78c9d', '#eed868', '#469b88', '#06b6d4']
  const importCasFunds = (funds) => {
    funds.forEach((f, i) => {
      // Update balance if a fund with the same name already exists, else add it.
      const existing = accounts.find((a) => a.name.toLowerCase() === f.name.toLowerCase())
      if (existing) updateItem('accounts', existing.id, { balance: Math.round(f.value) })
      else addItem('accounts', { name: f.name, balance: Math.round(f.value), growth: 0.12, color: FUND_COLORS[i % FUND_COLORS.length], kind: 'asset', type: 'investment' })
    })
  }

  const assets = accounts.filter((a) => a.kind === 'asset')
  const liabilities = accounts.filter((a) => a.kind === 'liability')
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
  const totalLiab = liabilities.reduce((s, a) => s + a.balance, 0)
  const netWorth = totalAssets - totalLiab

  // Stat cells — real figures only.
  const cashTotal = assets.filter((a) => a.type === 'cash').reduce((s, a) => s + a.balance, 0)
  const avgGrowthWtd = totalAssets > 0
    ? assets.reduce((s, a) => s + a.balance * (a.growth || 0), 0) / totalAssets
    : 0

  // First contribution routed to each account (editable inline as the SIP chip).
  const contribByAccount = {}
  contributions.forEach((c) => { if (!contribByAccount[c.accountId]) contribByAccount[c.accountId] = c })
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const sips = contributions.filter((c) => accountById[c.accountId])

  const onContribChange = (id, monthly) => updateItem('contributions', id, { amount: Math.max(0, Math.round(monthly) * 12) })
  const onContribRemove = (id) => removeItem('contributions', id)
  const onContribAdd = (accountId) => addItem('contributions', { accountId, amount: 120000, section: null })

  // Allocation buckets by account type.
  const bucket = (pred) => assets.filter(pred).reduce((s, a) => s + a.balance, 0)
  const allocation = [
    { label: 'Equity', color: '#377cc8', value: bucket((a) => a.type === 'investment') },
    { label: 'Retirement', color: '#9da7d0', value: bucket((a) => a.type === 'retirement') },
    { label: 'Cash & FD', color: '#469b88', value: bucket((a) => a.type === 'cash') },
    { label: 'Property & Other', color: '#eed868', value: bucket((a) => a.type === 'real-estate' || a.type === 'other') },
  ].filter((b) => b.value > 0)

  // Next 5 years of projected net worth (current year + 5).
  const fiveYear = projection.slice(0, 6)

  const initials = (profile.name || '')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '₹'

  const startAdd = (kind) => {
    setAddingKind(kind)
    setDraft({ name: '', balance: kind === 'liability' ? 200000 : 100000, growthPct: kind === 'liability' ? 9 : 8, color: kind === 'liability' ? '#e0533d' : '#377cc8' })
  }
  const saveAdd = (kind) => {
    if (!draft.name.trim()) return
    addItem('accounts', {
      name: draft.name, balance: Number(draft.balance), growth: fromPct(draft.growthPct), color: draft.color,
      kind, type: kind === 'liability' ? 'loan' : 'investment',
    })
    setAddingKind(null)
  }
  const fabAdd = () => {
    startAdd('asset')
    accountsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const scrollToAccounts = () => accountsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const renderAddForm = (kind, label) => (
    <div className="my-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 dark:bg-brand-500/5 p-3 space-y-2">
      <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={`${label} name`} className="input !py-1.5 text-sm" />
      <div className="flex gap-2">
        <label className="flex-1 text-[11px] font-semibold text-ink-400">Balance ₹
          <input type="number" value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: e.target.value })} className="input !py-1.5 mt-0.5 text-sm" />
        </label>
        <label className="w-20 text-[11px] font-semibold text-ink-400">Growth %
          <input type="number" step="0.5" min="0" max="50" value={draft.growthPct} onChange={(e) => setDraft({ ...draft, growthPct: e.target.value })} className="input !py-1.5 mt-0.5 text-sm" />
        </label>
        <label className="text-[11px] font-semibold text-ink-400">Colour
          <input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="block h-9 w-9 mt-0.5 rounded-lg border border-ink-200 dark:border-ink-700" />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={() => saveAdd(kind)} className="btn-primary flex-1 !py-1.5 text-sm">Save</button>
        <button onClick={() => setAddingKind(null)} className="btn-ghost !py-1.5 text-sm">Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* ---- Portfolio header ---- */}
      <div className="flex items-center gap-3 animate-fade-in-up">
        <div className="grid place-items-center h-11 w-11 rounded-full bg-brand-600 text-white font-bold text-sm shrink-0">{initials}</div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">Portfolio Value</div>
          <div className="text-3xl font-extrabold money text-emerald-600 dark:text-emerald-400 leading-tight">
            {fmtMoney(totalAssets, { compact: true })}
          </div>
        </div>
      </div>

      {/* ---- Stat cells ---- */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Liquidity (Cash)</div>
          <div className="mt-1 text-xl font-extrabold money">{fmtMoney(cashTotal, { compact: true })}</div>
          <div className="mt-1 text-[11px] text-ink-400 font-medium">savings + FD balances</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Avg Growth (Wtd)</div>
          <div className="mt-1 text-xl font-extrabold money">{(avgGrowthWtd * 100).toFixed(1)}%</div>
          <div className="mt-1 text-[11px] text-ink-400 font-medium">balance-weighted, {assets.length} assets</div>
        </Card>
      </div>

      {/* ---- Asset allocation donut ---- */}
      <div>
        <SectionLabel action={
          <button onClick={scrollToAccounts} className="text-xs font-bold text-brand-600 hover:text-brand-700">rebalance</button>
        }>Asset Allocation</SectionLabel>
        <Card>
          <DonutRing big size={192} value={fmtMoney(netWorth, { compact: true })} label="Net Worth"
            segments={allocation.length ? allocation.map((b) => ({ value: b.value, color: b.color })) : [{ value: 1, color: '#94a3b8' }]} />
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
            {allocation.map((b) => (
              <div key={b.label} className="flex items-start gap-2">
                <span className="h-2.5 w-2.5 rounded-full mt-1 shrink-0" style={{ background: b.color }} />
                <div className="min-w-0">
                  <div className="text-[11px] text-ink-400 font-medium">{b.label}</div>
                  <div className="text-sm font-extrabold money">{fmtMoney(b.value, { compact: true })}</div>
                </div>
              </div>
            ))}
            {!allocation.length && <div className="text-sm text-ink-400 col-span-2">No assets yet — add your first account below.</div>}
          </div>
        </Card>
      </div>

      {/* ---- Active investments (SIP) rail ---- */}
      {sips.length > 0 && (
        <div>
          <SectionLabel action={
            <button onClick={scrollToAccounts} className="text-xs font-bold text-brand-600 uppercase tracking-wide">view all</button>
          }>Active Investments (SIP)</SectionLabel>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {sips.map((c) => {
              const acct = accountById[c.accountId]
              return (
                <Card key={c.id} className="!p-4 min-w-[200px] shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="xp-chip !px-2 !py-0.5 text-[10px]">{c.section || TYPE_LABELS[acct.type] || 'SIP'}</span>
                    <span className="chip !px-2 !py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 text-[10px]">
                      +{toPct(acct.growth)}%
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-bold truncate">{acct.name}</div>
                  <div className="mt-1 text-lg font-extrabold money">{fmtMoney(c.amount / 12, { compact: true })}<span className="text-xs text-ink-400 font-semibold">/mo</span></div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-400">{fmtMoney(c.amount, { compact: true })} / year</div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- 5-year projection ---- */}
      <div>
        <SectionLabel action={
          <Link to="/settings" className="text-xs font-bold text-brand-600 uppercase tracking-wide">Config Rates</Link>
        }>Wealth Projection (5Y)</SectionLabel>
        <Card className="!p-4">
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fiveYear} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="acc5y" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#377cc8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#377cc8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmtMoney(v, { compact: true })} labelFormatter={(y) => `Year ${y}`} />
                <Area type="monotone" dataKey="netWorth" name="Net worth" stroke="#377cc8" strokeWidth={2.5} fill="url(#acc5y)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400 font-medium">
            <span>Projected net worth · from your plan assumptions</span>
            <span className="money font-bold text-ink-500 dark:text-ink-300">{fiveYear.length ? fmtMoney(fiveYear[fiveYear.length - 1].netWorth, { compact: true }) : '—'}</span>
          </div>
        </Card>
      </div>

      {/* ---- Accounts list (inline editing preserved) ---- */}
      <div ref={accountsRef} className="scroll-mt-20">
        <SectionLabel action={
          <button onClick={() => setShowCas(!showCas)} className="text-xs font-bold text-brand-600 uppercase tracking-wide">Import CAS</button>
        }>Accounts</SectionLabel>
        <Card className="!py-2">
          {showCas && <div className="my-3"><CasImport onImport={importCasFunds} /></div>}
          {addingKind === 'asset' && renderAddForm('asset', 'Asset')}
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {assets.map((a) => (
              <EditRow key={a.id} a={a} contrib={contribByAccount[a.id]}
                updateItem={updateItem} removeItem={removeItem}
                onContribChange={onContribChange} onContribRemove={onContribRemove} onContribAdd={onContribAdd} />
            ))}
            {liabilities.map((a) => (
              <EditRow key={a.id} a={a} contrib={contribByAccount[a.id]}
                updateItem={updateItem} removeItem={removeItem}
                onContribChange={onContribChange} onContribRemove={onContribRemove} onContribAdd={onContribAdd} />
            ))}
            {accounts.length === 0 && <div className="text-sm text-ink-400 py-4 text-center">No accounts yet.</div>}
          </div>
          {addingKind === 'liability' && renderAddForm('liability', 'Liability')}
          <div className="flex items-center justify-center gap-4 py-3 border-t border-ink-100 dark:border-ink-800">
            <button onClick={() => startAdd('asset')} className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700">
              <IconPlus size={15} /> Add Asset
            </button>
            <span className="text-ink-200 dark:text-ink-700">|</span>
            <button onClick={() => startAdd('liability')} className="inline-flex items-center gap-1 text-sm font-bold text-rose-500 hover:text-rose-600">
              <IconPlus size={15} /> Add Liability
            </button>
          </div>
        </Card>
      </div>

      <Fab label="Add account" onClick={fabAdd}><IconPlus size={24} /></Fab>
    </div>
  )
}
