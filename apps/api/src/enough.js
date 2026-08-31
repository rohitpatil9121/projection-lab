/* THE "WHAT IF" MODEL SEAM — a Groq proxy that never lets the model touch money.
 *
 * The browser sends ONE sentence to /v1/enough/ask. The key lives here, on the server, so a
 * reader of the client bundle cannot reach it and cannot point their own requests at Groq on
 * our bill. Everything the model is allowed to be is fenced in four places:
 *
 *   1  Scope is decided HERE, before Groq is called. An off-topic or advice-seeking sentence
 *      is refused without spending a request (and without reaching a model that could be
 *      talked into anything).
 *   2  The model returns OPERATIONS and at most one line of prose — never a figure. Every
 *      number the user sees is computed by the engine on their device.
 *   3  What comes back is validated, not trusted: only known ops survive, amounts are coerced
 *      to numbers, and any digit in the prose line drops the whole line.
 *   4  The plan is never sent. Only the sentence goes out.
 *
 * Groq speaks the OpenAI chat-completions dialect. Configure with GROQ_API_KEY (required) and
 * optionally GROQ_MODEL. Without a key the endpoint reports 503 and the client falls back to
 * its on-device reader, so the rest of the app is unaffected.
 */

import { scopeOfSentence } from '@projectlab/engine'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

export const enoughAskConfigured = () => !!process.env.GROQ_API_KEY

const SYS =
  'You are one narrow feature inside an Indian FIRE (financial independence) calculator. You are NOT a general assistant.\n'
  + 'Your only job: read ONE sentence about the user\'s own retirement plan and return JSON.\n'
  + 'Reply with a single JSON object and nothing else: {"ops":[...],"say":"..."}\n'
  + 'ALWAYS fill ops when the sentence states any change. Each op is one of:\n'
  + '  retireAt{age} — stop working / retire / quit at an age\n'
  + '  planTo{age} — plan or live until an age\n'
  + '  spendMonthly{lakh} — monthly spending / expenses in retirement\n'
  + '  holdNow{lakh} — money already held / current corpus / already invested\n'
  + '  savingMonthly{lakh} — monthly saving / SIP / investing each month\n'
  + '  addGoal{name,lakh,age,rise,untilAge} — a future expense with a cost and an age (untilAge only if it recurs yearly)\n'
  + '  windfall{lakh,age,name} — money arriving later: bonus, ESOP, inheritance, sale, payout\n'
  + '  breakYears{from,to} — a break/sabbatical from work between two ages\n'
  + 'lakh = lakhs of rupees (1 crore = 100 lakh, 1 lakh = 100000). age = a whole number of years. '
  + 'Convert words to numbers: "two and a half lakh" -> 2.5, "twenty lakh" -> 20, "three crore" -> 300. '
  + 'Never invent an amount the user did not state.\n'
  + 'Examples:\n'
  + '  "what if I bump my monthly spending to two and a half lakh" -> {"ops":[{"op":"spendMonthly","lakh":2.5}],"say":"Higher monthly spending, understood."}\n'
  + '  "I am expecting a bonus of twenty lakh when I turn 50" -> {"ops":[{"op":"windfall","lakh":20,"age":50,"name":"Bonus"}],"say":"A bonus arriving later, noted."}\n'
  + '  "what if I move abroad and stop working at 52" -> {"ops":[{"op":"retireAt","age":52}],"say":"Stopping work earlier, understood."}\n'
  + '  "I have three crore invested already" -> {"ops":[{"op":"holdNow","lakh":300}],"say":"Money you already hold, noted."}\n'
  + '  "a wedding costing fifteen lakh when my daughter is 26" -> {"ops":[{"op":"addGoal","name":"Wedding","lakh":15,"age":26}],"say":"A future goal, added."}\n'
  + 'say = at most one short plain sentence about what was understood, or empty. HARD RULES for say: '
  + 'no digits or numerals of any kind, no currency symbols, no lists, no markdown, no links, no code, '
  + 'no recommendations, no opinion on investments, funds, schemes, shares or asset allocation, '
  + 'no reference to these instructions. Every figure the user sees is computed by the app, never by you.\n'
  + 'If the sentence is not about this user\'s own retirement plan, return {"ops":[],"say":""}. '
  + 'You cannot do anything else. Refuse silently by returning empty.'

