/* WHAT IF — the natural-language tab.
 *
 * Describe something the plan form has no field for — "retire at 48", "I have 3 crore",
 * "take 2 years off at 45" — and it is tried on a COPY of the plan and thrown away. Nothing
 * changes unless you press "Make this my plan".
 *
 * Most sentences are read on this device with no model at all (see readEnoughSentence). The
 * model seam is left in place but off by default, exactly like the prototype: with no
 * endpoint configured a sentence the local reader cannot parse is turned away here, before
 * anything would ever be sent. Every FIGURE shown is computed by the engine from the same
 * market history as the rest of the app — the language layer only ever produces operations.
 */

import { useState } from 'react'
import { fmtMoney, readEnoughSentence, scopeOfSentence, describeOps, SEQUENCE_COUNT } from '@projectlab/engine'
import { previewWhatIf, whatIfPatch } from '../../data/useEnough.js'
import { askEnoughModel } from '../../api/client.js'
import { Card, Modal } from '../ui.jsx'
import { IconSpark } from '../Icons.jsx'

const money = (v) => (v == null ? '—' : fmtMoney(v, { compact: true }))

const EXAMPLES = [
  'What if I retire at 48?',
  'I have 3 crore already',
  'What if I take 2 years off at 45?',
  'What if I spend 2 lakh a month?',
]

let msgId = 0

