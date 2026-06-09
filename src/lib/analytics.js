// Analítica propia (ligera): envía eventos al backend para el embudo del dashboard.
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Identificador anónimo persistente del visitante.
const sid = () => {
  try {
    let s = localStorage.getItem('ws_sid')
    if (!s) {
      s = (crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2))
      localStorage.setItem('ws_sid', s)
    }
    return s
  } catch { return 'anon' }
}

// Fuente de tráfico: utm_source o el host del referrer (se calcula una vez).
const source = () => {
  try {
    const p = new URLSearchParams(location.search)
    const utm = p.get('utm_source')
    if (utm) return utm
    if (document.referrer) {
      const h = new URL(document.referrer).hostname
      if (h && !h.includes(location.hostname)) return h
    }
  } catch { /* noop */ }
  return 'directo'
}

export const track = (name, meta = {}) => {
  try {
    fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        path: location.pathname,
        sessionId: sid(),
        source: source(),
        referrer: document.referrer || '',
        meta,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* la analítica nunca rompe la UI */ }
}

export const trackPageview = (path) => track('pageview', { path })
