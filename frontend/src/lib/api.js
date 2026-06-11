const BASE = '/api'

async function apiFetch(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  /** Submit an anonymous report. Returns { anon_id, confidence_contribution, ... } */
  submitReport: (district, symptoms, freeText = '') =>
    apiFetch('/report', {
      method: 'POST',
      body: JSON.stringify({ district, symptoms, free_text: freeText }),
    }),

  /** Get all signals (optionally filtered by district) */
  getSignals: (district = null) =>
    apiFetch('/signals' + (district ? `?district=${encodeURIComponent(district)}` : '')),

  /** Get heatmap data — one entry per H3 Hex */
  getHeatmap: () => apiFetch('/heatmap'),

  /** Get timeline data for outbreak playback */
  getTimeline: () => apiFetch('/timeline'),

  /** Get dashboard stats */
  getStats: () => apiFetch('/stats'),

  /** Get recent anonymous reports */
  getRecentReports: (limit = 20) => apiFetch(`/reports/recent?limit=${limit}`),

  /** Get 6-hour hex-level outbreak predictions */
  getPredictions: () => apiFetch('/predictions'),

  /** Get overall outbreak trajectory forecast */
  getForecast: () => apiFetch('/forecast'),

  /** Get live Google Trends scores */
  getTrends: () => apiFetch('/trends'),

  /** Get WHO/IDSP ground truth data */
  getGroundTruth: (district = null) =>
    apiFetch('/groundtruth' + (district ? `?district=${encodeURIComponent(district)}` : '')),
}
