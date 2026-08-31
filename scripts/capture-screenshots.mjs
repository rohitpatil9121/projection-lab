/**
 * Captures Play Store screenshots (9:16) from the running dev server.
 *
 * Drives the installed Chrome over the DevTools protocol rather than adding a
 * Playwright/Puppeteer dependency for a task that runs once per release.
 *
 * Usage: npm run dev -w web, then: node scripts/capture-screenshots.mjs
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.SHOT_BASE_URL || 'http://localhost:5173'
const PORT = 9333
const CHROME_PROFILE = path.join(ROOT, '.tmp-shot-profile')

/**
 * Play wants three sets, all 9:16, each with its own pixel floor:
 *   phone   — 320–3840 per side
 *   7-inch  — 320–3840 per side
 *   10-inch — 1080–7680 per side
 *
 * Each profile emulates a CSS viewport at a DPR rather than a literal pixel width:
 * at 1080 CSS px the app renders its DESKTOP layout, which is not what a phone user
 * sees. The tablet profiles use CSS widths above the md: breakpoint on purpose —
 * that sidebar layout IS what a tablet user gets.
 */
// CSS width must be divisible by 9 so width*16/9 lands on a whole pixel — Play
// rejects anything that isn't exactly 16:9 or 9:16, and 600x1067 rounds to 1.7783.
const PROFILES = {
  phone: { css: [360, 640], dpr: 3, dir: 'screenshots' },
  'tablet-7': { css: [720, 1280], dpr: 2, dir: 'screenshots-tablet-7' },
  'tablet-10': { css: [900, 1600], dpr: 2, dir: 'screenshots-tablet-10' },
}
const PROFILE = PROFILES[process.env.SHOT_PROFILE || 'phone']
if (!PROFILE) { console.error(`Unknown SHOT_PROFILE. Use: ${Object.keys(PROFILES).join(', ')}`); process.exit(1) }
const [CSS_WIDTH, CSS_HEIGHT] = PROFILE.css
const DPR = PROFILE.dpr
const WIDTH = CSS_WIDTH * DPR
const HEIGHT = CSS_HEIGHT * DPR
const OUT = path.join(ROOT, 'store-assets', PROFILE.dir)

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => existsSync(p))
if (!CHROME) { console.error('Chrome not found'); process.exit(1) }

const SHOTS = [
  { name: '1-today', path: '/', wait: 2600 },
  { name: '2-plan', path: '/plan', wait: 2600 },
  { name: '3-goals', path: '/milestones', wait: 2600 },
  { name: '4-accounts', path: '/accounts', wait: 2600 },
  { name: '5-monte-carlo', path: '/monte-carlo', wait: 3200 },
  { name: '6-cash-flow', path: '/cash-flow', wait: 2600 },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function cdpTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  return res.json()
}

/** Minimal CDP client — one WebSocket, sequential commands. */
async function connect(wsUrl) {
  const ws = new globalThis.WebSocket(wsUrl) // Node 22+ ships WebSocket globally
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  }
  const send = (method, params = {}) => new Promise((resolve) => {
    const myId = ++id
    pending.set(myId, resolve)
    ws.send(JSON.stringify({ id: myId, method, params }))
  })
  return { send, close: () => ws.close() }
}

async function main() {
  // Fail loudly if the dev server is down. Without this the script happily captures
  // Chrome's "site can't be reached" page: correct dimensions, plausible file size,
  // and completely unusable — which is exactly what shipped to the store folder once.
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    console.error(`\nDev server not reachable at ${BASE} (${err.message}).`)
    console.error('Start it first:  npm run dev -w web\n')
    process.exit(1)
  }

  mkdirSync(OUT, { recursive: true })
  rmSync(CHROME_PROFILE, { recursive: true, force: true })

  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${CHROME_PROFILE}`,
    '--headless=new',
    '--hide-scrollbars',
    `--window-size=${WIDTH},${HEIGHT}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ], { stdio: 'ignore' })

  let failed = 0
  try {
    // Wait for the debugging endpoint.
    let targets
    for (let i = 0; i < 40; i++) {
      try { targets = await cdpTargets(); if (targets?.length) break } catch { /* not up yet */ }
      await sleep(250)
    }
    if (!targets?.length) throw new Error('Chrome DevTools endpoint never came up')

    const page = targets.find((t) => t.type === 'page')
    const cdp = await connect(page.webSocketDebuggerUrl)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: CSS_WIDTH, height: CSS_HEIGHT, deviceScaleFactor: DPR, mobile: true,
    })

    // Seed the app once: skip the landing splash and load the sample plan.
    await cdp.send('Page.navigate', { url: `${BASE}/onboarding` })
    await sleep(3000)
    await cdp.send('Runtime.evaluate', {
      expression: `sessionStorage.setItem('fb-landing-seen','1')`,
      awaitPromise: true,
    })
    const seed = await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const landing = document.querySelector('[role="presentation"]');
        if (landing) { [...landing.querySelectorAll('button')][0].click(); await sleep(1200); }
        if (!/Choose an example persona/i.test(document.body.innerText)) {
          const l = [...document.querySelectorAll('a,button')].find(e => /sample data|sample plan/i.test(e.innerText));
          if (l) { l.click(); await sleep(1600); }
        }
        const card = [...document.querySelectorAll('button')].find(b => /HNI, Wealth Preservation/.test(b.innerText));
        if (!card) return 'persona card not found: ' + document.body.innerText.slice(0,120);
        card.click(); await sleep(600);
        [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Confirm').click();
        await sleep(2500);
        return 'seeded at ' + location.pathname;
      })()`,
      awaitPromise: true, returnByValue: true,
    })
    console.log('seed:', seed.result?.result?.value)

    for (const shot of SHOTS) {
      await cdp.send('Page.navigate', { url: `${BASE}${shot.path}` })
      await sleep(shot.wait)
      // Settle any entrance animation before capturing.
      await cdp.send('Runtime.evaluate', { expression: 'window.scrollTo(0,0)' })
      await sleep(400)
      // Confirm the app actually rendered before capturing. A Chrome error page has
      // valid dimensions and a believable file size, so only the DOM gives it away.
      const check = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const t = document.body.innerText || '';
          if (/can.t be reached|refused to connect|ERR_/i.test(t)) return 'chrome-error';
          if (t.trim().length < 100) return 'near-empty';
          return 'ok';
        })()`,
        returnByValue: true,
      })
      const state = check.result?.result?.value
      if (state !== 'ok') { console.error(`  ✖ ${shot.name}: page did not render (${state})`); failed++; continue }

      const { result } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      if (!result?.data) { console.error(`  ✖ ${shot.name}: no image data`); failed++; continue }
      const file = path.join(OUT, `${shot.name}.png`)
      writeFileSync(file, Buffer.from(result.data, 'base64'))
      console.log(`  ✔ ${shot.name}.png`)
    }
    cdp.close()
  } finally {
    chrome.kill()
    // Chrome releases its profile lock asynchronously; deleting immediately throws
    // EPERM on Windows. Best effort — a stale temp profile is harmless.
    await sleep(1200)
    try { rmSync(CHROME_PROFILE, { recursive: true, force: true }) } catch { /* released later */ }
  }
  if (failed) {
    console.error(`\n${failed} screenshot(s) failed to render — do not use this set.`)
    process.exit(1)
  }
  console.log(`\nScreenshots in ${OUT} (${WIDTH}x${HEIGHT}, 9:16)`)
}

main().catch((err) => { console.error(err); process.exit(1) })
