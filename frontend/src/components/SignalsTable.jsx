import React, { useState, useMemo } from 'react'
import { Table, Tag, Input, Space, Tooltip } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

const SIG_COLORS = {
  'GÜÇLÜ AL':  { color: '#00e676', bg: 'rgba(0,230,118,0.1)',   border: 'rgba(0,230,118,0.3)'  },
  'AL':        { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.28)' },
  'BEKLE':     { color: '#4a5568', bg: 'rgba(74,85,104,0.12)',  border: 'rgba(74,85,104,0.2)'  },
  'SAT':       { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.28)' },
  'GÜÇLÜ SAT': { color: '#ff1744', bg: 'rgba(255,23,68,0.12)',  border: 'rgba(255,23,68,0.3)'  },
}

const FILTERS = ['ALL', 'GÜÇLÜ AL', 'AL', 'BEKLE', 'SAT', 'GÜÇLÜ SAT']
const FILTER_LABELS = { 'ALL': 'Tümü', 'GÜÇLÜ AL': 'Güçlü AL', 'AL': 'AL', 'BEKLE': 'Bekle', 'SAT': 'SAT', 'GÜÇLÜ SAT': 'Güçlü SAT' }

// 8-dot score bar (-8 … +8)
function ScoreDots({ score }) {
  const abs = Math.abs(score)
  const isBuy = score >= 0
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        width: 24, textAlign: 'right', fontWeight: 700, fontSize: 11,
        color: score > 0 ? '#22c55e' : score < 0 ? '#ef4444' : '#4a5568',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {score > 0 ? `+${score}` : score}
      </span>
      <span style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: 1,
            background: score >= i ? '#22c55e' : '#1e2738',
            transition: 'background 0.2s',
          }} />
        ))}
        {[1,2,3,4].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: 1,
            background: score <= -i ? '#ef4444' : '#1e2738',
            transition: 'background 0.2s',
          }} />
        ))}
      </span>
    </span>
  )
}

// 8 indicator mini badges (R B M S | E K V W)
const IND_DEFS = [
  { k: 'rsi',       l: 'RSI',   title: 'RSI (14)' },
  { k: 'bollinger', l: 'BB',    title: 'Bollinger' },
  { k: 'macd',      l: 'MAC',   title: 'MACD' },
  { k: 'swing',     l: 'SWG',   title: 'Swing' },
  { k: 'ema_cross', l: 'EMA',   title: 'EMA 9/21' },
  { k: 'stoch_rsi', l: 'SRS',   title: 'Stoch RSI' },
  { k: 'volume',    l: 'VOL',   title: 'Volume Spike' },
  { k: 'vwap',      l: 'VWP',   title: 'VWAP' },
]

