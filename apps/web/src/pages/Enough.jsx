/* HOW MUCH IS ENOUGH
 *
 * The tab is built around the questions a person actually arrives with, in the order they
 * ask them:
 *
 *   1  What happens if I stop today, and what would that take
 *   2  What happens if I stop at the age on my plan, and what would THAT take
 *   3  What would I have to put away every month to get there
 *   4  What is the earliest I could stop
 *   5  What is left at the end
 *
 * THE STRUCTURE IS THE INSIGHT. Those are not five cards: 1 is one complete scenario and
 * 2–5 are another. So the screen is two self-contained answers and then the chart, which is
 * the instrument that moves the second one. Nothing has to be cross-referenced against
 * anything else, because no question is answered in a different block from where it is asked.
 *
 * THE OUTCOME IS THE HEADLINE, THE MONEY IS THE DETAIL. "What happens?" is not answered by
 * "₹13.35 Cr" — that is the working. Each panel leads with how the life ends and puts the
 * figures underneath, in a fixed order so the same row can be compared between panels.
 *
 * EVERY FIGURE IS NOMINAL: the rupees of the year it happens in, the number that will
 * really be on the statement. Nothing is discounted back to today, so two ages are not
 * comparable by eye and anything showing both names both years.
 */

import { useMemo, useState, useDeferredValue } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
} from 'recharts'
import { fmtMoney, SEQUENCE_COUNT, EQUITY_HISTORY, EQUITY_END_YEAR, ENOUGH_ASSETS, WATERFALL_ORDER, enoughYearRows, inflationOutrunsEverything, equityCagr } from '@projectlab/engine'
import { useStore } from '../data/store.js'
import { Card, SectionTitle, Modal } from '../components/ui.jsx'
import { useEnoughSettings, useEnoughInput, useEnoughAnswer, useEnoughCurve, effectiveEnoughGoals } from '../data/useEnough.js'
import WhatIfTab from '../components/enough/WhatIfTab.jsx'
import GoalsEditor from '../components/enough/GoalsEditor.jsx'

/**
 * Rupees, with one step the shared formatter does not have.
 *
 * `fmtMoney` stops grouping at crore, which is right everywhere else in the app. This
 * screen can legitimately produce figures a thousand times larger — set inflation above
 * every return and the corpus that "works" runs to lakhs of crores — and "₹8000000 Cr" is
 * not a number anybody reads, it is a string that overflows the axis. So one more step,
 * at the next real Indian unit.
 */
const money = (v) => {
  if (v == null) return '—'
  const a = Math.abs(v)
  if (a >= 1e12) return `${v < 0 ? '-' : ''}₹${+(a / 1e12).toFixed(a >= 1e14 ? 0 : 2)} Lk Cr`
  return fmtMoney(v, { compact: true })
}
const pct = (v) => `${(v * 100).toFixed(v * 100 < 10 ? 1 : 0)}%`

const COL = {
  enough: '#377cc8',
  worst: '#e08a1e',
  best: '#469b88',
}

// Goal pin colours — one per goal, matching the Your-plan goals list.
const GOAL_COLORS = ['#0F8F82', '#5647B8', '#2A63C4', '#8A6410', '#B05A12']

/* ── The three tabs ─────────────────────────────────────────────────────────────────────
   The feature the prototype ships as a whole app: a natural-language "What if", the FIRE
   number itself, and the plan behind both. Each is its own route, so it is a first-class
   destination in the bottom nav rather than a control inside one screen. */
const TAB_PATH = { ask: '/enough/what-if', num: '/enough', plan: '/enough/plan' }
const tabFromPath = (pathname) =>
  pathname.endsWith('/what-if') ? 'ask' : pathname.endsWith('/plan') ? 'plan' : 'num'

const TAB_TITLE = {
  ask: 'What if',
  num: 'How much is enough',
  plan: 'Your plan',
}
const TAB_SUBTITLE = {
  ask: 'Try a change the form has no field for — it runs on a copy of your plan, nothing is saved unless you say so',
  num: `Your FIRE number, tested against all ${SEQUENCE_COUNT} NIFTY 500 sequences · every figure in the rupees of its own year`,
  plan: 'The plan behind the number — every field is derived from your plan and can be overridden here',
}

export default function Enough() {
  const [settings, patch] = useEnoughSettings()
  const profile = useStore((s) => s.profile)
  const location = useLocation()
  const navigate = useNavigate()
  const tab = tabFromPath(location.pathname)
  const setTab = (t) => navigate(TAB_PATH[t])
  const [sliderAge, setSliderAge] = useState(null)
  const [page, setPage] = useState('chart')
  const [sheet, setSheet] = useState(null)

  // The slider re-solves on every step. Deferring it keeps the thumb on the finger and
  // lets React drop intermediate frames rather than queue a second of arithmetic per pixel.
  // Only the FIRE-number tab reads the slider; elsewhere the raw stays at the plan's own age.
  const liveAge = sliderAge ?? settings.retireAge ?? profile.retirementAge
  const solvedAge = useDeferredValue(liveAge)
  const { cfg, derived, raw } = useEnoughInput(settings, tab === 'num' ? solvedAge : undefined)

  return (
    <div className="space-y-5">
      <SectionTitle title={TAB_TITLE[tab]} subtitle={TAB_SUBTITLE[tab]} />

      {tab === 'ask' && (
        <WhatIfTab baseRaw={raw} settings={settings} patch={patch} onApplied={() => setTab('num')} />
      )}

      {tab === 'plan' && (
        <YourPlanTab
          settings={settings} patch={patch} derived={derived} cfg={cfg}
          profile={profile} onSeeNumber={() => setTab('num')}
        />
      )}

      {tab === 'num' && (
        <FireNumberTab
          cfg={cfg} settings={settings} patch={patch}
          liveAge={liveAge} solvedAge={solvedAge} sliderAge={sliderAge} setSliderAge={setSliderAge}
          page={page} setPage={setPage} sheet={sheet} setSheet={setSheet}
          profile={profile} onGoPlan={() => setTab('plan')}
        />
      )}
    </div>
  )
}

