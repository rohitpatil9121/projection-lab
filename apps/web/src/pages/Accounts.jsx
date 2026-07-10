import { useState } from 'react'
import { useStore } from '../data/store.js'
import { fmtMoney } from '@projectlab/engine'
import { Card, SectionTitle } from '../components/ui.jsx'
import { IconPlus, IconTrash } from '../components/Icons.jsx'
import CasImport from '../components/CasImport.jsx'

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
          <div className={`${big ? 'text-3xl' : 'text-2xl'} font-extrabold tracking-tight`}>{value}</div>
          <div className="text-xs text-ink-400 font-medium mt-0.5">{label}</div>
        </div>
      </div>
    </div>
  )
}

// Inline-editable account row: name, balance and monthly SIP all editable; delete on hover.
function EditRow({ a, total, contrib, updateItem, removeItem, onContribChange, onContribRemove, onContribAdd }) {
  const pct = Math.round((a.balance / (total || 1)) * 100)
  return (
    <div className="group flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: a.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <input
            value={a.name}
            onChange={(e) => updateItem('accounts', a.id, { name: e.target.value })}
            className="text-sm font-medium bg-transparent outline-none min-w-0 flex-1 focus:text-brand-600"
          />
          {contrib ? (
            <span className="chip bg-emerald-100 text-emerald-700 text-[10px] inline-flex items-center gap-0.5 shrink-0">
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
            <button onClick={() => onContribAdd(a.id)} className="chip border border-dashed border-emerald-300 text-emerald-600 text-[10px] shrink-0 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
              + SIP
            </button>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: a.color }} />
          </div>
          <span className="text-[11px] text-ink-400 w-7 text-right">{pct}%</span>
        </div>
      </div>
      <div className="flex items-center shrink-0">
        <span className="text-ink-400 text-xs">₹</span>
        <input
          type="number"
          value={a.balance}
          onChange={(e) => updateItem('accounts', a.id, { balance: Number(e.target.value) })}
          onWheel={(e) => e.currentTarget.blur()}
          className={`w-[82px] text-right bg-transparent text-sm font-bold outline-none focus:text-brand-600 ${a.kind === 'liability' ? 'text-rose-600' : ''}`}
        />
      </div>
      <button onClick={() => removeItem('accounts', a.id)} className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-rose-500 transition shrink-0">
        <IconTrash size={14} />
      </button>
    </div>
  )
}

function StatBlock({ label, value, tone = '', suffix = '' }) {
  return (
    <div className="rounded-xl bg-ink-50 dark:bg-ink-800/60 px-4 py-3 text-center">
      <div className={`text-xl font-extrabold ${tone}`}>{value}{suffix}</div>
      <div className="text-xs text-ink-400 font-medium mt-0.5">{label}</div>
    </div>
  )
}

