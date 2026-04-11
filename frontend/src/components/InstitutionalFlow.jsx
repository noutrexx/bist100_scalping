import React, { useState, useEffect, useRef } from 'react'

/**
 * InstitutionalFlow — Sağ üstte kayan ticker şeklinde
 * BofA, Ziraat, Vakıf, Goldman gibi kurum alım/satımları gösterir.
 */

const POLL_MS = 120_000  // 2 dakika

function FlowItem({ item, onClick }) {
  const isBuy = item.action === 'AL'
  const color  = isBuy ? '#22c55e' : '#ef4444'
  const bgColor = isBuy ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)'
  const icon   = isBuy ? '▲' : '▼'

  return (
    <span
      onClick={() => onClick && onClick(item)}
      style={{
        display:     'inline-flex',
        alignItems:  'center',
        gap:         5,
        padding:     '2px 10px 2px 8px',
        marginRight: 4,
        borderRadius: 4,
        background:  bgColor,
        border:      `1px solid ${color}22`,
        cursor:      'pointer',
        flexShrink:  0,
        whiteSpace:  'nowrap',
        transition:  'background 0.2s',
      }}
      title={`${item.full_name} — ${item.title || ''}`}
    >
      {/* Institution badge */}
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
        color: '#001', background: color,
        padding: '1px 5px', borderRadius: 3,
      }}>
        {item.institution}
      </span>

      {/* Action */}
      <span style={{ fontSize: 9, color, fontWeight: 700 }}>
        {icon} {item.action}
      </span>

      {/* Symbol */}
      <span style={{ fontSize: 10, color: '#c9d1d9', fontWeight: 700 }}>
        {item.symbol}
      </span>

      {/* Amount */}
      {item.amount && item.amount !== '—' && (
        <span style={{ fontSize: 9, color: '#6b7a99' }}>
          {item.amount}
        </span>
      )}
    </span>
  )
}

// Tooltip popup for detail
function DetailTooltip({ item, onClose }) {
  if (!item) return null
  const isBuy = item.action === 'AL'
  const color  = isBuy ? '#22c55e' : '#ef4444'
  return (
    <div
      style={{
        position: 'fixed', top: 56, right: 16, zIndex: 999,
        background: '#0f1420', border: `1px solid ${color}44`,
        borderRadius: 8, padding: '10px 14px', width: 260,
        boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
        fontFamily: 'Inter, sans-serif',
      }}
      onClick={onClose}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
          {item.full_name}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 800, color: '#001',
          background: color, padding: '1px 6px', borderRadius: 3
        }}>
          {item.action}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 6, lineHeight: 1.4 }}>
        {item.title ? item.title : `${item.full_name}, ${item.symbol} hissesinde büyük ${item.action === 'AL' ? 'alım' : 'satış'} yaptı.`}
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
        <span style={{ color: '#6b7a99' }}>Hisse: <b style={{ color: '#3b82f6' }}>{item.symbol}</b></span>
        {item.amount && item.amount !== '—' && (
          <span style={{ color: '#6b7a99' }}>Hacim: <b style={{ color }}>{item.amount}</b></span>
        )}
        {item.source && (
          <span style={{ color: '#2d3748' }}>{item.source}</span>
        )}
      </div>
      <div style={{ fontSize: 8, color: '#1e2738', marginTop: 6, textAlign: 'right' }}>
        Kapatmak için tıkla
      </div>
    </div>
  )
}

export default function InstitutionalFlow() {
  const [items, setItems]       = useState([])
  const [selected, setSelected] = useState(null)
  const [tick, setTick]         = useState(0)
  const tickerRef               = useRef(null)
  const animRef                 = useRef(null)
  const posRef                  = useRef(0)

  const loadData = async () => {
    try {
      const res  = await fetch('/api/institutional')
      const data = await res.json()
      setItems(data.items || [])
    } catch (e) {
      console.warn('Kurumsal veri yüklenemedi:', e)
    }
  }

  // Infinite scroll animation
  useEffect(() => {
    if (!tickerRef.current || items.length === 0) return

    const speed = 0.5  // px per frame
    const el = tickerRef.current

    const animate = () => {
      posRef.current -= speed
      const totalWidth = el.scrollWidth / 2  // doubled list
      if (Math.abs(posRef.current) >= totalWidth) {
        posRef.current = 0
      }
      el.style.transform = `translateX(${posRef.current}px)`
      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [items])

  useEffect(() => {
    loadData()
    const t = setInterval(loadData, POLL_MS)
    return () => clearInterval(t)
  }, [])

  if (items.length === 0) return null

  const buyCnt  = items.filter(i => i.action === 'AL').length
  const sellCnt = items.filter(i => i.action === 'SAT').length

  return (
    <>
      <div style={{
        display:       'flex',
        alignItems:    'center',
        flex:          1,
        overflow:      'hidden',
        height:        '100%',
        marginLeft:    12,
        marginRight:   12,
        position:      'relative',
      }}>
        {/* Label */}
        <span style={{
          fontSize: 9, fontWeight: 700, color: '#4a5568',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          flexShrink: 0, marginRight: 8, whiteSpace: 'nowrap',
        }}>
          🏦 KURUM
        </span>

        {/* AL / SAT sayacı */}
        <span style={{
          fontSize: 8, fontWeight: 700, color: '#22c55e',
          flexShrink: 0, marginRight: 4,
        }}>▲{buyCnt}</span>
        <span style={{
          fontSize: 8, fontWeight: 700, color: '#ef4444',
          flexShrink: 0, marginRight: 10,
        }}>▼{sellCnt}</span>

        {/* Fade edges */}
        <div style={{
          position: 'absolute', left: 90, top: 0, bottom: 0, width: 24,
          background: 'linear-gradient(to right, #0f1420, transparent)',
          zIndex: 1, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 24,
          background: 'linear-gradient(to left, #0f1420, transparent)',
          zIndex: 1, pointerEvents: 'none',
        }} />

        {/* Ticker */}
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div
            ref={tickerRef}
            style={{
              display:    'inline-flex',
              alignItems: 'center',
              willChange: 'transform',
            }}
          >
            {/* Double the list for seamless loop */}
            {[...items, ...items].map((item, idx) => (
              <FlowItem
                key={`${item.institution}-${item.symbol}-${idx}`}
                item={item}
                onClick={setSelected}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Detail popup */}
      {selected && (
        <DetailTooltip item={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