/* ── The FIRE-number tab — the verdict, the chart and the year-by-year figures ─────────── */
function FireNumberTab({ cfg, settings, patch, liveAge, solvedAge, sliderAge, setSliderAge, page, setPage, sheet, setSheet, profile, onGoPlan }) {
  const answer = useEnoughAnswer(cfg)
  // The curve is 50-odd full solves. It follows the answer in rather than blocking it, and
  // it is pinned to the plan's own retirement age so dragging the slider does not restart it.
  const { curve, earliest, pending: curvePending } = useEnoughCurve(cfg, answer.mixSet)

  if (!cfg.mixSet) {
    return (
      <Card className="text-center">
        <h2 className="text-lg font-bold">One thing left</h2>
        <p className="text-sm text-ink-400 mt-2 max-w-md mx-auto leading-relaxed">
          The number depends on how your money is invested, and we do not choose that for you — it is the one
          input where a default would be a recommendation. Set your split on <b>Your plan</b> and the answer
          comes back.
        </p>
        <button className="btn-primary mt-5" onClick={onGoPlan}>Set my asset allocation</button>
      </Card>
    )
  }

  if (answer.target == null) {
    return (
      <Card className="text-center">
        <h2 className="text-lg font-bold">No amount is enough for this</h2>
        <p className="text-sm text-ink-400 mt-2 max-w-md mx-auto leading-relaxed">
          With the allocation and rates set here, no starting corpus survives every sequence — in at
          least one of them the spending grows faster than the money, however much you begin with.
          That usually means a very long plan on a very low return.
        </p>
        <button className="btn-primary mt-5" onClick={onGoPlan}>Change the assumptions</button>
      </Card>
    )
  }

  const { paths, today } = answer
  const stale = liveAge !== solvedAge

  return (
    <div className="space-y-5">
      {cfg.retireAge > cfg.currentAge && <TodayAnchor today={today} cfg={cfg} onOpen={() => setSheet('today')} />}

      <AtAgePanel cfg={cfg} answer={answer} paths={paths} onOpen={() => setSheet('gap')} />

      {inflationOutrunsEverything(cfg) && (
        <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-500/10">
          <p className="text-sm leading-relaxed">
            <b>Prices are set to rise faster than anything in this plan grows.</b> The cost of living is at{' '}
            {pct(cfg.inflation)} a year, above every asset held here — including what equity managed over the
            whole series ({pct(equityCagr())}). In that world no amount of money holds its value, so the figure
            above is arithmetic rather than a plan. Nothing is blocked, because the sum is right. It is said
            because the answer is not.
          </p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="section-label truncate">{page === 'chart' ? 'Your corpus over time' : 'Year by year'}</span>
          <div className="inline-flex shrink-0 rounded-xl bg-ink-100 dark:bg-ink-800 p-1 text-xs font-semibold">
            {['chart', 'table'].map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-lg transition ${page === p ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}>
                {p === 'chart' ? 'Chart' : 'Year by year'}
              </button>
            ))}
          </div>
        </div>

        {page === 'chart'
          ? <EnoughChart cfg={cfg} paths={paths} curve={curve} stale={stale} curvePending={curvePending} onExplain={() => setSheet('chart')} />
          : <YearTable cfg={cfg} paths={paths} />}

        <div className="mt-4 pt-4 border-t border-ink-100 dark:border-ink-800">
          <label className="flex items-center justify-between text-xs font-semibold text-ink-400 uppercase tracking-wide">
            <span>Retire at</span>
            <span className="money text-base font-extrabold text-ink-900 dark:text-white">{liveAge}</span>
          </label>
          <input
            type="range" className="w-full mt-2 accent-brand-600"
            min={cfg.currentAge} max={cfg.planAge - 1} value={liveAge}
            aria-label="Age you retire"
            onChange={(e) => setSliderAge(+e.target.value)}
          />
          <div className="flex justify-between text-[11px] text-ink-400 font-medium">
            <span>{cfg.currentAge}</span>
            <span>{cfg.planAge - 1}</span>
          </div>
          {sliderAge != null && sliderAge !== (settings.retireAge ?? profile.retirementAge) && (
            <div className="flex gap-2 mt-3">
              <button className="btn-secondary !py-2 text-xs" onClick={() => patch({ retireAge: sliderAge })}>
                Keep {sliderAge} as my retirement age
              </button>
              <button className="btn-ghost !py-2 text-xs" onClick={() => setSliderAge(null)}>Reset</button>
            </div>
          )}
        </div>
      </Card>

      <EarliestCard cfg={cfg} earliest={earliest} pending={curvePending} />

      <MethodCard cfg={cfg} answer={answer} onOpen={() => setSheet('method')} onLimits={() => setSheet('limits')} />

      {sheet === 'today' && <TodaySheet today={today} cfg={cfg} onClose={() => setSheet(null)} />}
      {sheet === 'gap' && <GapSheet cfg={cfg} answer={answer} onClose={() => setSheet(null)} />}
      {sheet === 'chart' && <ChartSheet cfg={cfg} onClose={() => setSheet(null)} />}
      {sheet === 'method' && <MethodSheet cfg={cfg} answer={answer} onClose={() => setSheet(null)} />}
      {sheet === 'limits' && <LimitsSheet cfg={cfg} onClose={() => setSheet(null)} />}
    </div>
  )
}

/* ── The allocation gate ────────────────────────────────────────────────────────────────
   The one input this app will not fill in for you. Everything else has a defensible
   default; an allocation does not, because a default allocation IS a recommendation. What
   it will do is read the one implied by the accounts you already hold, which is a fact
   about your plan rather than a suggestion about your life. */
