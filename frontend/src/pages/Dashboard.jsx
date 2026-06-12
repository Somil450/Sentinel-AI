import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler)

const STATUS = {
  strong:   { label: 'Strong signal', bg: 'rgba(29,233,182,.1)',  color: '#1de9b6', border: 'rgba(29,233,182,.2)',  dot: '#1de9b6' },
  emerging: { label: 'Emerging',       bg: 'rgba(245,158,11,.1)', color: '#f59e0b', border: 'rgba(245,158,11,.2)',  dot: '#f59e0b' },
  noise:    { label: 'Noise',           bg: 'rgba(100,122,148,.08)', color: '#647a94', border: 'rgba(100,122,148,.15)', dot: '#647a94' },
}

const CONF_COLOR = (c) => c >= 70 ? '#ef4444' : c >= 40 ? '#f59e0b' : '#1de9b6'

export default function Dashboard() {
  const [signals, setSignals] = useState([])
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const pollRef = useRef(null)

  const load = async () => {
    try {
      const [sigs, st, rec] = await Promise.all([
        api.getSignals(),
        api.getStats(),
        api.getRecentReports(10),
      ])
      setSignals(sigs)
      setStats(st)
      setRecent(rec)
      setError(null)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 8000)
    return () => clearInterval(pollRef.current)
  }, [])

  const genuine = signals.filter(s => s.confidence >= 20)
  const topConf = signals.length ? Math.max(...signals.map(s => s.confidence)) : 0

  const confChartData = {
    labels: signals.slice(0, 12).map(s => s.district.split(' ')[0]),
    datasets: [{
      label: 'Confidence %',
      data: signals.slice(0, 12).map(s => s.confidence),
      borderColor: '#1de9b6',
      backgroundColor: 'rgba(29,233,182,.06)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: signals.slice(0, 12).map(s => CONF_COLOR(s.confidence)),
      pointBorderColor: 'transparent',
      pointBorderWidth: 0,
    }]
  }

  const compChartData = {
    labels: ['Genuine reports', 'Spam blocked', 'Unclassified'],
    datasets: [{
      data: stats ? [
        stats.total_reports_24h,
        stats.spam_blocked,
        Math.floor(stats.total_reports_24h * 0.12),
      ] : [0, 0, 0],
      backgroundColor: ['#1de9b6', '#1a2d4a', '#f59e0b'],
      borderWidth: 0,
      hoverOffset: 6,
    }]
  }

  if (loading) return <LoadingState />

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.7px', lineHeight: 1.1 }}>
            Signal Intelligence Feed
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 5, letterSpacing: '0.1px' }}>
            Humans are the sensors · AI is the validation layer · Real-time confidence engine
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'var(--navy3)', color: 'var(--text2)', border: '1px solid var(--border2)', transition: 'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--teal3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
          >
            <i className="ti ti-refresh" /> Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner msg={error} />}

      {/* Alert Banner */}
      {stats?.alert_triggered && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,.1) 0%, rgba(249,115,22,.06) 100%)',
          border: '1px solid rgba(239,68,68,.3)',
          borderRadius: 14,
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 22,
          boxShadow: '0 0 30px rgba(239,68,68,0.08)',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: '#ef4444' }} />
            </div>
            <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1.5px solid rgba(239,68,68,0.3)', animation: 'pulse 2s infinite' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', marginBottom: 3, letterSpacing: '-0.3px' }}>
              ⚠ Emerging Health Event Detected
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
              Confidence threshold 80% crossed — signals escalated for public health review. No disease claim; pattern validation only.
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444', letterSpacing: '-1.5px', lineHeight: 1 }}>{topConf.toFixed(1)}%</div>
            <div style={{ fontSize: 10, color: '#ef4444', opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 }}>Top signal</div>
          </div>
        </div>
      )}

      {/* Metrics */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
          <MetricCard
            icon="ti-radar"
            label="Active Signals"
            value={stats.active_signals.toLocaleString()}
            sub={`${stats.genuine_count} genuine · ${stats.noise_count} noise`}
            color="#1de9b6"
            glow="rgba(29,233,182,.08)"
          />
          <MetricCard
            icon="ti-file-description"
            label="Reports (24h)"
            value={stats.total_reports_24h.toLocaleString()}
            sub="Genuine, deduplicated"
            color="#3b82f6"
            glow="rgba(59,130,246,.06)"
          />
          <MetricCard
            icon="ti-shield-lock"
            label="Spam Blocked"
            value={stats.spam_blocked.toLocaleString()}
            sub="Duplicates + misinformation"
            color="#f59e0b"
            glow="rgba(245,158,11,.06)"
          />
          <MetricCard
            icon="ti-activity"
            label="Top Confidence"
            value={`${topConf.toFixed(1)}%`}
            sub={stats.alert_triggered ? '⚠ Alert threshold crossed' : 'Below alert threshold (80%)'}
            color={stats.alert_triggered ? '#ef4444' : 'var(--text2)'}
            glow={stats.alert_triggered ? 'rgba(239,68,68,.06)' : 'transparent'}
          />
        </div>
      )}

      {/* Signals Table */}
      <div style={cardStyle}>
        <div style={cardHeadStyle}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ti ti-radar" style={{ fontSize: 15, color: 'var(--teal)' }} />
            Signal Detection Board
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)' }}>— Real AI Confidence Scores</span>
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--navy4)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border2)' }}>
            {signals.length} signals
          </span>
        </div>
        {/* Header row */}
        <div style={{ ...rowStyle, background: 'var(--navy3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text3)' }}>
          <span>Signal</span><span>Confidence</span><span>Sources</span><span>Reports</span><span>Status</span>
        </div>
        <div className="custom-scrollbar" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {signals.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              <i className="ti ti-radar" style={{ fontSize: 28, color: 'var(--teal)', display: 'block', marginBottom: 10, opacity: 0.5 }} />
              No signals yet. Submit the first report to start the engine.
            </div>
          ) : (
            signals.map(sig => <SignalRow key={sig.id} sig={sig} />)
          )}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={cardStyle}>
          <div style={cardHeadStyle}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="ti ti-trending-up" style={{ color: '#3b82f6' }} />
              Confidence by District
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Top 12 signals</span>
          </div>
          <div style={{ padding: 16, height: 230, position: 'relative' }}>
            {signals.length > 0 ? (
              <Line data={confChartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: {
                  backgroundColor: 'rgba(8,15,30,0.9)',
                  borderColor: 'rgba(30,48,80,0.8)',
                  borderWidth: 1,
                  titleColor: '#b0c0d4',
                  bodyColor: '#e4ecf8',
                  padding: 10,
                  cornerRadius: 8,
                }},
                scales: {
                  x: { grid: { color: 'rgba(255,255,255,.03)' }, ticks: { color: '#647a94', font: { size: 10 } } },
                  y: { grid: { color: 'rgba(255,255,255,.03)' }, min: 0, max: 100,
                    ticks: { callback: v => v + '%', color: '#647a94', font: { size: 10 } } }
                }
              }} />
            ) : <EmptyChart />}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardHeadStyle}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="ti ti-chart-donut" style={{ color: '#f59e0b' }} />
              Report Composition
            </span>
          </div>
          <div style={{ padding: 16, height: 230, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {stats ? (
              <>
                <div style={{ height: 170, width: '100%', position: 'relative' }}>
                  <Doughnut data={compChartData} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(8,15,30,0.9)',
                        borderColor: 'rgba(30,48,80,0.8)',
                        borderWidth: 1,
                        titleColor: '#b0c0d4',
                        bodyColor: '#e4ecf8',
                        padding: 10,
                        cornerRadius: 8,
                      }
                    },
                    cutout: '68%',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[['#1de9b6', 'Genuine'], ['#1a2d4a', 'Spam'], ['#f59e0b', 'Unclassified']].map(([c, l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block', boxShadow: `0 0 6px ${c}` }} />{l}
                    </span>
                  ))}
                </div>
              </>
            ) : <EmptyChart />}
          </div>
        </div>
      </div>

      {/* Recent Reports Feed */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={cardHeadStyle}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ti ti-activity" style={{ fontSize: 15, color: 'var(--teal)' }} />
            Recent Anonymous Reports
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Auto-refreshes every 8s</span>
        </div>
        <div className="custom-scrollbar" style={{ maxHeight: '280px', overflowY: 'auto' }}>
          {recent.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No reports yet.
            </div>
          ) : (
            recent.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)', fontSize: 12, transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--navy3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: 'var(--teal3)', fontFamily: 'monospace', fontSize: 10, minWidth: 70, fontWeight: 600 }}>#{r.anon_id.slice(0,8)}</span>
                <span style={{ color: 'var(--text2)', minWidth: 120, fontWeight: 500, fontSize: 12 }}>{r.district}</span>
                <span style={{ color: 'var(--text3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.symptoms.join(', ')}</span>
                <span style={{ color: 'var(--text3)', fontSize: 11, fontFamily: 'monospace' }}>{new Date(r.timestamp).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SignalRow({ sig }) {
  const s = STATUS[sig.status] || STATUS.noise
  const cc = CONF_COLOR(sig.confidence)
  return (
    <div style={{ ...rowStyle, transition: 'background .15s', cursor: 'default' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--navy3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.2px' }}>{sig.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sig.symptoms.slice(0, 3).join(' · ')}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--navy4)', overflow: 'hidden', minWidth: 60 }}>
          <div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${cc}88, ${cc})`, width: sig.confidence + '%', transition: 'width 1.2s ease', boxShadow: sig.confidence >= 70 ? `0 0 8px ${cc}` : 'none' }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: cc, minWidth: 44, letterSpacing: '-0.3px' }}>{sig.confidence.toFixed(1)}%</span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{sig.sources.join(' + ')}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>{sig.report_count.toLocaleString()}</span>
      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
        {s.label}
      </span>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, color, glow }) {
  return (
    <div style={{
      background: 'var(--navy2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '16px 18px',
      boxShadow: glow !== 'transparent' ? `inset 0 0 30px ${glow}` : 'none',
      transition: 'transform .2s, box-shadow .2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `inset 0 0 40px ${glow}, 0 4px 20px rgba(0,0,0,0.2)` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = glow !== 'transparent' ? `inset 0 0 30px ${glow}` : 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text3)' }}>{label}</div>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color, opacity: 0.7 }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1.5px', color, lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{sub}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: 64, textAlign: 'center', color: 'var(--text3)' }}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
        <i className="ti ti-radar" style={{ fontSize: 40, color: 'var(--teal)', display: 'block' }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>Connecting to signal engine...</div>
    </div>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
      <i className="ti ti-wifi-off" style={{ flexShrink: 0 }} />
      <div>Backend not reachable: {msg} — start the FastAPI server with <code style={{ background: 'rgba(0,0,0,.3)', padding: '1px 6px', borderRadius: 4 }}>uvicorn main:app --reload</code></div>
    </div>
  )
}

function EmptyChart() {
  return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>No data yet</div>
}

const cardStyle = {
  background: 'var(--navy2)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  overflow: 'hidden',
}
const cardHeadStyle = {
  padding: '14px 20px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}
const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 180px 150px 80px 120px',
  alignItems: 'center',
  gap: 12,
  padding: '12px 20px',
  borderBottom: '1px solid var(--border)',
}
