import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const RISK_META = {
  ACTIVE:      { bg: 'rgba(239,68,68,.12)',   color: '#ef4444', border: 'rgba(239,68,68,.25)',   icon: 'ti-alert-triangle', label: 'ACTIVE' },
  IMMINENT:    { bg: 'rgba(249,115,22,.12)',   color: '#f97316', border: 'rgba(249,115,22,.25)', icon: 'ti-flame',          label: 'IMMINENT' },
  ESCALATING:  { bg: 'rgba(245,158,11,.12)',   color: '#f59e0b', border: 'rgba(245,158,11,.25)', icon: 'ti-trending-up',    label: 'ESCALATING' },
  MONITORING:  { bg: 'rgba(59,130,246,.10)',   color: '#3b82f6', border: 'rgba(59,130,246,.2)',  icon: 'ti-eye',            label: 'MONITORING' },
  STABLE:      { bg: 'rgba(29,233,182,.08)',   color: '#1de9b6', border: 'rgba(29,233,182,.15)', icon: 'ti-check',          label: 'STABLE' },
}

const THREAT_META = {
  CRITICAL: { color: '#ef4444', glow: 'rgba(239,68,68,.3)', level: 5 },
  HIGH:     { color: '#f97316', glow: 'rgba(249,115,22,.3)', level: 4 },
  ELEVATED: { color: '#f59e0b', glow: 'rgba(245,158,11,.3)', level: 3 },
  GUARDED:  { color: '#3b82f6', glow: 'rgba(59,130,246,.3)', level: 2 },
  LOW:      { color: '#1de9b6', glow: 'rgba(29,233,182,.3)', level: 1 },
}

