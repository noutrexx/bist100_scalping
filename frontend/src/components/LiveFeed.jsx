import React, { useEffect, useRef, useState } from 'react'
import { Divider, Badge } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, ThunderboltOutlined } from '@ant-design/icons'

const SIG = {
  'GÜÇLÜ AL':  { color: '#00e676', icon: <ArrowUpOutlined />,   bg: 'rgba(0,230,118,0.07)',  label: 'G.AL'  },
  'AL':        { color: '#22c55e', icon: <ArrowUpOutlined />,   bg: 'rgba(34,197,94,0.07)',  label: 'AL'    },
  'SAT':       { color: '#ef4444', icon: <ArrowDownOutlined />, bg: 'rgba(239,68,68,0.07)',  label: 'SAT'   },
  'GÜÇLÜ SAT': { color: '#ff1744', icon: <ArrowDownOutlined />, bg: 'rgba(255,23,68,0.09)',  label: 'G.SAT' },
}

function timeStr() {
  return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function TradeRow({ trade, isNew }) {
  const s = SIG[trade.signal]
  if (!s) return null
  const isBuy = trade.signal.includes('AL')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px',
      background: isNew ? s.bg : 'transparent',
      borderLeft: `2px solid ${isNew ? s.color : 'transparent'}`,
      borderBottom: '1px solid #111827',
      transition: 'background 1.5s, border-left-color 1.5s',
      animation: isNew ? 'fadeIn 0.3s ease' : 'none',
    }}>
      {/* Signal tag */}
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
        color: s.color, background: `${s.color}18`,
        border: `1px solid ${s.color}33`,
        padding: '1px 5px', borderRadius: 3, flexShrink: 0, minWidth: 34, textAlign: 'center',
      }}>
        {s.label}
      </span>

      {/* Ticker */}
      <span style={{ fontWeight: 700, fontSize: 11, color: '#c9d1d9', letterSpacing: '0.03em', flexShrink: 0, minWidth: 48 }}>
        {trade.symbol.replace('.IS', '')}
      </span>

      {/* Price */}
      <span style={{ flex: 1, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 11, fontWeight: 600, color: '#c9d1d9' }}>
        {trade.price?.toLocaleString('tr-TR')} ₺
      </span>

      {/* Vol spike badge */}
      {trade.vol_spike && (
        <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 9, flexShrink: 0 }} />
      )}

      {/* Time */}
      <span style={{ fontSize: 9, color: '#374151', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
        {trade.time}
      </span>
    </div>
  )
}

export default function LiveFeed({ signals }) {
  const [trades, setTrades]     = useState([])
  const [newIds, setNewIds]     = useState(new Set())
  const prevSymbols             = useRef(new Set())
  const MAX_TRADES              = 60

  useEffect(() => {
    if (!signals?.length) return

    // Sadece AL/SAT sinyalleri al
    const actionable = signals.filter(s => s.signal !== 'BEKLE')

    const now = timeStr()
    const freshIds = new Set()

    const newEntries = actionable
      .filter(s => !prevSymbols.current.has(s.symbol))
      .map(s => ({ ...s, time: now, id: `${s.symbol}-${Date.now()}-${Math.random()}` }))

    // İlk yükleme — tüm AL/SAT sinyallerini göster
    if (prevSymbols.current.size === 0) {
      const initial = actionable.map(s => ({
        ...s, time: now, id: `${s.symbol}-init-${Math.random()}`
      }))
      setTrades(initial.slice(0, MAX_TRADES))
      prevSymbols.current = new Set(signals.map(s => s.symbol))
      return
    }

    if (newEntries.length > 0) {
      newEntries.forEach(e => freshIds.add(e.id))
      setTrades(prev => [...newEntries, ...prev].slice(0, MAX_TRADES))
      setNewIds(freshIds)
      setTimeout(() => setNewIds(new Set()), 2000)
    }

    prevSymbols.current = new Set(signals.map(s => s.symbol))
  }, [signals])

  const buyCnt  = trades.filter(t => t.signal.includes('AL')).length
  const sellCnt = trades.filter(t => t.signal.includes('SAT')).length

  return (
    <div style={{
      width: 270, flexShrink: 0,
      background: '#0a0d14',
      border: '1px solid #1a2030',
      borderRadius: 8, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 90px)',
      position: 'sticky', top: 64,
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 10px', borderBottom: '1px solid #1a2030',
        background: '#0f1420', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ⚡ İşlem Akışı
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#22c55e' }}>AL {buyCnt}</span>
            <span style={{ fontSize: 9, color: '#1e2738' }}>|</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444' }}>SAT {sellCnt}</span>
          </span>
        </div>
        {/* Column labels */}
        <div style={{ display: 'flex', marginTop: 6, gap: 6, padding: '0 0' }}>
          <span style={{ fontSize: 8, color: '#2d3748', fontWeight: 600, minWidth: 34 }}>SİNYAL</span>
          <span style={{ fontSize: 8, color: '#2d3748', fontWeight: 600, minWidth: 48 }}>HİSSE</span>
          <span style={{ fontSize: 8, color: '#2d3748', fontWeight: 600, flex: 1, textAlign: 'right' }}>FİYAT</span>
          <span style={{ fontSize: 8, color: '#2d3748', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>SAAT</span>
        </div>
      </div>

      {/* Feed */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: none; } }
        `}</style>
        {trades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#2d3748', fontSize: 11 }}>
            Sinyal bekleniyor…
          </div>
        ) : (
          trades.map(t => (
            <TradeRow key={t.id} trade={t} isNew={newIds.has(t.id)} />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '5px 10px', borderTop: '1px solid #111827',
        background: '#0a0d14', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 9, color: '#374151' }}>30sn'de bir güncellenir · {trades.length} kayıt</span>
      </div>
    </div>
  )
}
