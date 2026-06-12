import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Heatmap from './pages/Heatmap'
import ReportForm from './pages/ReportForm'
import Predictions from './pages/Predictions'
import Intelligence from './pages/Intelligence'
import DiagnoseMe from './pages/DiagnoseMe'
import styles from './App.module.css'

const TABS = [
  { id: 'dashboard',    icon: 'ti-chart-bar',    label: 'Signal Feed'   },
  { id: 'predictions',  icon: 'ti-brain',         label: 'Forecast'      },
  { id: 'heatmap',      icon: 'ti-map',           label: 'Heatmap'       },
  { id: 'intelligence', icon: 'ti-database',      label: 'Intelligence'  },
  { id: 'diagnose',     icon: 'ti-stethoscope',   label: 'Diagnose Me'   },
  { id: 'report',       icon: 'ti-file-plus',     label: 'Report'        },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [time, setTime]  = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className={styles.app}>
      <nav className={styles.nav}>
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoDot} />
          Sentinel AI
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map(t => (
            <NavTab key={t.id} id={t.id} active={page} setPage={setPage} icon={t.icon} label={t.label} />
          ))}
        </div>

        {/* Right side */}
        <div className={styles.navRight}>
          {/* Live clock */}
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.5px' }}>
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            Live · Real data
          </span>
        </div>
      </nav>

      <main className={styles.main}>
        {page === 'dashboard'    && <Dashboard />}
        {page === 'predictions'  && <Predictions />}
        {page === 'heatmap'      && <Heatmap />}
        {page === 'intelligence' && <Intelligence />}
        {page === 'diagnose'     && <DiagnoseMe />}
        {page === 'report'       && <ReportForm />}
      </main>
    </div>
  )
}

function NavTab({ id, active, setPage, icon, label }) {
  const isActive = active === id
  return (
    <button
      id={`nav-tab-${id}`}
      onClick={() => setPage(id)}
      style={{
        padding: '6px 14px',
        borderRadius: '8px',
        fontSize: '12.5px',
        fontWeight: isActive ? 700 : 500,
        color: isActive ? 'var(--teal)' : 'var(--text3)',
        background: isActive ? 'rgba(29,233,182,0.08)' : 'transparent',
        border: isActive ? '1px solid rgba(29,233,182,0.2)' : '1px solid transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'all .18s',
        letterSpacing: isActive ? '-0.2px' : 'normal',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.color = 'var(--text2)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.color = 'var(--text3)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
      {label}
    </button>
  )
}