export default function Predictions() {
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [filter, setFilter]     = useState('ALL')

  const load = async () => {
    try {
      const f = await api.getForecast()
      setForecast(f)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <LoadingState />

  const threat = forecast ? THREAT_META[forecast.threat_label] || THREAT_META.LOW : THREAT_META.LOW
  const predictions = forecast?.predictions || []

  const filtered = filter === 'ALL'
    ? predictions
    : predictions.filter(p => p.risk_level === filter)

  const riskCounts = predictions.reduce((acc, p) => {
    acc[p.risk_level] = (acc[p.risk_level] || 0) + 1
    return acc
  }, {})

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>
            AI Outbreak Forecast
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            6-hour trajectory predictions per zone · Exponential trend extrapolation · Real-time
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'var(--navy3)', color: 'var(--text2)', border: '1px solid var(--border2)', cursor: 'pointer' }}>
          <i className="ti ti-refresh" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}

      {forecast && (
        <>
          {/* Threat Level Banner */}
          <div style={{
            background: `linear-gradient(135deg, ${threat.color}14 0%, var(--navy2) 100%)`,
            border: `1px solid ${threat.color}40`,
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
            boxShadow: `0 0 40px ${threat.glow}`,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', marginBottom: 6 }}>
                Current Threat Level
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, color: threat.color, letterSpacing: '-2px', lineHeight: 1 }}>
                {forecast.threat_label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8, maxWidth: 400, lineHeight: 1.6 }}>
                {forecast.summary}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <StatBox label="Active zones" value={forecast.hexes_active} color="#ef4444" />
              <StatBox label="Imminent zones" value={forecast.hexes_imminent} color="#f97316" />
              <StatBox label="Max now" value={`${forecast.max_confidence_now}%`} color={threat.color} />
              <StatBox label="Max in 6h" value={`${forecast.max_confidence_6h}%`} color={threat.color} />
            </div>
            {/* Threat level bar */}
            <div style={{ width: '100%', marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 600, letterSpacing: '.5px' }}>
                <span>LOW</span><span>GUARDED</span><span>ELEVATED</span><span>HIGH</span><span>CRITICAL</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--navy3)', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  width: `${(threat.level / 5) * 100}%`,
                  borderRadius: 4,
                  background: `linear-gradient(90deg, #1de9b6, ${threat.color})`,
                  boxShadow: `0 0 12px ${threat.glow}`,
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Risk summary pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['ALL', 'ACTIVE', 'IMMINENT', 'ESCALATING', 'MONITORING', 'STABLE'].map(r => {
              const meta = r === 'ALL' ? null : RISK_META[r]
              const count = r === 'ALL' ? predictions.length : (riskCounts[r] || 0)
              const isActive = filter === r
              return (
                <button key={r} onClick={() => setFilter(r)} style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? (meta?.color || 'var(--teal)') : 'var(--border2)'}`,
                  background: isActive ? (meta?.bg || 'rgba(29,233,182,.1)') : 'var(--navy2)',
                  color: isActive ? (meta?.color || 'var(--teal)') : 'var(--text3)',
                  transition: 'all .15s',
                }}>
                  {r} {count > 0 && <span style={{ marginLeft: 4, opacity: .7 }}>{count}</span>}
                </button>
              )
            })}
          </div>

          {/* Prediction cards */}
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 13 }}>
                No zones with {filter} risk level.
              </div>
            ) : (
              filtered.map(p => <PredictionCard key={p.hex_id} p={p} />)
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PredictionCard({ p }) {
  const meta = RISK_META[p.risk_level] || RISK_META.STABLE
  const maxConf = Math.max(p.confidence_now, p.confidence_6h)

  return (
    <div style={{
      background: 'var(--navy2)',
      border: `1px solid ${p.will_alert ? meta.border : 'var(--border)'}`,
      borderRadius: 12,
      padding: '18px 20px',
      boxShadow: p.will_alert ? `0 0 20px ${meta.color}18` : 'none',
      transition: 'all .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            {p.district}
            {p.will_alert && (
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,.15)', color: '#ef4444', padding: '2px 8px', borderRadius: 20, letterSpacing: '.5px' }}>
                ⚠ ALERT IN 6H
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            <i className={`ti ${meta.icon}`} style={{ marginRight: 4 }} />
            {p.dominant_symptom} · {p.report_count} reports · velocity: +{p.velocity}/2h
          </div>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
          {meta.label}
        </span>
      </div>

      {/* Trajectory bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Now', value: p.confidence_now, isNow: true },
          { label: '+2h',  value: p.confidence_2h },
          { label: '+4h',  value: p.confidence_4h },
          { label: '+6h',  value: p.confidence_6h, isFinal: true },
        ].map(({ label, value, isNow, isFinal }) => {
          const barColor = value >= 80 ? '#ef4444' : value >= 60 ? '#f97316' : value >= 40 ? '#f59e0b' : '#1de9b6'
          return (
            <div key={label} style={{
              background: isFinal && p.will_alert ? 'rgba(239,68,68,.05)' : 'var(--navy3)',
              borderRadius: 8,
              padding: '10px 12px',
              border: `1px solid ${isFinal && p.will_alert ? 'rgba(239,68,68,.2)' : 'var(--border)'}`,
            }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, letterSpacing: '.4px', marginBottom: 6, textTransform: 'uppercase' }}>
                {label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: barColor, letterSpacing: '-0.5px', marginBottom: 6 }}>
                {value.toFixed(1)}%
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--navy4)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${value}%`,
                  borderRadius: 2,
                  background: barColor,
                  boxShadow: isFinal && value >= 80 ? `0 0 8px ${barColor}` : 'none',
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Alert threshold line indicator */}
      {(p.confidence_now >= 40 || p.confidence_6h >= 40) && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, transparent, var(--border2))' }} />
          <span>80% alert threshold</span>
          <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, var(--border2), transparent)' }} />
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', background: 'var(--navy3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', minWidth: 80 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
      <i className="ti ti-brain" style={{ fontSize: 36, color: 'var(--teal)', display: 'block', marginBottom: 12 }} />
      Running outbreak trajectory model...
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
