import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const KEYWORD_COLORS = {
  'fever bhopal':        '#ef4444',
  'cough bhopal':        '#f59e0b',
  'dengue bhopal':       '#3b82f6',
  'viral fever bhopal':  '#ef4444',
  'flu symptoms':        '#f97316',
  'shortness of breath': '#a855f7',
  'vomiting diarrhea':   '#06b6d4',
  'malaria bhopal':      '#3b82f6',
}

const ALERT_META = {
  none:     { color: '#6b7f96', bg: 'rgba(107,127,150,.1)',  label: 'None'     },
  watch:    { color: '#f59e0b', bg: 'rgba(245,158,11,.1)',   label: 'Watch'    },
  alert:    { color: '#f97316', bg: 'rgba(249,115,22,.1)',   label: 'Alert'    },
  outbreak: { color: '#ef4444', bg: 'rgba(239,68,68,.1)',    label: 'Outbreak' },
}

export default function Intelligence() {
  const [trends, setTrends]     = useState(null)
  const [idsp, setIdsp]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = async () => {
    try {
      const [tr, gt] = await Promise.all([api.getTrends(), api.getGroundTruth()])
      setTrends(tr)
      setIdsp(gt)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <LoadingState />

  const keywords = trends?.keywords || {}
  const keyList  = Object.entries(keywords).sort((a, b) => b[1] - a[1])
  const idspRecs = idsp?.idsp_records || []
  const outbreaks = idspRecs.filter(r => r.alert_level !== 'none')

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>
            Data Intelligence
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Google Trends surveillance · WHO/IDSP ground truth · Madhya Pradesh, India
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'var(--navy3)', color: 'var(--text2)', border: '1px solid var(--border2)', cursor: 'pointer' }}>
          <i className="ti ti-refresh" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Google Trends Panel */}
        <div>
          <Card title="Google Trends — Live Keyword Signals" icon="ti-brand-google" iconColor="var(--teal)">
            {trends && (
              <div style={{ padding: '16px 20px' }}>
                {/* Aggregate score */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', background: 'var(--navy3)', borderRadius: 10, border: '1px solid var(--border2)' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>
                      Aggregate Trends Score
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{trends.geo} · {trends.source}</div>
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--teal)', letterSpacing: '-1px' }}>
                    {trends.trends_score}
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text3)' }}>/100</span>
                  </div>
                </div>

                {/* Keyword bars */}
                <div className="custom-scrollbar" style={{ display: 'grid', gap: 10, maxHeight: '280px', overflowY: 'auto', paddingRight: '8px' }}>
                  {keyList.map(([kw, score]) => {
                    const color = KEYWORD_COLORS[kw] || '#8899aa'
                    return (
                      <div key={kw}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                          <span style={{ color: 'var(--text2)', fontWeight: 500 }}>
                            <i className="ti ti-trending-up" style={{ marginRight: 5, color, fontSize: 11 }} />
                            {kw}
                          </span>
                          <span style={{ color, fontWeight: 700 }}>{score}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'var(--navy3)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${score}%`,
                            borderRadius: 3,
                            background: `linear-gradient(90deg, ${color}99, ${color})`,
                            transition: 'width 1s ease',
                            boxShadow: score > 70 ? `0 0 8px ${color}88` : 'none',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(29,233,182,.05)', border: '1px solid rgba(29,233,182,.1)', borderRadius: 8, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
                  <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--teal)' }} />
                  Refreshed every 30 minutes via pytrends. High scores (&gt;70) indicate surging public interest in disease-related queries — a leading indicator of outbreaks.
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* IDSP Ground Truth Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="WHO / IDSP Ground Truth" icon="ti-building-hospital" iconColor="var(--amber)">
            <div style={{ padding: '14px 20px' }}>
              {/* Summary row */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {['outbreak', 'alert', 'watch', 'none'].map(level => {
                  const m = ALERT_META[level]
                  const count = idspRecs.filter(r => r.alert_level === level).length
                  return (
                    <div key={level} style={{ flex: 1, minWidth: 70, background: m.bg, border: `1px solid ${m.color}30`, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{count}</div>
                      <div style={{ fontSize: 10, color: m.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.label}</div>
                    </div>
                  )
                })}
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text3)', marginBottom: 10 }}>
                Active Alerts &amp; Outbreaks
              </div>

              {outbreaks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
                  <i className="ti ti-check-circle" style={{ fontSize: 24, color: 'var(--teal)', display: 'block', marginBottom: 6 }} />
                  No active outbreaks in IDSP records
                </div>
              ) : (
                <div className="custom-scrollbar" style={{ display: 'grid', gap: 8, maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                  {outbreaks.map((r, i) => {
                    const m = ALERT_META[r.alert_level]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--navy3)', borderRadius: 8, border: `1px solid ${m.color}25` }}>
                        <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, border: `1px solid ${m.color}30`, whiteSpace: 'nowrap' }}>
                          {m.label}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{r.district}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.disease}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: 'var(--text2)' }}>{r.confirmed_cases} confirmed</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Wk {r.week}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Full IDSP table */}
          <Card title="Complete IDSP Record" icon="ti-table" iconColor="var(--blue)">
            <div className="custom-scrollbar" style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: 'var(--navy3)' }}>
                    {['Wk', 'District', 'Disease', 'Suspected', 'Confirmed', 'Deaths', 'Level'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text3)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {idspRecs.map((r, i) => {
                    const m = ALERT_META[r.alert_level]
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--navy3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '9px 12px', color: 'var(--text3)' }}>{r.week}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--text2)', fontWeight: 500 }}>{r.district}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--text3)' }}>{r.disease}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--text2)' }}>{r.suspected_cases}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--text2)' }}>{r.confirmed_cases}</td>
                        <td style={{ padding: '9px 12px', color: r.deaths > 0 ? '#ef4444' : 'var(--text3)' }}>{r.deaths}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color }}>
                            {m.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)' }}>
              Source: IDSP — Integrated Disease Surveillance Programme, India · Coverage: {idsp?.coverage}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ title, icon, iconColor, children }) {
  return (
    <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color: iconColor }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
      <i className="ti ti-database" style={{ fontSize: 36, color: 'var(--amber)', display: 'block', marginBottom: 12 }} />
      Loading intelligence data...
    </div>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
      <i className="ti ti-wifi-off" style={{ marginRight: 6 }} />
      Backend not reachable: {msg}
    </div>
  )
}