function NeedsAllocation({ derived, onSet }) {
  const [draft, setDraft] = useState(derived.mix || { equity: 60, debt: 30, gold: 10, realEstate: 0, other: 0 })
  const total = Object.values(draft).reduce((a, b) => a + (+b || 0), 0)
  return (
    <Card className="mt-6 max-w-lg mx-auto">
      <h2 className="text-lg font-bold">One thing left — your asset allocation</h2>
      <p className="text-sm text-ink-400 mt-2 leading-relaxed">
        The corpus depends on how the money is invested, and this is the one input where a filled-in
        default would be a recommendation. We do not make recommendations. Set the split you plan to
        hold after you retire and the answer comes straight back.
      </p>
      <div className="mt-4 space-y-2">
        {Object.entries(ENOUGH_ASSETS).map(([k, label]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="flex-1 text-sm font-semibold">{label}</span>
            <input
              type="number" inputMode="numeric" className="fcell w-20" value={draft[k] ?? 0}
              aria-label={label}
              onChange={(e) => setDraft({ ...draft, [k]: Math.max(0, +e.target.value || 0) })}
            />
            <span className="text-xs text-ink-400 w-4">%</span>
          </div>
        ))}
      </div>
      <p className={`text-xs mt-3 font-semibold ${total === 100 ? 'text-emerald-600' : total <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
        {total === 100 ? 'Adds up to 100%.'
          : total <= 0 ? 'Nothing is invested. Put at least one of these above zero — we cannot scale nothing up to a hundred.'
            : `Adds up to ${total}%. We will scale it to 100% for the arithmetic, but it is worth checking you meant that.`}
      </p>
      <button className="btn-primary w-full mt-4" disabled={total <= 0} onClick={() => onSet(draft)}>
        Use this allocation
      </button>
      {derived.mix && (
        <p className="text-[11px] text-ink-400 mt-3 leading-relaxed">
          Pre-filled from the accounts already on your plan — what you hold today, not what anyone thinks
          you should hold.
        </p>
      )}
    </Card>
  )
}

/* ── Q1: retiring today ─────────────────────────────────────────────────────────────────
   The anchor. "Am I free yet" is the one question in this whole category a person feels
   rather than calculates, and the one they opened the screen to check — so it is visible
   without being asked for, and it never moves when the slider does. It is a strip, not a
   panel: not an object you act on, a fact that is always true. */
function TodayAnchor({ today, cfg, onOpen }) {
  let lead = null
  let tone = ''
  let body
  if (today.have == null) {
    body = <>Retiring today would take <b className="money">{money(today.need)}</b>. Add what you already hold and this says whether you have it.</>
  } else if (today.ok) {
    lead = 'You could retire today.'
    tone = 'text-emerald-600'
    body = <>
      <b className="money">{money(today.need)}</b> would do it and you hold <b className="money">{money(today.have)}</b>
      {today.endWorst > 0 && <> — the worst of the {SEQUENCE_COUNT} sequences still has <b className="money">{money(today.endWorst)}</b> at {cfg.planAge}</>}.
    </>
  } else {
    lead = 'Not yet.'
    tone = 'text-amber-600'
    body = <>
      Retiring today would take <b className="money">{money(today.need)}</b> and you hold <b className="money">{money(today.have)}</b>
      {today.ruinAge != null && <> — the money would run out at <b className="money">{today.ruinAge}</b></>}.
    </>
  }
  return (
    <button onClick={onOpen} className="w-full text-left rounded-xl bg-ink-50 dark:bg-ink-800/60 px-4 py-3 transition hover:bg-ink-100 dark:hover:bg-ink-800">
      <div className="section-label">If you retired today · {cfg.currentYear}</div>
      <p className="text-sm leading-relaxed mt-1">
        {lead && <b className={tone}>{lead} </b>}{body}
      </p>
    </button>
  )
}

/* ── Q2–Q5: the age on the plan. The slider moves this panel and nothing else. ────────── */
function AtAgePanel({ cfg, answer, paths, onOpen }) {
  const n = cfg.retireAge - cfg.currentAge
  const ranOut = paths.ruinCount > 0 && paths.ruinAge != null
  const live = paths.live

  let out
  let outSub
  let tone = ''
  if (!live) {
    out = `Lasts to ${cfg.planAge}`
    outSub = 'on a corpus sized to end at exactly zero'
  } else if (ranOut) {
    const m = paths.ruinAge - cfg.retireAge
    out = `Runs out at ${paths.ruinAge}`
    tone = 'text-amber-600'
    outSub = `${m} year${m === 1 ? '' : 's'} of retirement, then nothing — in the worst of the ${SEQUENCE_COUNT} sequences`
  } else {
    out = `Lasts to ${cfg.planAge}`
    tone = 'text-emerald-600'
    outSub = `even in the worst of the ${SEQUENCE_COUNT} sequences, on what you hold and put away now`
  }

  return (
    <button onClick={onOpen} className="card card-interactive w-full text-left block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="section-label">{n > 0 ? `Retire at ${cfg.retireAge}` : 'Retire today'}</span>
        <span className="text-[11px] uppercase tracking-wide text-ink-400 whitespace-nowrap">
          {n > 0 ? `in ${n} year${n === 1 ? '' : 's'} · ${answer.retireYear}` : `age ${cfg.currentAge} · ${answer.retireYear}`}
        </span>
      </div>
      <div className={`text-xl font-extrabold tracking-tight mt-3 ${tone}`}>{out}</div>
      <p className="text-xs text-ink-400 mt-1">{outSub}</p>

      <div className="mt-4 pt-3 border-t border-ink-100 dark:border-ink-800 space-y-1">
        <Row label="Corpus needed" value={money(answer.target)} strong />
        {answer.sip != null && (
          <Row
            label={answer.sip <= 1 ? 'SIP needed' : `SIP needed · ${cfg.stepUp > 0 ? `rising ${pct(cfg.stepUp)}/yr` : 'flat for life'}`}
            value={answer.sip <= 1
              ? 'nothing more needed'
              : `${money(answer.sip)} a month${cfg.saveMonthly != null ? ` · now ${money(cfg.saveMonthly)}` : ''}`}
          />
        )}
        <Row label={`Left at ${cfg.planAge}`} value={ranOut ? 'nothing' : money(paths.endWorst)} />
        {cfg.bequest > 0 && (
          <Row label="Legacy you set" value={money(paths.legacy)} />
        )}
      </div>
      <div className="text-xs font-semibold text-brand-600 mt-3">How this is worked out ›</div>
    </button>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="text-xs text-ink-400">{label}</span>
      <span className={`money text-sm text-right ${strong ? 'font-extrabold' : 'font-semibold'}`}>{value}</span>
    </div>
  )
}

/* ── The chart ──────────────────────────────────────────────────────────────────────────
   Two lines and a band. The turquoise line is the answer — what it would take to retire at
   each age. The amber line is your money in the single worst sequence, which is the only
   one worth planning against. Where they cross is the FI date, readable without touching a
   control.

   THE MONEY AXIS IS EVENLY SPACED. A log axis fits every line at full height and costs the
   one thing a chart of compounding is for: equal distance stops meaning equal rupees, so
   nothing on it can be compared by eye. Linear gives that back — a line half as high IS
   half the money. What it costs is that the first years sit flat near the floor, which is
   what compounding actually looks like, and is why the year-by-year page exists. */
function EnoughChart({ cfg, paths, curve, stale, curvePending, onExplain }) {
  const data = useMemo(() => paths.ages.map((age, i) => ({
    age,
    year: cfg.currentYear + i,
    worst: paths.worst[i],
    best: paths.best[i],
    median: paths.median[i],
    band: paths.best[i] != null && paths.worst[i] != null ? [paths.worst[i], paths.best[i]] : null,
    enough: curve ? curve[i] : null,
  })), [paths, curve, cfg.currentYear])

  // Goals sit on the money, not beside it — a pin on the lower of the two lines the year each
  // falls due, in the goal's own colour. Recurring goals get a small pin per year.
  const goalDots = useMemo(() => {
    const out = []
    ;(cfg.goals || []).forEach((g, gi) => {
      const to = g.untilAge && g.untilAge > g.atAge ? g.untilAge : g.atAge
      const recurring = to > g.atAge
      for (let age = g.atAge; age <= to; age += 1) {
        const i = age - cfg.currentAge
        if (i < 0 || i >= paths.ages.length) continue
        const worst = paths.worst[i]
        const en = curve ? curve[i] : null
        const y = [worst, en].filter((v) => v != null).sort((a, b) => a - b)[0]
        if (y == null) continue
        out.push({ key: `${g.id ?? gi}-${age}`, age, y, color: GOAL_COLORS[gi % GOAL_COLORS.length], recurring })
      }
    })
    return out
  }, [cfg.goals, cfg.currentAge, paths, curve])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-ink-500 mb-2">
        <Legend color={COL.enough} label="Enough to retire then" line />
        <Legend color={COL.worst} label="Your money, worst sequence" line />
        <Legend color={COL.best} label={`Range of all ${SEQUENCE_COUNT}`} />
        {goalDots.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: GOAL_COLORS[0] }} />
            Goals
          </span>
        )}
        <button onClick={onExplain} className="ml-auto text-brand-600 font-semibold">How to read this ›</button>
      </div>
      <div className={`h-[340px] -ml-2 transition-opacity ${stale ? 'opacity-60' : ''}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-200 dark:text-ink-800" vertical={false} />
            <XAxis dataKey="age" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tickFormatter={money} tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" tickLine={false} axisLine={false} width={74} />
            <Tooltip content={<EnoughTooltip cfg={cfg} />} />
            {/* The band is a range, not a path — no stroke, so its top edge cannot be read
                as a second series and a plan that never catches up cannot look like one
                that crosses. */}
            <Area dataKey="band" stroke="none" fill={COL.best} fillOpacity={0.1} isAnimationActive={false} connectNulls />
            <Line dataKey="worst" stroke={COL.worst} strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
            <Line dataKey="enough" stroke={COL.enough} strokeWidth={3} dot={false} isAnimationActive={false} connectNulls />
            <ReferenceLine x={cfg.retireAge} stroke={COL.enough} strokeDasharray="3 4"
              label={{ value: `retire ${cfg.retireAge}`, position: 'top', fontSize: 11, fill: COL.enough, fontWeight: 700 }} />
            {paths.ruinAge != null && (
              <ReferenceLine x={paths.ruinAge} stroke={COL.worst} strokeDasharray="2 3"
                label={{ value: `empties ${paths.ruinAge}`, position: 'insideBottomRight', fontSize: 10, fill: COL.worst, fontWeight: 700 }} />
            )}
            {goalDots.map((d) => (
              <ReferenceDot key={d.key} x={d.age} y={d.y} r={d.recurring ? 2.6 : 4}
                fill={d.color} stroke="white" strokeWidth={1.5} isFront ifOverflow="extendDomain" />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-ink-400 mt-1 leading-relaxed">
        {curvePending && !curve ? 'Solving the enough curve for every age…' : null}
        {curve ? 'Where the two lines cross is the age you could retire. ' : null}
        The band’s top edge is stitched from whichever sequence was luckiest that year, so nobody travels
        along it — it is a range, not a path.
      </p>
    </div>
  )
}

function Legend({ color, label, line }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={line ? 'h-0.5 w-4 rounded-full' : 'h-3 w-3 rounded-sm'} style={{ background: color, opacity: line ? 1 : 0.35 }} />
      {label}
    </span>
  )
}

function EnoughTooltip({ active, payload, cfg }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="rounded-xl border border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-soft px-3 py-2 text-xs">
      <div className="font-bold mb-1">Age {r.age} · {r.year}{r.age === cfg.retireAge ? ' · the year you retire' : ''}</div>
      {r.enough != null && <TipRow color={COL.enough} label="Enough to retire then" value={money(r.enough)} />}
      <TipRow color={COL.worst} label={r.age > cfg.retireAge ? 'Worst case' : 'Corpus by then'} value={money(r.worst)} />
      <TipRow color={COL.best} label="Luckiest sequence" value={money(r.best)} />
    </div>
  )
}

function TipRow({ color, label, value }) {
  return (
    <div className="flex justify-between gap-6">
      <span style={{ color }}>{label}</span>
      <span className="money font-semibold">{value}</span>
    </div>
  )
}

/* ── The same run, written out ──────────────────────────────────────────────────────────
   One set of figures only, in the rupees of each year, which is what you would really hand
   over. OUT is the SALE, not the bill: the engine grosses every withdrawal up for tax, and
   a table printing the pre-tax figure could never add up against the corpus column. */
function YearTable({ cfg, paths }) {
  const rows = useMemo(() => enoughYearRows(cfg, paths), [cfg, paths])

  const download = () => {
    const head = ['age', 'year', 'money_in', 'money_out_incl_tax', 'corpus_worst_sequence']
    const body = rows.map((r) => [r.age, r.year, Math.round(r.moneyIn), Math.round(r.moneyOut), Math.round(r.corpus ?? 0)])
    const csv = [head, ...body].map((r) => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `how-much-is-enough-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 400)
  }

  return (
    <div>
      <div className="max-h-[340px] overflow-y-auto rounded-xl border border-ink-100 dark:border-ink-800">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white dark:bg-ink-900">
            <tr className="text-[10px] uppercase tracking-wider text-ink-400">
              <th className="text-left px-3 py-2 font-bold">Age</th>
              <th className="text-right px-3 py-2 font-bold">In</th>
              <th className="text-right px-3 py-2 font-bold">Out, incl. tax</th>
              <th className="text-right px-3 py-2 font-bold">Corpus</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.age}
                className={`border-t border-ink-100 dark:border-ink-800 ${
                  r.ranOutHere ? 'bg-amber-50 dark:bg-amber-500/10' : r.isRetireYear ? 'bg-brand-50 dark:bg-brand-500/10' : ''}`}>
                <td className="px-3 py-1.5 font-semibold">{r.age}</td>
                <td className="px-3 py-1.5 text-right money">{r.moneyIn > 1 ? money(r.moneyIn) : '—'}</td>
                <td className="px-3 py-1.5 text-right money text-amber-600">{r.moneyOut > 1 ? money(r.moneyOut) : '—'}</td>
                {/* Dead years are NOT dimmed. Faded grey reads as "less important", which is
                    the reverse of what an emptied corpus means. Full contrast, one marked
                    row on the year it happens, then an em dash. */}
                <td className={`px-3 py-1.5 text-right money font-semibold ${r.ranOutHere ? 'text-amber-600' : ''}`}>
                  {r.ranOutHere ? 'runs out' : r.spent ? '—' : money(r.corpus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3">
        <p className="text-[11px] text-ink-400 leading-relaxed">
          The worst of the {SEQUENCE_COUNT} sequences. Every row follows from the one above it.
        </p>
        <button className="btn-secondary !py-2 text-xs shrink-0" onClick={download}>Download CSV</button>
      </div>
    </div>
  )
}

/* ── The earliest workable age ──────────────────────────────────────────────────────────
   It sits AFTER the chart, because that is where a person has just finished dragging the
   slider and wants to know where the wall actually is. It is an age, so it is written as an
   age and everything around it is a figure. */
function EarliestCard({ cfg, earliest, pending }) {
  if (cfg.haveNow == null && cfg.saveMonthly == null) return null
  let out
  let sub
  let tone = ''
  if (pending && earliest == null) {
    out = 'Solving…'
    sub = 'one full solve per age'
  } else if (earliest == null) {
    out = 'None'
    tone = 'text-amber-600'
    sub = `no age up to ${cfg.planAge - 1} lasts on what you hold and put away now`
  } else if (earliest <= cfg.currentAge) {
    out = 'Today'
    tone = 'text-emerald-600'
    sub = `age ${cfg.currentAge} · already past it`
  } else {
    const d = earliest - cfg.retireAge
    out = `Age ${earliest}`
    tone = earliest <= cfg.retireAge ? 'text-emerald-600' : 'text-amber-600'
    sub = `${d === 0 ? `the ${cfg.retireAge} set here` : d < 0 ? `${-d} earlier than ${cfg.retireAge}` : `${d} later than ${cfg.retireAge}`}`
      + ` · ${earliest - cfg.currentAge} years from now · ${cfg.currentYear + (earliest - cfg.currentAge)}`
  }
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <span className="section-label">Earliest you can retire</span>
        <span className="hidden sm:inline text-[11px] uppercase tracking-wide text-ink-400">on your corpus and SIP</span>
      </div>
      <div className={`text-xl font-extrabold tracking-tight mt-3 ${tone}`}>{out}</div>
      <p className="text-xs text-ink-400 mt-1">{sub}</p>
    </Card>
  )
}

function MethodCard({ cfg, answer, onOpen, onLimits }) {
  // In a plan where prices outrun every asset the multiple is arithmetically correct and
  // says nothing — 2036× at a 0.0% withdrawal. The banner above has already told the reader
  // the figure is not a plan; repeating it as a tidy ratio only lends it credibility.
  const showMultiple = answer.expenseMultiple != null && !inflationOutrunsEverything(cfg)
  return (
    <Card>
      <span className="section-label">Where this number comes from</span>
      <p className="text-sm text-ink-500 mt-2 leading-relaxed">
        We do not guess an equity return and we do not ask you to. Your retirement is replayed through
        the NIFTY 500 TRI as it actually happened, {EQUITY_HISTORY.startYear}–{EQUITY_END_YEAR}, once per
        starting year, and the answer is the smallest corpus that survives <b>all {SEQUENCE_COUNT}</b> —
        living costs, every goal, and your legacy. Not on average. In every one.
        {showMultiple && (
          <> Read it as a multiple if that helps: about <b>{answer.expenseMultiple.toFixed(1)}×</b> your first
          year of retirement spending — that year’s rupees on both sides of the division — which is a
          first-year withdrawal of about <b>{(100 / answer.expenseMultiple).toFixed(1)}%</b>. Both move on
          their own whenever an input changes, because neither was assumed.</>
        )}
      </p>
      <div className="flex gap-2 mt-4 flex-wrap">
        <button className="btn-secondary !py-2 text-xs" onClick={onOpen}>The method</button>
        <button className="btn-secondary !py-2 text-xs" onClick={onLimits}>What this cannot do</button>
      </div>
    </Card>
  )
}

/* ── Sheets ─────────────────────────────────────────────────────────────────────────── */

function Sheet({ title, eyebrow, onClose, wide, children }) {
  return (
    <Modal open onClose={onClose} title={null} className={wide ? 'max-w-lg' : 'max-w-sm'}>
      <div className="section-label mb-1">{eyebrow}</div>
      <h3 className="text-base font-bold tracking-tight mb-3">{title}</h3>
      <div className="max-h-[65vh] overflow-y-auto pr-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300 space-y-3">
        {children}
      </div>
      <button className="btn-secondary w-full mt-4" onClick={onClose}>Close</button>
    </Modal>
  )
}

function TodaySheet({ today, cfg, onClose }) {
  return (
    <Sheet eyebrow="Retiring today" title="The one question this screen always answers" onClose={onClose}>
      <p>
        We set the retirement age to {today.age} — this year — and ask the engine the same thing it is
        asked everywhere else: the smallest amount that lasts to {cfg.planAge} in <b>all {SEQUENCE_COUNT}</b>{' '}
        sequences, not most of them. That is {money(today.need)}, in {cfg.currentYear} rupees, which for
        this one card is also today’s prices because the year is this one.
      </p>
      {today.have != null && (
        <p>Then those same {SEQUENCE_COUNT} sequences are run from the {money(today.have)} you hold, and the one that goes worst is reported.</p>
      )}
      <p className="text-ink-400">
        <b>What it cannot see:</b> whether part of what you hold is locked until 58 or 60 — EPF, PPF and
        NPS usually are — and whether you would really spend {money(cfg.spendMonthly)} a month with nothing
        coming in. Both change the answer and neither is in the model.
      </p>
    </Sheet>
  )
}

function GapSheet({ cfg, answer, onClose }) {
  return (
    <Sheet eyebrow={`Retiring at ${cfg.retireAge}`} title="Why the panel does not subtract" onClose={onClose}>
      <p>There are two honest tests here and they answer different questions, so the panel shows the outcome of one and the target of the other, and puts no difference between them.</p>
      <p>
        <b>The target — a standing start.</b> The smallest amount that lasts to {cfg.planAge} in all{' '}
        {SEQUENCE_COUNT} sequences if it were handed to you on the day, with no history behind it:{' '}
        <b className="money">{money(answer.target)}</b> in {answer.retireYear} rupees.
      </p>
      <p>
        <b>The outcome — one continuous life.</b> The same sequences replayed straight through, so the
        years that build the pot are the years that then spend it. That is the truer account of a life
        and usually the kinder of the two, which is why a plan can sit under the target and still never
        run out.
        {answer.arriveWith != null && <> You would arrive with <b className="money">{money(answer.arriveWith)}</b> in the worst sequence.</>}
      </p>
      <p className="text-ink-400">
        The gap between them is the price of being safe against <b>any</b> order — including one that
        gave you a poor run into retirement and a poor run out of it. Whether that is worth paying is
        not a question arithmetic can answer.
      </p>
    </Sheet>
  )
}

function ChartSheet({ cfg, onClose }) {
  return (
    <Sheet eyebrow="Reading the chart" title="Two lines, a band, and where they cross" onClose={onClose}>
      <p>
        Every figure is <b>nominal</b> — the rupees of the year it happens in, the number that will really
        be on the statement. Nothing is discounted back to today, so a figure at 76 is not comparable by
        eye to one at 40.
      </p>
      <p>
        <b style={{ color: COL.enough }}>Enough to retire then.</b> The corpus you would need if you
        retired at that age. It <b>rises</b> with age even though fewer years are left to fund, because
        each of those years is priced in later, bigger rupees. Where it meets your own money is your FI date.
      </p>
      <p>
        <b style={{ color: COL.worst }}>Your money, worst sequence.</b> The single worst of the{' '}
        {SEQUENCE_COUNT} runs — one real life, and the only one worth planning against. The year-by-year
        page is this run written out.
      </p>
      <p>
        <b style={{ color: COL.best }}>The band.</b> Everything between the worst and best sequence at each
        age. Its top edge is stitched from whichever run happened to be luckiest that year, so nobody
        travels along it. It is drawn without a line of its own so it cannot be mistaken for your money.
      </p>
      <p className="text-ink-400">
        The scale is evenly spaced: a line half as high is half the money, and ₹0 is the axis itself.
        What cannot be compared is two different ages, because the rupees are different sizes —{' '}
        {money(cfg.spendMonthly * 12)} a year at {cfg.currentAge} and the same standard of living at{' '}
        {cfg.planAge} are very different numbers.
      </p>
    </Sheet>
  )
}

function MethodSheet({ cfg, answer, onClose }) {
  return (
    <Sheet eyebrow="How this corpus is worked out" title="We replay real years instead of guessing a return" onClose={onClose}>
      <p>
        Nobody knows what equity will return over the next forty years. So we do not ask you to guess a
        number, and we do not guess one either. We take what the NIFTY 500 TRI actually did from{' '}
        {EQUITY_HISTORY.startYear} to {EQUITY_END_YEAR}, run your retirement through it {SEQUENCE_COUNT}{' '}
        times — each run starting in a different year, then following the real order — and work backwards
        to the smallest corpus that survives all of them.
      </p>
      <p>
        <b>Order matters as much as returns.</b> Bad years just after you retire mean redeeming into a
        fall: you sell more units for the same rupees, so less is left to recover. The same bad years
        twenty years later and the plan holds. An average return has no order, so it cannot show this at
        all — which is the entire reason there is no “expected return” box on this screen.
      </p>
      <p>
        <b>Where is the 4% rule? Where is 25X?</b> Neither is in here. Both assume a withdrawal rate and
        multiply; this starts from the other end and solves.
        {answer.expenseMultiple != null && <> Your answer happens to be {answer.expenseMultiple.toFixed(1)}× — an output, not an input.</>}
      </p>
      <p>
        <b>The money is held at your allocation.</b> Each asset grows at its own rate and nothing
        rebalances on its own: only a cash flow moves money between them. Which asset a withdrawal comes
        out of is the strategy you picked in the assumptions.
      </p>
      <p className="text-ink-400 text-xs">
        Source: NSE Indices — niftyindices.com › Reports › Historical Data › Total Returns Index values.
        Last trading day of December, year on year, computed in code. NIFTY and NIFTY 500 are trademarks
        of NSE Indices Limited; this app is not affiliated with, endorsed or sponsored by NSE Indices
        Limited or the National Stock Exchange of India, and republishes none of their data — only yearly
        percentages derived from it. Any error in how we used their numbers is ours.
      </p>
    </Sheet>
  )
}

function LimitsSheet({ cfg, onClose }) {
  return (
    <Sheet eyebrow="What this cannot do" title="Read this before you trust the number" onClose={onClose}>
      <p><b>The runs overlap.</b> {SEQUENCE_COUNT} sequences of one past, not {SEQUENCE_COUNT} futures.</p>
      <p><b>No market worse than the record.</b> Every run contains all {SEQUENCE_COUNT} years, so this tests bad <i>order</i>, never a permanently poorer market. That one is not in this data and cannot be.</p>
      <p><b>Long plans wrap.</b> {SEQUENCE_COUNT} years of data against a plan that may run fifty; a run reaching the end starts again from the first year.</p>
      <p><b>No cost of investing.</b> A TRI is an index, not a fund — no expense ratio, no tracking error, no brokerage or exit load, and nothing here pays to trade. Your real corpus is higher by roughly what your holdings cost you each year.</p>
      <p><b>Only equity is historical.</b> Debt, gold, real estate and others grow at your fixed rate every single year and never have a bad one, so the corpus looks smaller than it should.</p>
      <p><b>LTCG is one flat approximation.</b> One rate on a fixed gain share, both yours to set. Real tax depends on cost basis, holding period and the yearly exemption. Read it as a direction, not a filing.</p>
      {cfg.drawdown === 'waterfall' && (
        <p className="text-amber-600">
          <b>And the strategy comparison is unfair, in a known direction.</b> One tax rate is charged on
          every rupee withdrawn whatever was sold. Safest-first sells debt first, and debt is taxed harder
          than equity — so it is charged too little and looks better than it is. Treat any saving it shows
          as the most it could be, not as what it is.
        </p>
      )}
      <p><b>Money that is locked.</b> EPF, PPF and NPS are normally locked until 58–60. This treats every rupee as spendable from the day you retire{cfg.retireAge < 58 ? `, and you have set ${cfg.retireAge}` : ''}.</p>
    </Sheet>
  )
}

/* ── Your plan ──────────────────────────────────────────────────────────────────────────
   The plan behind the number. Every field already has a value derived from the plan;
   editing one here overrides it for this feature only, and "Follow plan" puts it back —
   which is not the same as retyping the number the plan currently holds, because a copied
   number stops tracking the thing it was copied from. */
function YourPlanTab({ settings, patch, derived, cfg, profile, onSeeNumber }) {
  const mixSet = cfg.mixSet
  const goals = effectiveEnoughGoals(settings, derived)

  return (
    <div className="space-y-4">
      {!mixSet && (
        <Card className="border-brand-300 bg-brand-50/50 dark:bg-brand-500/10">
          <p className="text-sm leading-relaxed">
            <b className="text-brand-600">One thing left</b> — your asset allocation. The corpus depends on how
            the money is invested, and it is the one input where a filled-in default would be a recommendation.
            Set the split below and the answer comes back.
          </p>
        </Card>
      )}

      <Card>
        <PlanEditorFields settings={settings} patch={patch} derived={derived} cfg={cfg} profile={profile} />
      </Card>

      <GoalsEditor goals={goals} currentAge={cfg.currentAge} onChange={(next) => patch({ goals: next })} />

      <PlanData settings={settings} patch={patch} />

      {mixSet && (
        <button className="btn-primary w-full" onClick={onSeeNumber}>See the corpus I need →</button>
      )}
    </div>
  )
}

/* Save & share the plan. It lives in this browser only — export writes a copy you can keep,
   import reads one back. No account, no server. */
function PlanData({ settings, patch }) {
  const exportPlan = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financial-blueprint-plan-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 400)
  }
  const importPlan = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return
      const r = new FileReader()
      r.onload = () => {
        try {
          const o = JSON.parse(r.result)
          if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('bad')
          patch(o)
        } catch {
          alert('That file is not a valid plan.')
        }
      }
      r.readAsText(f)
    }
    input.click()
  }
  return (
    <Card>
      <div className="section-label mb-2">Your plan data</div>
      <p className="text-xs text-ink-400 leading-relaxed mb-3">
        Kept in this browser — no account, no server. Export a copy to keep or move it to another device,
        or import one you saved.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button className="btn-secondary !py-2 text-xs" onClick={exportPlan}>Export plan</button>
        <button className="btn-secondary !py-2 text-xs" onClick={importPlan}>Import plan</button>
      </div>
    </Card>
  )
}

/* The editor body, shared shape with the old assumptions sheet — a flat list of fields the
   plan derives and the user can override. Rendered inside the Your-plan tab. */
function PlanEditorFields({ settings, patch, derived, cfg, profile }) {
  const mix = settings.mix || derived.mix || {}
  const mixTotal = Object.values(mix).reduce((a, b) => a + (+b || 0), 0)

  return (
    <div className="text-sm leading-relaxed text-ink-600 dark:text-ink-300 space-y-3">
      <Field
        label="Monthly spending once retired" hint="at today's prices"
        value={cfg.spendMonthly} overridden={settings.spendMonthly != null}
        onChange={(v) => patch({ spendMonthly: v })} onFollow={() => patch({ spendMonthly: null })}
        followHint={`plan: ${money(derived.spendMonthly)}/mo`}
      />
      <Field
        label="Invested corpus today" hint="cash, investments and retirement accounts — not the house"
        value={cfg.haveNow ?? 0} overridden={settings.haveNow != null}
        onChange={(v) => patch({ haveNow: v })} onFollow={() => patch({ haveNow: null })}
        followHint={derived.haveNow == null ? 'no accounts on the plan yet' : `plan: ${money(derived.haveNow)}`}
      />
      <Field
        label="Monthly SIP" hint="everything going in each month"
        value={cfg.saveMonthly ?? 0} overridden={settings.saveMonthly != null}
        onChange={(v) => patch({ saveMonthly: v })} onFollow={() => patch({ saveMonthly: null })}
        followHint={derived.saveMonthly == null ? 'no contributions on the plan yet' : `plan: ${money(derived.saveMonthly)}/mo`}
      />
      <Field
        label="What you leave behind" hint="today's prices, inflated to the last year of the plan"
        value={settings.bequest} onChange={(v) => patch({ bequest: v })}
      />

      <Pair
        label="Retirement age" value={cfg.retireAge} min={cfg.currentAge} max={cfg.planAge - 1}
        overridden={settings.retireAge != null}
        onChange={(v) => patch({ retireAge: v })} onFollow={() => patch({ retireAge: null })}
        followHint={`plan: ${profile.retirementAge}`}
      />
      <Pair
        label="Plan until age" value={cfg.planAge} min={cfg.retireAge + 1} max={120}
        overridden={settings.planAge != null}
        onChange={(v) => patch({ planAge: v })} onFollow={() => patch({ planAge: null })}
        followHint={`plan: ${profile.lifeExpectancy}`}
      />
      <Pair label="Inflation %/yr" value={+(cfg.inflation * 100).toFixed(1)} step={0.5} min={0} max={40}
        overridden={settings.inflation != null}
        onChange={(v) => patch({ inflation: v / 100 })} onFollow={() => patch({ inflation: null })}
        followHint={`plan: ${pct(profile.inflation)}`}
      />
      <Pair label="SIP step-up %/yr" value={+(settings.stepUp * 100).toFixed(1)} step={1} min={0} max={40}
        onChange={(v) => patch({ stepUp: v / 100 })}
        hint="Nobody saves the same rupee amount at 30 and at 50. Zero means flat for life."
      />

      <div className="pt-2">
        <div className="section-label mb-2">Asset allocation</div>
        {Object.entries(ENOUGH_ASSETS).map(([k, label]) => (
          <div key={k} className="flex items-center gap-3 py-1">
            <span className="flex-1 text-sm">{label}</span>
            <input type="number" className="fcell w-20" value={mix[k] ?? 0} aria-label={label}
              onChange={(e) => patch({ mix: { ...mix, [k]: Math.max(0, +e.target.value || 0) } })} />
            <span className="text-xs text-ink-400 w-4">%</span>
          </div>
        ))}
        <p className={`text-xs mt-1 font-semibold ${mixTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
          {mixTotal === 100 ? 'Adds up to 100%.' : `Adds up to ${mixTotal}% — scaled to 100% for the arithmetic.`}
        </p>
        {settings.mix != null && derived.mix && (
          <button className="btn-ghost !py-1.5 text-xs mt-1" onClick={() => patch({ mix: null })}>
            Follow my accounts instead
          </button>
        )}
      </div>

      <div className="pt-2">
        <div className="section-label mb-1">What you expect the rest to earn</div>
        <p className="text-xs text-ink-400 mb-2">
          Equity is not in this list. We do not assume a rate for it — {SEQUENCE_COUNT} years of real
          history are used instead. These four grow at a fixed rate every year and never have a bad one,
          so the answer looks better than it should.
        </p>
        {Object.entries(ENOUGH_ASSETS).filter(([k]) => k !== 'equity').map(([k, label]) => (
          <div key={k} className="flex items-center gap-3 py-1">
            <span className="flex-1 text-sm">{label}</span>
            <input type="number" step="0.5" className="fcell w-20" value={+(cfg.returns[k] * 100).toFixed(2)} aria-label={`${label} return`}
              onChange={(e) => patch({ returns: { ...settings.returns, [k]: (+e.target.value || 0) / 100 } })} />
            <span className="text-xs text-ink-400 w-8">%/yr</span>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <div className="section-label mb-1">What tax takes when you sell</div>
        <p className="text-xs text-ink-400 mb-2">
          Spending in retirement means selling, and a long-term gain is taxed. We do not know what you
          paid for anything, so: a share of each sale is gain, taxed at the rate you set. At these
          settings, to spend ₹100 you sell about ₹{(100 * cfg.grossUp).toFixed(0)}. Set the rate to zero
          for a pre-tax figure.
        </p>
        <Pair label="LTCG rate %" value={+(cfg.taxRate * 100).toFixed(1)} step={0.5} min={0} max={60}
          onChange={(v) => patch({ taxRate: v / 100 })} />
        <Pair label="Gain as a share of what you sell %" value={+(cfg.taxGainShare * 100).toFixed(0)} step={5} min={0} max={100}
          onChange={(v) => patch({ taxGainShare: v / 100 })} />
      </div>

      <div className="pt-2">
        <div className="section-label mb-2">Withdrawal strategy</div>
        <div className="inline-flex rounded-xl bg-ink-100 dark:bg-ink-800 p-1 text-xs font-semibold w-full">
          {[['rebalance', 'Rebalance'], ['waterfall', 'Safest first']].map(([v, label]) => (
            <button key={v} onClick={() => patch({ drawdown: v })}
              className={`flex-1 px-3 py-2 rounded-lg transition ${cfg.drawdown === v ? 'bg-white dark:bg-ink-900 text-brand-600 shadow-sm' : 'text-ink-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-400 mt-2 leading-relaxed">
          {cfg.drawdown === 'waterfall'
            ? <>Spending drains the assets in a fixed order — {WATERFALL_ORDER.map((k) => ENOUGH_ASSETS[k]).join(' → ')} — and equity is sold only when everything before it is gone. Nothing is rebalanced, so the mix drifts toward equity as the years pass. That drift is the strategy, not a side effect: you stop selling equity into bad years, which is what sequence risk actually is.</>
            : <>Spending is funded by selling whatever sits <b>above</b> its target weight. After a fall, equity is below target and debt is sold instead — so spending pulls the mix back toward your split with no trade of its own. Money going in does the mirror image.</>}
        </p>
      </div>

      <p className="text-xs text-ink-400 pt-2">
        Goals are set below, under <b>Goals &amp; big expenses</b>. A goal you leave on is withdrawn in the
        year it falls due, grossed up for tax, whether that year is before or after you retire.
      </p>
    </div>
  )
}

function Field({ label, hint, value, overridden, onChange, onFollow, followHint }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        {overridden && onFollow && (
          <button className="text-[11px] font-semibold text-brand-600" onClick={onFollow}>Follow plan ({followHint})</button>
        )}
      </div>
      {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
      <input type="number" className="input mt-1" value={Math.round(value)} aria-label={label}
        onChange={(e) => onChange(Math.max(0, +e.target.value || 0))} />
      {!overridden && followHint && <p className="text-[11px] text-ink-400 mt-1">Following your plan — {followHint}</p>}
    </div>
  )
}

function Pair({ label, hint, value, step = 1, min, max, overridden, onChange, onFollow, followHint }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 min-w-0">
        <span className="text-sm">{label}</span>
        {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
        {overridden && onFollow && (
          <button className="text-[11px] font-semibold text-brand-600" onClick={onFollow}>Follow plan ({followHint})</button>
        )}
      </div>
      <input type="number" step={step} min={min} max={max} className="fcell w-24" value={value} aria-label={label}
        onChange={(e) => onChange(+e.target.value || 0)} />
    </div>
  )
}