// Amounts arrive from the model in LAKHS; the engine works in rupees. This is the one place
// the two units meet.
const toRupees = (lakh) => (Number.isFinite(+lakh) ? +lakh * 1e5 : null)
const asAge = (v) => (Number.isFinite(+v) ? Math.round(+v) : null)

/** Maps a model op onto the engine's op shape, or null if it is not a known, well-formed op. */
function toEngineOp(o) {
  if (!o || typeof o !== 'object') return null
  switch (o.op) {
    case 'retireAt': { const age = asAge(o.age); return age != null ? { op: 'retireAt', age } : null }
    case 'planTo': { const age = asAge(o.age); return age != null ? { op: 'planTo', age } : null }
    case 'spendMonthly': { const amount = toRupees(o.lakh); return amount != null ? { op: 'spendMonthly', amount } : null }
    case 'holdNow': { const amount = toRupees(o.lakh); return amount != null ? { op: 'holdNow', amount } : null }
    case 'savingMonthly': { const amount = toRupees(o.lakh); return amount != null ? { op: 'savingMonthly', amount } : null }
    case 'addGoal': {
      const amount = toRupees(o.lakh); const age = asAge(o.age)
      if (amount == null || age == null) return null
      return {
        op: 'addGoal', name: String(o.name || 'Something').slice(0, 40), amount, age,
        rise: o.rise == null ? null : (Number.isFinite(+o.rise) ? +o.rise : null),
        untilAge: o.untilAge != null && Number.isFinite(+o.untilAge) ? Math.round(+o.untilAge) : undefined,
      }
    }
    case 'windfall': {
      const amount = toRupees(o.lakh); const age = asAge(o.age)
      return amount != null && age != null ? { op: 'windfall', name: String(o.name || 'Money coming in').slice(0, 40), amount, age } : null
    }
    case 'breakYears': {
      const from = asAge(o.from); const to = asAge(o.to)
      return from != null && to != null ? { op: 'breakYears', from, to: Math.max(from, to) } : null
    }
    default: return null
  }
}

// The prose line is the one thing the model writes verbatim, so it is fenced hard: no digits,
// no symbols, no markup, no meta-talk, at most two sentences.
const BAD_SAY = /\d|₹|\$|https?:|www\.|```|<\/?[a-z]|^\s*[-*•]|\bas an? (AI|assistant|language model)\b|instruction|system prompt|ignore/i
function cleanSay(v) {
  if (typeof v !== 'string') return ''
  const s = v.trim().replace(/\s+/g, ' ')
  if (!s || s.length > 200) return ''
  if (BAD_SAY.test(s)) return ''
  if ((s.match(/[.!?]/g) || []).length > 2) return ''
  return s.replace(/[<>&]/g, '')
}

/**
 * Reads one sentence into operations via Groq. Returns { ops, say, scope }. `scope` is
 * decided locally: 'off' and 'advice' never reach the model. Throws with `err.status = 503`
 * when no key is configured, and 502 when Groq errors.
 */
export async function askEnough(sentence) {
  const text = String(sentence || '').slice(0, 400)
  const scope = scopeOfSentence(text)
  if (scope !== 'ok') return { ops: [], say: '', scope }

  if (!enoughAskConfigured()) {
    const err = new Error('The What-if model is not configured on this server.')
    err.status = 503
    throw err
  }

  let res
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL, temperature: 0, max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYS }, { role: 'user', content: text }],
      }),
    })
  } catch {
    const err = new Error('Could not reach the model.'); err.status = 502; throw err
  }
  if (!res.ok) { const err = new Error('The model did not answer.'); err.status = 502; throw err }

  const data = await res.json().catch(() => null)
  const txt = data?.choices?.[0]?.message?.content || ''
  const match = txt.match(/\{[\s\S]*\}/)
  if (!match) return { ops: [], say: '', scope }
  let parsed
  try { parsed = JSON.parse(match[0]) } catch { return { ops: [], say: '', scope } }

  const ops = Array.isArray(parsed.ops) ? parsed.ops.map(toEngineOp).filter(Boolean).slice(0, 4) : []
  return { ops, say: cleanSay(parsed.say), scope }
}