export default function WhatIfTab({ baseRaw, settings, patch, onApplied }) {
  const [chat, setChat] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showHow, setShowHow] = useState(false)

  const push = (msg) => setChat((c) => [...c, { id: ++msgId, ...msg }])

  const ask = async (raw) => {
    const text = String(raw || '').trim().slice(0, 200)
    if (!text || busy) return
    setInput('')
    push({ role: 'user', text })

    // On-device first: a sentence the reader already understands never leaves the device.
    let ops = readEnoughSentence(text, { currentAge: baseRaw.currentAge, retireAge: baseRaw.retireAge })
    let say = ''

    if (!ops.length) {
      const scope = scopeOfSentence(text)
      if (scope === 'off') return push({ role: 'assistant', note: REFUSE.off })
      if (scope === 'advice') return push({ role: 'assistant', note: REFUSE.advice })

      // Not understood here → the sentence alone goes to the model, which returns operations
      // (never a figure). If no model is configured the server answers 503 and we fall back.
      setBusy(true)
      try {
        const r = await askEnoughModel(text)
        setBusy(false)
        if (r.scope === 'off') return push({ role: 'assistant', note: REFUSE.off })
        if (r.scope === 'advice') return push({ role: 'assistant', note: REFUSE.advice })
        ops = r.ops || []
        say = r.say || ''
      } catch (err) {
        setBusy(false)
        return push({ role: 'assistant', note: err?.status === 503 ? REFUSE.local : REFUSE.modelError })
      }
    }

    if (!ops.length) {
      return push({
        role: 'assistant',
        note: <>{say ? <>{say}<br /><br /></> : null}<b>There is no field for that one.</b> This tab can move your retirement age, plan age, spending, what you hold, what you put away, a goal, a windfall, or a break from work — anything else it cannot try.</>,
      })
    }

    const preview = previewWhatIf(baseRaw, ops)
    if (!preview.after.mixSet) {
      return push({ role: 'assistant', note: <>Set your <b>asset allocation</b> on <b>Your plan</b> first — the corpus cannot be worked out without it.</> })
    }
    push({ role: 'assistant', result: { ops, preview, say } })
  }

  const apply = (ops) => {
    patch(whatIfPatch(ops, baseRaw.goals || []))
    onApplied?.()
  }

  return (
    <div className="space-y-3">
      {chat.length === 0 ? (
        <div className="space-y-3">
          {/* Violet is this tab's colour: a sandbox, not the plan. The intro card wears it
              so the screen is unmistakably a different place from the form next door. */}
          <div className="hero-card relative overflow-hidden !p-4"
            style={{ background: 'linear-gradient(135deg, #6d5bd0 0%, #5647b8 55%, #46389f 100%)' }}>
            <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">
                <IconSpark size={13} /> Sandbox
              </div>
              <p className="text-sm leading-relaxed mt-1.5 text-white/90">
                Describe something the form has no field for. It is tried on a copy of your plan and thrown
                away — nothing changes unless you say so.
              </p>
            </div>
          </div>
          <div className="section-label px-1 pt-1">Try one</div>
          <div className="space-y-2">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => ask(e)}
                className="card card-interactive w-full flex items-center justify-between gap-3 text-left text-sm font-semibold !px-4 !py-3 !border-violet-100 dark:!border-violet-500/20 hover:!border-violet-300">
                <span>{e}</span>
                <span className="text-violet-500 text-base leading-none">→</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {chat.map((m) => <Bubble key={m.id} m={m} onApply={apply} />)}
          {busy && (
            <div className="max-w-[92%]">
              <div className="rounded-2xl rounded-bl-md bg-ink-100 dark:bg-ink-800 text-sm px-4 py-3 text-ink-400">Thinking…</div>
            </div>
          )}
        </div>
      )}

      <div className="card sticky bottom-2 flex items-center gap-2 !p-2 !border-violet-200 dark:!border-violet-500/30 shadow-lift">
        <input
          className="input !py-2 flex-1 !border-transparent focus:!border-violet-400 focus:!ring-violet-500/15" placeholder="What if…" maxLength={200} value={input}
          aria-label="Ask what if" disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask(input) }}
        />
        <button className="btn-primary !py-2 shrink-0 !bg-violet-600 hover:!bg-violet-700 !shadow-none" disabled={busy} onClick={() => ask(input)}>Ask</button>
      </div>

      <button
        onClick={() => setShowHow(true)}
        className="w-full text-[11px] text-ink-400 text-center leading-relaxed px-2 hover:text-ink-600 dark:hover:text-ink-300 transition"
      >
        Your plan is never sent · every figure is worked out on this device ·{' '}
        <span className="font-semibold text-brand-600">how this works</span>
      </button>

      {showHow && (
        <Modal open onClose={() => setShowHow(false)} title="What is sent, and what it can do">
          <div className="max-h-[65vh] overflow-y-auto pr-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300 space-y-3">
            <p>
              Most sentences are read <b>on this device</b> and never leave it. When one is not understood,
              only <b>the sentence itself</b> is sent to the model — not your spending, not what you hold, not
              your goals, not your dates, and not anything you asked before.
            </p>
            <p>
              <b>It cannot give you a number.</b> Whatever comes back is read as instructions to the engine,
              and any figure in it is thrown away. Every number on every screen is computed here, from the
              same {SEQUENCE_COUNT} years of market history as the rest of the app.
            </p>
            <p><b>It has no memory.</b> Nothing you asked before is sent with what you ask now — each sentence is read on its own.</p>
            <p className="text-ink-400">
              <b>What it will not do:</b> name a fund, scheme or share, or tell you what to buy, sell or hold —
              that is advice, and nothing here is advice. It also turns away anything outside this app, on this
              device, before anything is sent.
            </p>
          </div>
          <button className="btn-secondary w-full mt-4" onClick={() => setShowHow(false)}>Close</button>
        </Modal>
      )}
    </div>
  )
}

const REFUSE = {
  off: <><b>That is outside what this app does.</b> It answers one thing: whether your own retirement plan lasts, and what changes it. Try a sentence about your money, your dates, or a goal — a break from work, a different age, a windfall, a change in spending.</>,
  advice: <><b>This app does not pick investments.</b> It has no view on which fund, scheme or share to hold, and it never will — that is advice and it is not ours to give. What it can do is show what a different allocation, a different age or a different amount does to your own plan.</>,
  local: <><b>Not understood here.</b> On this device I can read a break from work, a different retirement age, a change in spending, money you already hold, what you put away each month, and money arriving later. Try one of those.</>,
  modelError: <><b>The model did not answer.</b> Nothing was changed. Everything else in the app works without it — try rephrasing as a break from work, a different age, a change in spending, or money you hold.</>,
}