export default function Accounts() {
  const accounts = useStore((s) => s.accounts)
  const contributions = useStore((s) => s.contributions)
  const updateItem = useStore((s) => s.updateItem)
  const addItem = useStore((s) => s.addItem)
  const removeItem = useStore((s) => s.removeItem)
  const [addingKind, setAddingKind] = useState(null) // 'asset' | 'liability' | null
  const [showCas, setShowCas] = useState(false)
  const [draft, setDraft] = useState({ name: '', balance: 100000, growth: 0.08, color: '#6366f1' })

  const FUND_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#a855f7', '#ec4899', '#f97316', '#84cc16', '#06b6d4']
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

  const totalMonthly = contributions.reduce((s, c) => s + c.amount / 12, 0)
  // First contribution routed to each account (editable inline as the SIP chip).
  const contribByAccount = {}
  contributions.forEach((c) => { if (!contribByAccount[c.accountId]) contribByAccount[c.accountId] = c })

  const onContribChange = (id, monthly) => updateItem('contributions', id, { amount: Math.max(0, Math.round(monthly) * 12) })
  const onContribRemove = (id) => removeItem('contributions', id)
  const onContribAdd = (accountId) => addItem('contributions', { accountId, amount: 120000, section: null })

  const bucket = (pred) => accounts.filter(pred).reduce((s, a) => s + a.balance, 0)
  const assetCats = [
    { label: 'Savings', value: bucket((a) => a.type === 'cash') },
    { label: 'Investments', value: bucket((a) => a.type === 'investment' || a.type === 'retirement') },
    { label: 'Real Assets', value: bucket((a) => a.type === 'real-estate') },
  ]

  const startAdd = (kind) => {
    setAddingKind(kind)
    setDraft({ name: '', balance: kind === 'liability' ? 200000 : 100000, growth: kind === 'liability' ? 0.09 : 0.08, color: kind === 'liability' ? '#ef4444' : '#6366f1' })
  }
  const saveAdd = (kind) => {
    if (!draft.name.trim()) return
    addItem('accounts', {
      name: draft.name, balance: Number(draft.balance), growth: Number(draft.growth), color: draft.color,
      kind, type: kind === 'liability' ? 'loan' : 'investment',
    })
    setAddingKind(null)
  }

  const renderAddForm = (kind, label) => (
    <div className="mb-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 dark:bg-brand-500/5 p-3 space-y-2">
      <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={`${label} name`} className="input !py-1.5 text-sm" />
      <div className="flex gap-2">
        <label className="flex-1 text-[11px] font-semibold text-ink-400">Balance ₹
          <input type="number" value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: e.target.value })} className="input !py-1.5 mt-0.5 text-sm" />
        </label>
        <label className="w-16 text-[11px] font-semibold text-ink-400">Growth
          <input type="number" step="0.01" value={draft.growth} onChange={(e) => setDraft({ ...draft, growth: e.target.value })} className="input !py-1.5 mt-0.5 text-sm" />
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
    <div className="space-y-6">
      {/* ---- Net Worth card ---- */}
      <Card>
        <SectionTitle title="Net Worth" subtitle="Your complete balance sheet" />
        <div className="flex flex-col md:flex-row items-center gap-6 mt-2">
          <div className="md:w-56 shrink-0">
            <DonutRing big size={196} value={fmtMoney(netWorth, { compact: true })} label="Net Worth"
              segments={assets.map((a) => ({ value: a.balance, color: a.color }))} />
          </div>
          <div className="flex-1 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatBlock label="Total Assets" value={fmtMoney(totalAssets, { compact: true })} tone="text-emerald-600" />
              <StatBlock label="Total Liabilities" value={fmtMoney(totalLiab, { compact: true })} tone="text-rose-600" />
              <StatBlock label="Monthly Investing" value={fmtMoney(totalMonthly, { compact: true })} tone="text-brand-600" suffix="/mo" />
            </div>
            <p className="mt-4 text-xs text-ink-400 text-center sm:text-left">Net Worth = Total Assets − Total Liabilities</p>
          </div>
        </div>
      </Card>

      {/* ---- Assets card ---- */}
      <Card>
        <SectionTitle title="Assets" subtitle={`${assets.length} accounts`}
          action={
            <div className="flex gap-2">
              <button onClick={() => setShowCas(!showCas)} className="btn-ghost !py-1.5 text-sm">📄 Import CAS</button>
              <button onClick={() => startAdd('asset')} className="btn-primary !py-1.5"><IconPlus size={16} /> Add</button>
            </div>
          } />
        {showCas && <div className="mb-4"><CasImport onImport={importCasFunds} /></div>}
        <div className="flex flex-col md:flex-row gap-6 mt-2">
          <div className="md:w-56 shrink-0 flex flex-col items-center">
            <DonutRing size={168} value={fmtMoney(totalAssets, { compact: true })} label="Assets"
              segments={assets.map((a) => ({ value: a.balance, color: a.color }))} />
            <div className="mt-3 grid grid-cols-3 gap-2 w-full">
              {assetCats.map((c) => (
                <div key={c.label} className="rounded-lg bg-ink-50 dark:bg-ink-800/60 py-1.5 text-center">
                  <div className="text-sm font-extrabold">{fmtMoney(c.value, { compact: true })}</div>
                  <div className="text-[10px] text-ink-400 font-medium">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1">
            {addingKind === 'asset' && renderAddForm('asset', 'Asset')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {assets.map((a) => (
                <EditRow key={a.id} a={a} total={totalAssets} contrib={contribByAccount[a.id]}
                  updateItem={updateItem} removeItem={removeItem}
                  onContribChange={onContribChange} onContribRemove={onContribRemove} onContribAdd={onContribAdd} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ---- Liabilities card ---- */}
      <Card>
        <SectionTitle title="Liabilities" subtitle={`${liabilities.length} loans`}
          action={<button onClick={() => startAdd('liability')} className="btn-primary !py-1.5"><IconPlus size={16} /> Add</button>} />
        <div className="flex flex-col md:flex-row gap-6 mt-2">
          <div className="md:w-56 shrink-0 flex flex-col items-center">
            <DonutRing size={168} value={fmtMoney(totalLiab, { compact: true })} label="Liabilities"
              segments={liabilities.length ? liabilities.map((a) => ({ value: a.balance, color: a.color })) : [{ value: 1, color: '#94a3b8' }]} />
            <div className="mt-3 grid grid-cols-2 gap-2 w-full">
              <div className="rounded-lg bg-ink-50 dark:bg-ink-800/60 py-1.5 text-center">
                <div className="text-sm font-extrabold text-rose-600">{fmtMoney(totalLiab, { compact: true })}</div>
                <div className="text-[10px] text-ink-400 font-medium">Total Debt</div>
              </div>
              <div className="rounded-lg bg-ink-50 dark:bg-ink-800/60 py-1.5 text-center">
                <div className="text-sm font-extrabold">{totalAssets ? Math.round((totalLiab / totalAssets) * 100) : 0}%</div>
                <div className="text-[10px] text-ink-400 font-medium">Debt / Assets</div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            {addingKind === 'liability' && renderAddForm('liability', 'Liability')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {liabilities.map((a) => (
                <EditRow key={a.id} a={a} total={totalLiab} contrib={contribByAccount[a.id]}
                  updateItem={updateItem} removeItem={removeItem}
                  onContribChange={onContribChange} onContribRemove={onContribRemove} onContribAdd={onContribAdd} />
              ))}
              {liabilities.length === 0 && <div className="text-sm text-ink-400 py-2">Debt free! 🎉</div>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