function IndBadges({ details = {} }) {
  return (
    <span style={{ display: 'flex', gap: 2, flexWrap: 'nowrap' }}>
      {IND_DEFS.map(({ k, l, title }) => {
        const v = details[k] ?? 0
        const cls = v > 0 ? { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' }
                 : v < 0 ? { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' }
                         : { bg: 'rgba(255,255,255,0.04)', color: '#2d3748' }
        return (
          <Tooltip key={k} title={title} placement="top">
            <span style={{
              ...cls,
              fontSize: 8, fontWeight: 700, letterSpacing: '0.02em',
              padding: '2px 4px', borderRadius: 3,
              userSelect: 'none',
            }}>
              {l}
            </span>
          </Tooltip>
        )
      })}
    </span>
  )
}

export default function SignalsTable({ signals, loading, onRowClick }) {
  const [search, setSearch]           = useState('')
  const [activeFilter, setFilter]     = useState('ALL')

  const filtered = useMemo(() => {
    let d = [...signals]
    if (activeFilter !== 'ALL') d = d.filter(s => s.signal === activeFilter)
    if (search) {
      const q = search.toLowerCase()
      d = d.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    }
    return d
  }, [signals, activeFilter, search])

  const columns = [
    {
      title: 'Sembol',
      dataIndex: 'symbol',
      sorter: (a, b) => a.symbol.localeCompare(b.symbol),
      width: 120,
      render: (sym, row) => (
        <span>
          <span style={{ fontWeight: 700, fontSize: 12, color: '#e2e8f0', letterSpacing: '0.02em' }}>
            {sym.replace('.IS', '')}
          </span>
          <span style={{ display: 'block', fontSize: 9.5, color: '#374151', marginTop: 1, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.name}
          </span>
        </span>
      ),
    },
    {
      title: 'Fiyat',
      dataIndex: 'price',
      align: 'right',
      sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0),
      width: 85,
      render: v => (
        <span style={{ fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums', color: '#c9d1d9' }}>
          {v != null ? v.toLocaleString('tr-TR') + ' ₺' : '—'}
        </span>
      ),
    },
    {
      title: 'Değ.%',
      dataIndex: 'change_pct',
      align: 'right',
      sorter: (a, b) => (a.change_pct ?? 0) - (b.change_pct ?? 0),
      width: 72,
      render: v => {
        if (v == null) return <span style={{ color: '#374151' }}>—</span>
        const c = v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#4a5568'
        return <span style={{ color: c, fontWeight: 600, fontSize: 11 }}>{v > 0 ? '+' : ''}{v.toFixed(2)}%</span>
      },
    },
    {
      title: <Tooltip title="Bollinger Alt Band — ideal giriş (destek) seviyesi"><span style={{ color: '#22c55e', cursor: 'help' }}>Al ₺</span></Tooltip>,
      dataIndex: 'al_fiyati',
      align: 'right',
      sorter: (a, b) => (a.al_fiyati ?? 0) - (b.al_fiyati ?? 0),
      width: 84,
      render: v => v != null
        ? <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{v.toLocaleString('tr-TR')}</span>
        : <span style={{ color: '#374151' }}>—</span>,
    },
    {
      title: <Tooltip title="Bollinger Üst Band — ideal çıkış (direnç) seviyesi"><span style={{ color: '#ef4444', cursor: 'help' }}>Sat ₺</span></Tooltip>,
      dataIndex: 'sat_fiyati',
      align: 'right',
      sorter: (a, b) => (a.sat_fiyati ?? 0) - (b.sat_fiyati ?? 0),
      width: 84,
      render: v => v != null
        ? <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{v.toLocaleString('tr-TR')}</span>
        : <span style={{ color: '#374151' }}>—</span>,
    },
    {
      title: 'Sinyal',
      dataIndex: 'signal',
      sorter: (a, b) => {
        const O = ['GÜÇLÜ AL','AL','BEKLE','SAT','GÜÇLÜ SAT']
        return O.indexOf(a.signal) - O.indexOf(b.signal)
      },
      width: 95,
      render: sig => {
        const c = SIG_COLORS[sig] || SIG_COLORS['BEKLE']
        return (
          <span style={{
            display: 'inline-block',
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em',
            borderRadius: 4, padding: '2px 7px',
          }}>
            {sig}
          </span>
        )
      },
    },
    {
      title: 'Skor',
      dataIndex: 'score',
      sorter: (a, b) => a.score - b.score,
      width: 120,
      render: score => <ScoreDots score={score} />,
    },
    {
      title: 'RSI',
      dataIndex: 'rsi',
      align: 'right',
      sorter: (a, b) => (a.rsi ?? 50) - (b.rsi ?? 50),
      width: 52,
      render: v => {
        if (v == null) return <span style={{ color: '#374151' }}>—</span>
        const c = v < 30 ? '#22c55e' : v > 70 ? '#ef4444' : '#6b7a99'
        return <span style={{ color: c, fontWeight: 600, fontSize: 11 }}>{v.toFixed(0)}</span>
      },
    },
    {
      title: 'Göstergeler',
      dataIndex: 'details',
      width: 185,
      render: details => <IndBadges details={details} />,
    },
    {
      title: '',
      key: 'act',
      width: 32,
      render: (_, row) => (
        <span
          style={{ cursor: 'pointer', color: '#374151', fontSize: 13, padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s' }}
          onClick={e => { e.stopPropagation(); onRowClick(row.symbol) }}
          onMouseEnter={e => e.currentTarget.style.color = '#6b7a99'}
          onMouseLeave={e => e.currentTarget.style.color = '#374151'}
        >
          ↗
        </span>
      ),
    },
  ]

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: activeFilter === f ? 'rgba(59,130,246,0.12)' : 'transparent',
                border: `1px solid ${activeFilter === f ? 'rgba(59,130,246,0.35)' : '#1a2030'}`,
                color: activeFilter === f ? '#3b82f6' : '#4a5568',
                padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
                fontSize: 10.5, fontWeight: 600, fontFamily: 'inherit',
                transition: 'all 0.15s', letterSpacing: '0.02em',
              }}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <Input
          prefix={<SearchOutlined style={{ color: '#374151', fontSize: 10 }} />}
          placeholder="Hisse ara…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          size="small"
          style={{
            width: 160, background: '#111827', border: '1px solid #1a2030',
            borderRadius: 4, fontSize: 11,
          }}
        />
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="symbol"
        loading={loading}
        size="small"
        pagination={{
          pageSize: 30,
          showSizeChanger: false,
          showTotal: t => <span style={{ color: '#374151', fontSize: 10 }}>{t} hisse</span>,
          style: { marginTop: 8, marginBottom: 0 },
          size: 'small',
        }}
        scroll={{ x: 760 }}
        onRow={row => ({
          onClick: () => onRowClick(row.symbol),
          style: { cursor: 'pointer' },
        })}
        style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #1a2030' }}
      />
    </div>
  )
}
