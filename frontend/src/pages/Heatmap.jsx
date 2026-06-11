import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import Map from 'react-map-gl/maplibre'
import DeckGL from '@deck.gl/react'
import { H3HexagonLayer } from '@deck.gl/geo-layers'
import 'maplibre-gl/dist/maplibre-gl.css'

// Dark matter style for a sleek dark mode map without needing an access token
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const INITIAL_VIEW_STATE = {
  longitude: 82.5,
  latitude: 22.5,
  zoom: 4.5,
  pitch: 40,
  bearing: -5
}

const confToColor = (c) => {
  if (c < 30)  return [29, 233, 182, 180] // teal
  if (c < 60)  return [245, 158, 11, 200] // amber
  return [239, 68, 68, 220] // red
}

export default function Heatmap() {
  const [hexData, setHexData] = useState([])
  const [timeline, setTimeline] = useState([])
  const [currentFrameIdx, setCurrentFrameIdx] = useState(11) // Default to latest frame
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hoverInfo, setHoverInfo] = useState(null)

  useEffect(() => {
    Promise.all([api.getHeatmap(), api.getTimeline()])
      .then(([heatmap, tl]) => {
        setHexData(heatmap)
        setTimeline(tl)
        setCurrentFrameIdx(tl.length - 1)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Auto-play timeline logic
  useEffect(() => {
    let interval;
    if (isPlaying && timeline.length > 0) {
      interval = setInterval(() => {
        setCurrentFrameIdx(prev => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1000) // 1 second per frame
    }
    return () => clearInterval(interval)
  }, [isPlaying, timeline])

  const activeData = isPlaying || currentFrameIdx !== (timeline.length - 1) 
    ? (timeline[currentFrameIdx]?.data || []) 
    : hexData

  const layers = [
    new H3HexagonLayer({
      id: 'h3-hexagon-layer',
      data: activeData,
      pickable: true,
      wireframe: false,
      filled: true,
      extruded: true,
      elevationScale: 50,
      getHexagon: d => d.hex_id,
      getFillColor: d => confToColor(d.confidence),
      getElevation: d => d.confidence,
      onHover: info => setHoverInfo(info),
      updateTriggers: {
        getFillColor: [activeData],
        getElevation: [activeData]
      },
      transitions: {
        getElevation: 500,
        getFillColor: 500
      }
    })
  ]

  const formatOffset = (hours) => {
    if (hours === 0) return 'Live'
    return `${hours}h ago`
  }

  return (
    <div className="animate-in" style={{ position: 'relative', width: '100%', height: 'calc(100vh - 100px)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, color: 'var(--teal)' }}>Loading Map Data...</div>}
      
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getTooltip={({object}) => object && {
          html: `
            <div style="font-family: Inter; padding: 4px;">
              <div style="font-size: 11px; color: #8899aa; margin-bottom: 4px;">${object.district || 'Unknown District'}</div>
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">Conf: ${object.confidence.toFixed(1)}%</div>
              <div style="font-size: 12px; color: #1de9b6;">Reports: ${object.report_count}</div>
              <div style="font-size: 12px; color: #f59e0b;">Symptom: ${object.dominant_symptom}</div>
            </div>
          `,
          style: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }
        }}
      >
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>

      {/* Overlay UI */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1, background: 'rgba(8, 15, 30, 0.88)', backdropFilter: 'blur(12px)', border: '1px solid rgba(29,233,182,0.15)', padding: '16px 18px', borderRadius: 14, width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 8px var(--teal)', animation: 'pulse 1.5s infinite' }} />
          <h1 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text)', margin: 0 }}>Geographic Signal Heatmap</h1>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.5 }}>
          Deck.gl H3 Hexagon Layer · All-India surveillance · {hexData.length} active zones
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            ['#1de9b6', 'rgba(29,233,182,0.2)', '0–30%', 'Low signal'],
            ['#f59e0b', 'rgba(245,158,11,0.2)', '30–60%', 'Medium signal'],
            ['#ef4444', 'rgba(239,68,68,0.2)', '60–100%', 'High alert'],
          ].map(([c, bg, range, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: bg, borderRadius: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c, boxShadow: `0 0 6px ${c}`, flexShrink: 0 }} />
              <span style={{ color: c, fontWeight: 700, minWidth: 40 }}>{range}</span>
              <span style={{ color: 'var(--text3)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Player */}
      {timeline.length > 0 && (
        <div style={{ 
          position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', 
          width: '90%', maxWidth: 700, zIndex: 1, 
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', 
          border: '1px solid var(--border)', padding: '16px 24px', borderRadius: 100,
          display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <button 
            onClick={() => {
              if (currentFrameIdx >= timeline.length - 1) setCurrentFrameIdx(0);
              setIsPlaying(!isPlaying)
            }}
            style={{ 
              width: 40, height: 40, borderRadius: 20, background: 'var(--teal)', color: '#000', 
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, transition: 'transform 0.1s'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <i className={`ti ${isPlaying ? 'ti-player-pause' : 'ti-player-play'}`} style={{ fontSize: 20, marginLeft: isPlaying ? 0 : 2 }} />
          </button>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
              <span>Outbreak Timeline Preview</span>
              <span style={{ color: 'var(--amber)' }}>{formatOffset(timeline[currentFrameIdx]?.time_offset_hours)}</span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={timeline.length - 1} 
              value={currentFrameIdx}
              onChange={(e) => {
                setCurrentFrameIdx(parseInt(e.target.value))
                setIsPlaying(false)
              }}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--teal)' }} 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)' }}>
              <span>-24h</span>
              <span>Live</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