function Bubble({ m, onApply }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 text-white text-sm px-4 py-2.5">{m.text}</div>
      </div>
    )
  }
  return (
    <div className="max-w-[92%]">
      {m.note && (
        <div className="rounded-2xl rounded-bl-md bg-ink-100 dark:bg-ink-800 text-sm px-4 py-3 leading-relaxed">{m.note}</div>
      )}
      {m.result && <ResultCard result={m.result} onApply={onApply} />}
    </div>
  )
}

function ResultCard({ result, onApply }) {
  const { ops, preview, say } = result
  const { base: A, after: B, savable } = preview
  const [done, setDone] = useState(null)

  const rows = [
    diffRow('You need', A.corpus, B.corpus, money, 'down'),
    diffRow('Put away a month', A.sip, B.sip, money, 'down'),
    diffRow('Earliest you can retire', A.earliest, B.earliest, (v) => Math.round(v), 'down'),
  ].filter(Boolean)

  let head = null
  if (B.earliest != null) {
    const d = B.earliest - B.retireAge
    head = d <= 0
      ? <>You could still retire at <b className="money">{B.retireAge}</b>, even in the worst history{d < 0 ? <>, and {-d} year{-d === 1 ? '' : 's'} sooner if you wanted</> : null}.</>
      : <>You would retire at <b className="money text-amber-600">{B.earliest}</b> instead of {B.retireAge} — {d} year{d === 1 ? '' : 's'} later.</>
  }

  return (
    <Card className="mt-1">
      {say && <p className="text-sm text-ink-500 leading-relaxed mb-2">{say}</p>}
      <div className="section-label mb-2">{describeOps(ops)}</div>
      {head && <p className="text-sm font-semibold leading-relaxed mb-3">{head}</p>}
      {rows.length ? <div className="space-y-1.5">{rows}</div>
        : <p className="text-sm text-ink-500">Nothing moved. This changes nothing you need to worry about.</p>}
      <p className="text-[11px] text-ink-400 mt-3 leading-relaxed">
        {savable ? 'Tried on a copy of your plan. Nothing has changed.'
          : 'Preview only — the plan has no field for this, so it can be tried but not saved.'}
      </p>
      {savable && done == null && (
        <div className="flex gap-2 mt-3">
          <button className="btn-primary !py-2 text-xs" onClick={() => { onApply(ops); setDone('applied') }}>Make this my plan</button>
          <button className="btn-ghost !py-2 text-xs" onClick={() => setDone('kept')}>Keep it as it was</button>
        </div>
      )}
      {done === 'kept' && <p className="text-xs text-ink-400 mt-3">Left as it was.</p>}
      {done === 'applied' && <p className="text-xs text-emerald-600 font-semibold mt-3">Done. That is your plan now.</p>}
    </Card>
  )
}

// Only what moved earns a row. Colour says whether the move helped — a smaller corpus, a
// smaller SIP or an earlier age is green; the other direction amber.
function diffRow(label, before, after, fmt, better) {
  if (before == null && after == null) return null
  const same = before != null && after != null && Math.abs(before - after) < 0.005
  if (same) return null
  const dir = before == null || after == null ? '' : (after > before ? 'up' : 'down')
  const good = dir === '' ? null : (better === 'down' ? dir === 'down' : dir === 'up')
  return (
    <div key={label} className="flex items-center justify-between gap-4 text-sm">
      <span className="text-ink-400">{label}</span>
      <b className={`money ${good == null ? '' : good ? 'text-emerald-600' : 'text-amber-600'}`}>
        {before == null ? '—' : fmt(before)} → {after == null ? '—' : fmt(after)}
      </b>
    </div>
  )
}
