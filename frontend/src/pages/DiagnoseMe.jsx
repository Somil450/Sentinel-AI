import { useState, useEffect } from 'react'
import { api } from '../lib/api'

// All Indian districts from the real_data_fetcher + Bhopal local ones
const ALL_DISTRICTS = [
  // Bhopal local
  'Bhopal North', 'Bhopal South', 'Bhopal East', 'Bhopal West',
  'Berasia', 'Huzur', 'Phanda', 'Govindpura', 'Kolar', 'Misrod',
  'Raisen', 'Sehore', 'Vidisha', 'Mandideep', 'Bairagarh',
  // Major cities (matches backend CITY_TO_DISTRICT)
  'Mumbai', 'New Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
  'Indore', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad',
  'Noida', 'Agra', 'Ranchi', 'Chandigarh', 'Coimbatore', 'Madurai',
  'Guwahati', 'Kochi', 'Thiruvananthapuram', 'Varanasi', 'Amritsar',
  'Jodhpur', 'Udaipur', 'Srinagar', 'Jammu', 'Bhubaneswar', 'Raipur',
  'Dehradun', 'Shimla', 'Siliguri', 'Gwalior', 'Jabalpur', 'Thane',
  'Nashik', 'Aurangabad', 'Meerut', 'Rajkot', 'Warangal', 'Prayagraj',
  'Gorakhpur', 'Mangaluru', 'Mysuru', 'Hubballi', 'Gurugram', 'Faridabad',
]

const SYMPTOM_CHIPS = [
  { id: 'cough',                label: 'Cough',                icon: 'ti-lungs' },
  { id: 'fever',                label: 'Fever',                icon: 'ti-thermometer' },
  { id: 'fatigue',              label: 'Fatigue / Weakness',   icon: 'ti-zzz' },
  { id: 'loss of smell',        label: 'Loss of Smell',        icon: 'ti-nose' },
  { id: 'headache',             label: 'Headache',             icon: 'ti-brain' },
  { id: 'sore throat',          label: 'Sore Throat',          icon: 'ti-mood-sick' },
  { id: 'shortness of breath',  label: 'Breathlessness',       icon: 'ti-wind' },
  { id: 'body ache',            label: 'Body Ache',            icon: 'ti-activity' },
  { id: 'nausea',               label: 'Nausea / Vomiting',    icon: 'ti-droplet' },
  { id: 'diarrhea',             label: 'Diarrhea',             icon: 'ti-toilet-paper' },
  { id: 'stomach pain',         label: 'Stomach Pain',         icon: 'ti-circle' },
]

const SEVERITY_COLORS = {
  1: '#1de9b6',
  2: '#3b82f6',
  3: '#f59e0b',
  4: '#f97316',
  5: '#ef4444',
}

const SEVERITY_LABELS = {
  1: 'Mild',
  2: 'Moderate',
  3: 'Significant',
  4: 'Serious',
  5: 'Critical',
}

