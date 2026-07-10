import { useRef, useState } from 'react'

// CAS (Consolidated Account Statement) PDF import — parses CAMS/KFintech CAS
// entirely in the browser (pdf.js). No data leaves the device.
// Calls onImport([{ name, value }]) with one entry per mutual fund scheme.

async function extractLines(file, password) {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf, password }).promise
  const lines = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    // Group text items into lines by their y position.
    const rows = new Map()
    for (const item of content.items) {
      const y = Math.round(item.transform[5])
      if (!rows.has(y)) rows.set(y, [])
      rows.get(y).push(item)
    }
    const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0])
    for (const [, items] of sorted) {
      items.sort((a, b) => a.transform[4] - b.transform[4])
      const line = items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
      if (line) lines.push(line)
    }
  }
  return lines
}

const toNum = (s) => Number(String(s).replace(/,/g, '')) || 0

// Best-effort parser for CAMS / KFintech CAS text.
export function parseCas(lines) {
  const funds = []
  let lastScheme = null

  const schemeRe = /(fund|scheme|plan|elss|flexi|bluechip|midcap|smallcap|index|liquid|gilt|hybrid)/i
  const junkRe = /(consolidated account statement|portfolio summary|page \d|date transaction|opening unit|closing unit|folio no|pan[ :]|email|mobile|total$)/i

  for (const raw of lines) {
    const line = raw.trim()

    // Track the most recent plausible scheme-name line.
    if (schemeRe.test(line) && !junkRe.test(line) && !/^(total|grand total)/i.test(line) && line.length > 12) {
      // Strip leading scheme codes like "128TSDGG-" and trailing "(Advisor: ...)".
      lastScheme = line
        .replace(/^[A-Z0-9]{4,}\s*-\s*/i, '')
        .replace(/\(?advisor.*$/i, '')
        .replace(/registrar.*$/i, '')
        .replace(/-\s*isin.*$/i, '')
        .trim()
    }

    // Valuation / market value anchors.
    const val = line.match(/(?:valuation|market value)\s*(?:on|as on)?\s*[\d]{1,2}[-/][A-Za-z0-9]{2,3}[-/][\d]{2,4}\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/i)
    if (val && lastScheme) {
      const value = toNum(val[1])
      if (value > 0) {
        funds.push({ name: lastScheme.slice(0, 60), value })
        lastScheme = null
      }
      continue
    }

    // Portfolio-summary style rows: "<Fund Name> <cost> <market value>" (two amounts at end).
    const sum = line.match(/^(.{12,}?(?:fund|scheme|plan)[^\d]*)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/i)
    if (sum && !junkRe.test(line)) {
      const value = toNum(sum[3])
      if (value > 0) funds.push({ name: sum[1].trim().slice(0, 60), value })
    }
  }

  // Dedupe by name, keep the larger value (detail sections repeat schemes).
  const byName = new Map()
  for (const f of funds) {
    const key = f.name.toLowerCase()
    if (!byName.has(key) || byName.get(key).value < f.value) byName.set(key, f)
  }
  return [...byName.values()]
}

export default function CasImport({ onImport }) {
  const fileRef = useRef(null)
  const [state, setState] = useState('idle') // idle | password | parsing | done | error
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [count, setCount] = useState(0)

  async function parse(f, pwd) {
    setState('parsing')
    setError('')
    try {
      const lines = await extractLines(f, pwd || undefined)
      const funds = parseCas(lines)
      if (!funds.length) {
        setState('error')
        setError('Could not read any funds from this PDF. Please enter values manually below.')
        return
      }
      setCount(funds.length)
      setState('done')
      onImport(funds)
    } catch (err) {
      if (err?.name === 'PasswordException') {
        setState('password')
        if (pwd) setError('Wrong password — CAS password is usually your PAN (capital letters).')
      } else {
        setState('error')
        setError('Could not read this PDF. Please enter values manually below.')
      }
    }
  }

  function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPassword('')
    parse(f, '')
  }

  return (
    <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/40 dark:bg-brand-500/5 p-3">
      {state !== 'done' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold">📄 Import from CAS statement</div>
              <div className="text-[11px] text-ink-400 mt-0.5">CAMS / KFintech PDF — parsed on your device, nothing is uploaded</div>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-primary !py-1.5 text-xs shrink-0" disabled={state === 'parsing'}>
              {state === 'parsing' ? 'Reading…' : 'Upload PDF'}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
        </>
      )}

      {state === 'password' && file && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value.toUpperCase())}
            placeholder="PDF password (usually your PAN)"
            className="input !py-1.5 text-sm flex-1"
          />
          <button type="button" onClick={() => parse(file, password)} className="btn-primary !py-1.5 text-xs shrink-0">Unlock</button>
        </div>
      )}

      {state === 'done' && (
        <div className="text-sm font-semibold text-emerald-600">✓ {count} mutual fund{count > 1 ? 's' : ''} imported from CAS</div>
      )}

      {error && <p className="text-xs text-rose-600 font-medium mt-2">{error}</p>}
    </div>
  )
}
