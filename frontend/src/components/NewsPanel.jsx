import React, { useState, useEffect, useRef } from 'react'

// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(isoStr) {
  try {
    const diff = (Date.now() - new Date(isoStr).getTime()) / 1000
    if (diff < 60)   return `${Math.round(diff)}s önce`
    if (diff < 3600) return `${Math.round(diff / 60)}dk önce`
    return `${Math.round(diff / 3600)}sa önce`
  } catch {
    return ''
  }
}

const ACTION_META = {
  AL:    { bg: 'rgba(34,197,94,0.12)',  border: '#22c55e', text: '#22c55e',  icon: '📈' },
  SAT:   { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', text: '#ef4444',  icon: '📉' },
  BEKLE: { bg: 'rgba(245,158,11,0.10)',border: '#f59e0b', text: '#f59e0b',  icon: '⚡' },
}

// ─── Single news card ────────────────────────────────────────────────────────

function NewsCard({ item, isNew }) {
  const meta = ACTION_META[item.action] || ACTION_META['BEKLE']

  return (
    <a
      href={item.url !== '#' ? item.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        padding: '9px 12px',
        borderBottom: '1px solid #111827',
        borderLeft: `2px solid ${isNew ? meta.border : 'transparent'}`,
        background: isNew ? meta.bg : 'transparent',
        transition: 'background 1.8s, border-left-color 1.8s',
        animation: isNew ? 'newsSlideIn 0.4s ease' : 'none',
        cursor: item.url !== '#' ? 'pointer' : 'default',
      }}
    >
      {/* Top row: action badge + source + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
          color: meta.text,
          background: meta.bg,
          border: `1px solid ${meta.border}33`,
          padding: '1px 6px', borderRadius: 3, flexShrink: 0,
        }}>
          {meta.icon} {item.action}
        </span>
        <span style={{ fontSize: 9, color: '#4a5568', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.source}
        </span>
        <span style={{ fontSize: 9, color: '#2d3748', flexShrink: 0 }}>
          {timeAgo(item.published_at)}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 11, fontWeight: 600, color: '#c9d1d9',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        marginBottom: 5,
      }}>
        {item.title}
      </div>

      {/* Impact description */}
      <div style={{
        fontSize: 10, color: '#6b7a99', lineHeight: 1.35,
        marginBottom: item.symbols?.length ? 5 : 0,
      }}>
        {item.impact_desc}
      </div>

      {/* Affected symbols */}
      {item.symbols?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {item.symbols.map(sym => (
            <span key={sym} style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '0.04em',
              color: '#3b82f6',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.25)',
              padding: '1px 5px', borderRadius: 3,
            }}>
              {sym}
            </span>
          ))}
        </div>
      )}
    </a>
  )
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

const POLL_MS = 60_000  // 60 saniye

export default function NewsPanel() {
  const [news, setNews]         = useState([])
  const [newIds, setNewIds]     = useState(new Set())
  const [collapsed, setCol]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const prevIds                 = useRef(new Set())

  const fetchNews = async (initial = false) => {
    if (!initial) setLoading(true)
    try {
      const res  = await fetch('/api/news')
      const data = await res.json()
      const items = data.items || []

      const fresh = new Set()
      if (!initial) {
        items.forEach(it => {
          if (!prevIds.current.has(it.id)) fresh.add(it.id)
        })
      }

      setNews(items)
      prevIds.current = new Set(items.map(it => it.id))

      if (fresh.size > 0) {
        setNewIds(fresh)
        setTimeout(() => setNewIds(new Set()), 3000)
      }
    } catch (e) {
      console.warn('Haber yüklenemedi:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews(true)
    const t = setInterval(() => fetchNews(false), POLL_MS)
    return () => clearInterval(t)
  }, [])

  const buyCnt  = news.filter(n => n.action === 'AL').length
  const sellCnt = news.filter(n => n.action === 'SAT').length
  const holdCnt = news.filter(n => n.action === 'BEKLE').length

  return (
    <div style={{
      position:  'fixed',
      bottom:    20,
      right:     20,
      width:     340,
      zIndex:    500,
      fontFamily: 'Inter, sans-serif',
      display:   'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      borderRadius: 10,
      overflow: 'hidden',
      border: '1px solid #1a2030',
    }}>
      <style>{`
        @keyframes newsSlideIn {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes newsPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: '#0f1420',
        borderBottom: collapsed ? 'none' : '1px solid #1a2030',
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', userSelect: 'none',
        flexShrink: 0,
      }}
        onClick={() => setCol(c => !c)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#f59e0b',
            display: 'inline-block',
            animation: 'newsPulse 2s infinite',
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            📰 Piyasa Haberleri
          </span>
          {loading && (
            <span style={{ fontSize: 8, color: '#374151' }}>yükleniyor…</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Sentiment summary */}
          {!collapsed && news.length > 0 && (
            <span style={{ display: 'flex', gap: 5, fontSize: 9 }}>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>AL {buyCnt}</span>
              <span style={{ color: '#1e2738' }}>|</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>SAT {sellCnt}</span>
              <span style={{ color: '#1e2738' }}>|</span>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>BEKLE {holdCnt}</span>
            </span>
          )}
          <span style={{ fontSize: 11, color: '#374151' }}>{collapsed ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* ── Feed (collapsible) ── */}
      {!collapsed && (
        <div style={{
          background: '#0a0d14',
          maxHeight: 420,
          overflowY: 'auto',
        }}>
          {news.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 12px', color: '#2d3748', fontSize: 11 }}>
              Haber bekleniyor…
            </div>
          ) : (
            news.map(item => (
              <NewsCard key={item.id} item={item} isNew={newIds.has(item.id)} />
            ))
          )}
        </div>
      )}

      {/* ── Footer ── */}
      {!collapsed && (
        <div style={{
          background: '#0a0d14',
          borderTop: '1px solid #111827',
          padding: '4px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 8, color: '#2d3748' }}>60sn'de bir güncellenir · {news.length} haber</span>
          <button
            onClick={(e) => { e.stopPropagation(); fetchNews(false) }}
            style={{
              background: 'none', border: 'none', color: '#374151',
              fontSize: 10, cursor: 'pointer', padding: '2px 4px',
            }}
            title="Yenile"
          >
            ↻
          </button>
        </div>
      )}
    </div>
  )
}