export default function DiagnoseMe() {
  const [district, setDistrict] = useState('')
  const [selected, setSelected] = useState([])
  const [freeText, setFreeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [scanStep, setScanStep] = useState(0)

  // Scan animation steps
  useEffect(() => {
    if (!loading) { setScanStep(0); return }
    const steps = [
      'Normalizing your symptoms...',
      'Scanning local outbreak signals...',
      'Cross-referencing WHO / ProMED data...',
      'Running disease probability engine...',
      'Ranking diagnoses by evidence...',
    ]
    let i = 0
    const t = setInterval(() => {
      i = (i + 1) % steps.length
      setScanStep(i)
    }, 700)
    return () => clearInterval(t)
  }, [loading])

  const scanLabels = [
    'Normalizing your symptoms...',
    'Scanning local outbreak signals...',
    'Cross-referencing WHO / ProMED data...',
    'Running disease probability engine...',
    'Ranking diagnoses by evidence...',
  ]

  const toggleSymptom = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleDiagnose = async () => {
    if (!district || selected.length === 0) {
      setError('Please select your district and at least one symptom.')
      return
    }
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const data = await api.diagnose(district, selected, freeText)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setDistrict(''); setSelected([]); setFreeText(''); setResult(null); setError(null)
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 100, padding: '6px 18px', marginBottom: 14 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', letterSpacing: '0.5px' }}>AI HEALTH INTELLIGENCE · REAL OUTBREAK DATA</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #fff 30%, #1de9b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
          What could I have?
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
          Tell us what you're feeling. We'll cross-reference live disease signals from <strong style={{ color: 'var(--text2)' }}>WHO, ProMED, GDELT, NCVBDC</strong> and what others in your area are reporting right now.
        </p>
      </div>

      {result ? (
        <ResultsView result={result} onReset={reset} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* LEFT — Input */}
          <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: 'var(--text)' }}>
              <i className="ti ti-user-heart" style={{ marginRight: 8, color: 'var(--teal)' }} />
              Your Symptoms
            </h2>

            {/* District selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>📍 Your District / City</label>
              <select
                value={district}
                onChange={e => setDistrict(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select your location...</option>
                {ALL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Symptom chips */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>🩺 Symptoms you're experiencing *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {SYMPTOM_CHIPS.map(s => {
                  const active = selected.includes(s.id)
                  return (
                    <div
                      key={s.id}
                      id={`symptom-${s.id.replace(/\s+/g, '-')}`}
                      onClick={() => toggleSymptom(s.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: `1px solid ${active ? 'rgba(29,233,182,0.4)' : 'var(--border2)'}`,
                        background: active ? 'rgba(29,233,182,0.08)' : 'var(--navy3)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s',
                        userSelect: 'none',
                      }}
                    >
                      <i className={`ti ${s.icon}`} style={{ fontSize: 15, color: active ? 'var(--teal)' : 'var(--text3)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--teal)' : 'var(--text2)' }}>
                        {s.label}
                      </span>
                      {active && <i className="ti ti-check" style={{ fontSize: 12, color: 'var(--teal)', marginLeft: 'auto' }} />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Free text */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>💬 Additional details (optional)</label>
              <textarea
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                placeholder="e.g. I've had a cold for 3 days, mild fever since yesterday..."
                style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
                <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
              </div>
            )}

            <button
              id="diagnose-submit-btn"
              onClick={handleDiagnose}
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 20px',
                background: loading ? 'var(--teal3)' : 'linear-gradient(135deg, #1de9b6, #0891b2)',
                color: '#000',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                letterSpacing: '0.3px',
              }}
            >
              {loading ? (
                <>
                  <i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }} />
                  {scanLabels[scanStep]}
                </>
              ) : (
                <>
                  <i className="ti ti-stethoscope" style={{ fontSize: 16 }} />
                  Analyse My Symptoms
                </>
              )}
            </button>
          </div>

          {/* RIGHT — How it works */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 14, letterSpacing: '0.5px' }}>HOW THIS WORKS</h3>
              {[
                { icon: 'ti-microscope', title: 'Symptom normalization', desc: 'Your symptoms are normalized using a medical NLP engine (WHO clinical terminology).' },
                { icon: 'ti-map-pin', title: 'Local outbreak scan', desc: 'Live signals from WHO, ProMED, GDELT and NCVBDC are checked for your district right now.' },
                { icon: 'ti-chart-bar', title: 'Probability scoring', desc: 'Each disease is scored: 50% symptom match + 35% local signal strength + 15% seasonal rate.' },
                { icon: 'ti-award', title: 'Ranked results', desc: 'Top 5 diseases are returned with confidence labels, precautions, and real source provenance.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(29,233,182,0.08)', border: '1px solid rgba(29,233,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${icon}`} style={{ color: 'var(--teal)', fontSize: 15 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <i className="ti ti-alert-triangle" style={{ color: '#f59e0b', fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>Not Medical Advice</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
                    Sentinel AI uses real epidemiological data to estimate disease probabilities. This is an informational tool only. Always consult a qualified doctor for diagnosis and treatment. In emergencies, call <strong style={{ color: '#f59e0b' }}>112</strong>.
                  </div>
                </div>
              </div>
            </div>

            {/* Real data badge */}
            <div style={{ background: 'rgba(29,233,182,0.04)', border: '1px solid rgba(29,233,182,0.12)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', marginBottom: 10, letterSpacing: '0.5px' }}>REAL DATA SOURCES</div>
              {['WHO Disease Outbreak News', 'ProMED Mail', 'disease.sh COVID API', 'NCVBDC / MoHFW India', 'GDELT Health Events', 'IDSP Weekly Reports'].map(src => (
                <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11, color: 'var(--text3)' }}>
                  <i className="ti ti-check" style={{ color: 'var(--teal)', fontSize: 11 }} />
                  {src}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes barGrow { from { width: 0%; } to { width: var(--target-width); } }
      `}</style>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Results View                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function ResultsView({ result, onReset }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, animation: 'slideUp 0.4s ease' }}>

      {/* Main results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Summary bar */}
        <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <i className="ti ti-stethoscope" style={{ fontSize: 22, color: 'var(--teal)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Analysis complete — {result.diagnoses.length} possible conditions</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Based on <strong style={{ color: 'var(--teal)' }}>{result.area_signal_count}</strong> area reports · District: <strong style={{ color: 'var(--text2)' }}>{result.district}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {result.input_symptoms.map(s => (
              <span key={s} style={{ padding: '3px 10px', background: 'rgba(29,233,182,0.1)', border: '1px solid rgba(29,233,182,0.25)', borderRadius: 100, fontSize: 11, color: 'var(--teal)', fontWeight: 600 }}>
                {s}
              </span>
            ))}
          </div>
          <button onClick={onReset} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text3)', fontSize: 12, borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
            <i className="ti ti-refresh" style={{ marginRight: 4 }} />New Analysis
          </button>
        </div>

        {/* Disease cards */}
        {result.diagnoses.map((d, idx) => (
          <DiseaseCard
            key={d.disease}
            data={d}
            rank={idx + 1}
            expanded={expanded === d.disease}
            onToggle={() => setExpanded(expanded === d.disease ? null : d.disease)}
          />
        ))}

        {/* Disclaimer */}
        <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '12px 16px', fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
          <i className="ti ti-alert-triangle" style={{ color: '#f59e0b', marginRight: 6 }} />
          <strong style={{ color: '#f59e0b' }}>Disclaimer: </strong>{result.disclaimer}
        </div>
      </div>

      {/* Sidebar — Area Context */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* What's spreading nearby */}
        <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 14, letterSpacing: '0.4px' }}>
            <i className="ti ti-map-pin" style={{ color: '#ef4444', marginRight: 6 }} />
            SPREADING IN YOUR AREA NOW
          </div>
          {result.area_active_diseases.length > 0 ? (
            result.area_active_diseases.map((d, i) => (
              <div key={d.disease} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{d.disease}</span>
                  <span style={{ fontSize: 11, color: SEVERITY_COLORS[d.severity] || '#3b82f6', fontWeight: 700 }}>
                    {d.evidence_strength.toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 2,
                    background: SEVERITY_COLORS[d.severity] || '#3b82f6',
                    width: `${d.evidence_strength}%`,
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
              <i className="ti ti-circle-check" style={{ fontSize: 24, color: 'var(--teal)', display: 'block', marginBottom: 8 }} />
              No major outbreaks detected in your district.
            </div>
          )}
        </div>

        {/* Data sources used */}
        {result.data_sources_used.length > 0 && (
          <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12, letterSpacing: '0.4px' }}>
              <i className="ti ti-database" style={{ color: 'var(--teal)', marginRight: 6 }} />
              DATA SOURCES ACTIVE
            </div>
            {result.data_sources_used.map(src => (
              <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{src}</span>
              </div>
            ))}
          </div>
        )}

        {/* When to see a doctor callout */}
        {result.diagnoses.some(d => d.see_doctor) && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-emergency-bed" style={{ fontSize: 16 }} />
              MEDICAL ATTENTION ADVISED
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              One or more possible conditions in your results require a doctor's evaluation. Please visit your nearest health centre or call <strong style={{ color: '#ef4444' }}>112</strong>.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Disease Card                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function DiseaseCard({ data, rank, expanded, onToggle }) {
  const confidenceColors = {
    'HIGH': '#ef4444',
    'MODERATE': '#f59e0b',
    'LOW': '#3b82f6',
    'UNLIKELY': '#6b7280',
  }
  const confColor = confidenceColors[data.confidence_label] || '#6b7280'

  return (
    <div
      id={`disease-card-${rank}`}
      style={{
        background: 'var(--navy2)',
        border: `1px solid ${expanded ? `${confColor}40` : 'var(--border)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: expanded ? `0 0 20px ${confColor}18` : 'none',
      }}
    >
      {/* Card header — always visible */}
      <div
        onClick={onToggle}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
      >
        {/* Rank badge */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: rank === 1 ? `${confColor}20` : 'var(--navy3)',
          border: `2px solid ${rank === 1 ? confColor : 'var(--border2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: rank === 1 ? confColor : 'var(--text3)',
          flexShrink: 0,
        }}>
          {rank}
        </div>

        {/* Disease name + confidence */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{data.disease}</span>
            {data.active_in_area && (
              <span style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 100, fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: '0.3px' }}>
                🔴 ACTIVE IN YOUR AREA
              </span>
            )}
            {data.see_doctor && (
              <span style={{ padding: '2px 8px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 100, fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>
                ⚕ SEE DOCTOR
              </span>
            )}
          </div>
          {/* Probability bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border2)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: 3,
                background: `linear-gradient(90deg, ${confColor}99, ${confColor})`,
                width: `${data.probability}%`,
                transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: confColor, minWidth: 42, textAlign: 'right' }}>
              {data.probability.toFixed(0)}%
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700,
              background: `${confColor}15`, color: confColor, letterSpacing: '0.3px',
            }}>
              {data.confidence_label}
            </span>
          </div>
        </div>

        {/* ICD10 + expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace', background: 'var(--navy3)', padding: '2px 6px', borderRadius: 4 }}>
            {data.icd10}
          </span>
          <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ color: 'var(--text3)', fontSize: 14 }} />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'rgba(0,0,0,0.15)', animation: 'slideUp 0.25s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>

            {/* Symptom match */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.5px' }}>SYMPTOM ANALYSIS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {data.matched_symptoms.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <i className="ti ti-check" style={{ color: '#1de9b6', fontSize: 12 }} />
                    <span style={{ color: '#1de9b6', fontWeight: 500 }}>{s}</span>
                  </div>
                ))}
                {data.unmatched_symptoms.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <i className="ti ti-minus" style={{ color: 'var(--text3)', fontSize: 12 }} />
                    <span style={{ color: 'var(--text3)' }}>{s} (not reported)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score breakdown */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.5px' }}>SCORE BREAKDOWN</div>
              {[
                { label: 'Symptom overlap', value: data.symptom_overlap_pct, weight: '50%', color: '#1de9b6' },
                { label: 'Area signal strength', value: data.area_signal_confidence, weight: '35%', color: '#f59e0b' },
                { label: 'Seasonal base rate', value: data.seasonal_rate, weight: '15%', color: '#3b82f6' },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>
                    <span>{row.label} <span style={{ color: row.color, fontWeight: 600 }}>({row.weight})</span></span>
                    <span style={{ color: row.color, fontWeight: 700 }}>{row.value.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--border2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: row.color, width: `${row.value}%`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.5px' }}>ABOUT THIS CONDITION</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{data.description}</p>
          </div>

          {/* Precautions */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.5px' }}>RECOMMENDED PRECAUTIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.precautions.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
                  <span style={{ minWidth: 18, height: 18, borderRadius: '50%', background: 'rgba(29,233,182,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--teal)', flexShrink: 0, marginTop: 1 }}>
                    {i + 1}
                  </span>
                  <span style={{ color: 'var(--text2)', lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sources */}
          {data.sources.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.5px' }}>REAL DATA SOURCES</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {data.sources.map(src => (
                  <span key={src} style={{ padding: '2px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Shared Styles ─────────────────────────────────────────────── */
const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text2)',
  letterSpacing: '0.4px',
  marginBottom: 8,
}

const inputStyle = {
  width: '100%',
  background: 'var(--navy3)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontSize: 13,
  padding: '10px 14px',
  borderRadius: 8,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}
