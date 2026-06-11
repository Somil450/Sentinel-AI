import { useState, useMemo } from 'react'
import { api } from '../lib/api'

const SYMPTOMS = [
  'Cough', 'Fever', 'Fatigue', 'Loss of smell',
  'Headache', 'Sore throat', 'Shortness of breath',
  'Body ache', 'Nausea',
]

const DISTRICTS = [
  'Bhopal North', 'Bhopal South', 'Bhopal East', 'Bhopal West',
  'Berasia', 'Huzur', 'Phanda', 'Govindpura', 'Kolar', 'Misrod',
  'Raisen', 'Sehore', 'Vidisha', 'Mandideep', 'Bairagarh',
]

function genAnonId() {
  return Math.random().toString(16).slice(2, 10).toUpperCase()
}

export default function ReportForm() {
  const [district, setDistrict]     = useState('')
  const [symptoms, setSymptoms]     = useState([])
  const [freeText, setFreeText]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState(null)
  const anonId = useMemo(genAnonId, [])

  const toggleSymptom = (s) =>
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  // Live confidence contribution preview
  const confPreview = Math.min(symptoms.length * 8 + (district ? 5 : 0) + (freeText.length > 20 ? 4 : 0), 35)

  const handleSubmit = async () => {
    if (!district || symptoms.length === 0) {
      setError('Please select a district and at least one symptom.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const r = await api.submitReport(district, symptoms.map(s => s.toLowerCase()), freeText)
      setResult(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setDistrict(''); setSymptoms([]); setFreeText(''); setResult(null); setError(null)
  }

  return (
    <div className="animate-in" style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{
        background: 'var(--navy2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 28,
        width: '100%',
        maxWidth: 580,
      }}>
        {result ? (
          <SuccessScreen result={result} onReset={reset} />
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Submit an anonymous report</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
              Your observations help detect emerging health patterns. No personal data is stored — only anonymous signals fed into the AI confidence engine.
            </p>

            {/* Anon badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, background: 'rgba(29,233,182,.05)', border: '1px solid rgba(29,233,182,.12)', borderRadius: 8, marginBottom: 20 }}>
              <i className="ti ti-shield-check" style={{ color: 'var(--teal)', fontSize: 20, flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: 'var(--teal2)', lineHeight: 1.6 }}>
                You are anonymous. We store: timestamp, district, symptoms, free-text — no name, no IP, no identity.
                Your session ID: <strong style={{ color: 'var(--teal)' }}>#{anonId}</strong>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
                <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
              </div>
            )}

            {/* District */}
            <FormGroup label="District / Area *">
              <select value={district} onChange={e => setDistrict(e.target.value)} style={inputStyle}>
                <option value="">Select district...</option>
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </FormGroup>

            {/* Symptoms */}
            <FormGroup label="Symptoms observed * (select all that apply)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {SYMPTOMS.map(s => (
                  <div key={s}
                    onClick={() => toggleSymptom(s)}
                    style={{
                      padding: '8px 10px',
                      background: symptoms.includes(s) ? 'rgba(29,233,182,.1)' : 'var(--navy3)',
                      border: `1px solid ${symptoms.includes(s) ? 'var(--teal3)' : 'var(--border2)'}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: symptoms.includes(s) ? 'var(--teal)' : 'var(--text2)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all .15s',
                      userSelect: 'none',
                    }}>
                    {s}
                  </div>
                ))}
              </div>
            </FormGroup>

            {/* Free text */}
            <FormGroup label="Your observation (optional — in your own words)">
              <textarea
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                placeholder="e.g. Several people in my colony have been feeling unwell this week..."
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              />
            </FormGroup>

            {/* Live confidence preview */}
            <div style={{ background: 'var(--navy3)', borderRadius: 8, border: '1px solid var(--border2)', padding: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                <span>Estimated contribution to signal confidence</span>
                <span style={{ color: 'var(--teal)', fontWeight: 700 }}>+{confPreview}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'var(--teal)', width: confPreview + '%', transition: 'width .5s' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
                More symptoms + free text = stronger signal contribution
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%',
                padding: 12,
                background: submitting ? 'var(--teal3)' : 'var(--teal)',
                color: '#000',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                borderRadius: 8,
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all .2s',
                letterSpacing: '.3px',
              }}>
              {submitting ? 'Submitting...' : 'Submit anonymous report'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function SuccessScreen({ result, onReset }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <i className="ti ti-circle-check" style={{ fontSize: 52, color: 'var(--teal)', display: 'block', marginBottom: 12 }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Report submitted</h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
        Your anonymous signal has been fed into the confidence engine for <strong style={{ color: 'var(--text2)' }}>{result.district}</strong>.
      </p>
      <div style={{ background: 'var(--navy3)', borderRadius: 8, padding: 16, marginBottom: 20, textAlign: 'left' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <Row label="Your anon ID" value={`#${result.anon_id}`} mono />
          <Row label="Normalized symptoms" value={result.symptoms.join(', ')} />
          <Row label="Signal contribution" value={`+${result.signal_contribution}%`} color="var(--teal)" />
          <Row label="District" value={result.district} />
        </div>
      </div>
      <button onClick={onReset} style={{ padding: '10px 24px', background: 'var(--teal)', color: '#000', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
        Submit another report
      </button>
    </div>
  )
}

function FormGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', letterSpacing: '.4px', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Row({ label, value, mono, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <span style={{ color: color || 'var(--text2)', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'var(--navy3)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontSize: 14,
  padding: '10px 14px',
  borderRadius: 8,
  outline: 'none',
  fontFamily: 'inherit',
}
