import React, { useMemo } from 'react'
import { Divider } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons'

const ITEMS = [
  { key: 'GÜÇLÜ AL',   label: 'Güçlü AL',   color: '#00e676', bg: 'rgba(0,230,118,0.08)'  },
  { key: 'AL',         label: 'AL',          color: '#22c55e', bg: 'rgba(34,197,94,0.06)'  },
  { key: 'BEKLE',      label: 'Bekle',       color: '#4a5568', bg: 'transparent'           },
  { key: 'SAT',        label: 'SAT',         color: '#ef4444', bg: 'rgba(239,68,68,0.06)'  },
  { key: 'GÜÇLÜ SAT', label: 'Güçlü SAT',  color: '#ff1744', bg: 'rgba(255,23,68,0.08)'  },
]

export default function StatsBar({ signals }) {
  const counts = useMemo(() => {
    const c = { 'GÜÇLÜ AL': 0, 'AL': 0, 'BEKLE': 0, 'SAT': 0, 'GÜÇLÜ SAT': 0 }
    signals.forEach(s => { if (c[s.signal] !== undefined) c[s.signal]++ })
    return c
  }, [signals])

  const total = signals.length

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#0f1420',
      border: '1px solid #1e2738',
      borderRadius: 8,
      padding: '0 4px',
      height: 40,
      gap: 0,
      overflow: 'hidden',
    }}>
      {/* Total */}
      <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: '#4a5568', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          BIST 100
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#c9d1d9' }}>{total || '—'}</span>
      </div>

      <Divider type="vertical" style={{ height: 20, borderColor: '#1e2738', margin: '0 2px' }} />

      {/* Signal counts */}
      {ITEMS.map((item, i) => (
        <React.Fragment key={item.key}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '0 14px', height: '100%',
            background: counts[item.key] > 0 ? item.bg : 'transparent',
            transition: 'background 0.2s',
            cursor: 'default',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
              color: counts[item.key] > 0 ? item.color : '#2d3748',
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </span>
            <span style={{
              fontSize: 15, fontWeight: 700, lineHeight: 1,
              color: counts[item.key] > 0 ? item.color : '#2d3748',
              minWidth: 16, textAlign: 'right',
            }}>
              {counts[item.key] ?? 0}
            </span>
          </div>
          {i < ITEMS.length - 1 && (
            <Divider type="vertical" style={{ height: 20, borderColor: '#1e2738', margin: '0 2px' }} />
          )}
        </React.Fragment>
      ))}

      {/* Market sentiment bar */}
      <div style={{ flex: 1, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        {total > 0 && (() => {
          const buyCount  = (counts['GÜÇLÜ AL'] || 0) + (counts['AL'] || 0)
          const sellCount = (counts['GÜÇLÜ SAT'] || 0) + (counts['SAT'] || 0)
          const buyPct    = Math.round((buyCount / total) * 100)
          const sellPct   = Math.round((sellCount / total) * 100)
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>AL {buyPct}%</span>
              <div style={{ width: 60, height: 4, background: '#1e2738', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${buyPct}%`, background: '#22c55e', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>SAT {sellPct}%</span>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
