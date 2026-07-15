// Some Android WebViews inflate web text — either WebSettings textZoom (system
// font scale) or "font boosting" — which blows the fixed mobile layout past the
// screen. The native shell pins textZoom to 100 and index.css disables font
// boosting, but as a final guard we detect any residual inflation by comparing
// DOM text width against canvas metrics (canvas ignores both mechanisms) and
// counter-scale the root font size. Inflation can land AFTER first paint, so
// the check re-runs a few times and is fully idempotent.
function measureZoom() {
  const probe = document.createElement('span')
  probe.textContent = 'MMMMMMMMMM'
  probe.style.cssText =
    'position:absolute;visibility:hidden;white-space:pre;font:16px monospace;padding:0;border:0;letter-spacing:0'
  document.body.appendChild(probe)
  const domWidth = probe.getBoundingClientRect().width
  document.body.removeChild(probe)

  const ctx = document.createElement('canvas').getContext('2d')
  ctx.font = '16px monospace'
  const canvasWidth = ctx.measureText('MMMMMMMMMM').width
  if (!domWidth || !canvasWidth) return 1
  return domWidth / canvasWidth
}

function apply() {
  try {
    // Measure against an uncompensated baseline, then re-apply compensation.
    document.documentElement.style.fontSize = ''
    const zoom = measureZoom()
    document.documentElement.style.fontSize = zoom > 1.05 ? `${(100 / zoom).toFixed(2)}%` : ''
  } catch {
    /* never block app start over a guard */
  }
}

export function guardTextZoom() {
  apply()
  window.addEventListener('load', apply)
  // Inflation sometimes applies after layout settles — sweep a few times.
  setTimeout(apply, 500)
  setTimeout(apply, 1500)
  setTimeout(apply, 3500)
}
