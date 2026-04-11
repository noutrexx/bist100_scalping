import React, { useState, useEffect, useRef, useCallback } from 'react'

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => n?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'
const pnlColor = (v) => v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#6b7a99'
const pnlSign = (v) => v > 0 ? '+' : ''

// ─── Trade Row ──────────────────────────────────────────────────────────────

function TradeRow({ trade, isNew }) {
  const won = trade.pnl >= 0
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px',
      borderBottom: '1px solid #111827',
      borderLeft: `2px solid ${isNew ? (won ? '#22c55e' : '#ef4444') : 'transparent'}`,
      background: isNew ? (won ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)') : 'transparent',
      transition: 'background 1.5s, border-left-color 1.5s',
      animation: isNew ? 'ptSlideIn 0.4s ease' : 'none',
      fontSize: 11,
    }}>
      {/* Symbol + reason */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 11 }}>
          {trade.symbol?.replace('.IS', '')}
        </span>
        <span style={{
          fontSize: 8, marginLeft: 5, padding: '1px 5px', borderRadius: 3,
          fontWeight: 700, letterSpacing: '0.03em',
          background: won ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          color: won ? '#22c55e' : '#ef4444',
          border: `1px solid ${won ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        }}>
          {trade.reason}
        </span>
        <div style={{ fontSize: 9, color: '#4a5568', marginTop: 2 }}>
          {trade.entry_price} → {trade.exit_price} · {trade.qty} lot
        </div>
      </div>

      {/* PnL */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: pnlColor(trade.pnl) }}>
          {pnlSign(trade.pnl)}{fmt(trade.pnl)} ₺
        </div>
        <div style={{ fontSize: 9, color: pnlColor(trade.pnl_pct) }}>
          {pnlSign(trade.pnl_pct)}{trade.pnl_pct}%
        </div>
      </div>
    </div>
  )
}

// ─── Position Card ──────────────────────────────────────────────────────────

function PositionCard({ pos }) {
  if (!pos) return (
    <div style={{
      padding: '12px', textAlign: 'center',
      color: '#2d3748', fontSize: 11, fontStyle: 'italic',
      borderBottom: '1px solid #111827',
    }}>
      Pozisyon bekleniyor…
    </div>
  )

  return (
    <div style={{
      padding: '10px 12px',
      borderBottom: '1px solid #111827',
      background: 'rgba(59,130,246,0.04)',
      borderLeft: '2px solid #3b82f6',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 800, color: '#e2e8f0', fontSize: 13 }}>
            {pos.symbol?.replace('.IS', '')}
          </span>
          <span style={{
            fontSize: 8, marginLeft: 6, padding: '1px 6px', borderRadius: 3,
            fontWeight: 700, letterSpacing: '0.06em',
            background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
            border: '1px solid rgba(59,130,246,0.25)',
          }}>
            {pos.side} · {pos.qty} lot
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: pnlColor(pos.pnl) }}>
            {pnlSign(pos.pnl)}{fmt(pos.pnl)} ₺
          </div>
          <div style={{ fontSize: 9, color: pnlColor(pos.pnl_pct) }}>
            {pnlSign(pos.pnl_pct)}{pos.pnl_pct}%
          </div>
        </div>
      </div>

      {/* Price bars */}
      <div style={{ display: 'flex', gap: 6, fontSize: 9 }}>
        <div style={{ flex: 1, padding: '4px 6px', borderRadius: 4, background: '#0d1220', textAlign: 'center' }}>
          <div style={{ color: '#4a5568', marginBottom: 1 }}>Giriş</div>
          <div style={{ color: '#c9d1d9', fontWeight: 700 }}>{fmt(pos.entry_price)}</div>
        </div>
        <div style={{ flex: 1, padding: '4px 6px', borderRadius: 4, background: '#0d1220', textAlign: 'center' }}>
          <div style={{ color: '#4a5568', marginBottom: 1 }}>Anlık</div>
          <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{fmt(pos.current_price)}</div>
        </div>
        <div style={{ flex: 1, padding: '4px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.06)', textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: 1 }}>SL</div>
          <div style={{ color: '#ef4444', fontWeight: 700 }}>{fmt(pos.stop_loss)}</div>
        </div>
        <div style={{ flex: 1, padding: '4px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.06)', textAlign: 'center' }}>
          <div style={{ color: '#22c55e', marginBottom: 1 }}>TP</div>
          <div style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(pos.take_profit)}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

const TICK_MS = 60_000
const STATUS_MS = 15_000

export default function PaperTrader() {
  const [data, setData] = useState(null)
  const [collapsed, setCol] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newTrades, setNewTrades] = useState(new Set())
  const [tickCountdown, setTickCountdown] = useState(60)
  const [autoRun, setAutoRun] = useState(true)
  const [bistOpen, setBistOpen] = useState(true)
  const prevTradeCount = useRef(0)
  const countdownRef = useRef(null)

  // ── Fetch status ──────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/paper/status')
      const json = await res.json()
      setData(json)
      setBistOpen(json.bist_open ?? true)

      // Highlight new trades
      const total = json.total_trades || 0
      if (total > prevTradeCount.current && prevTradeCount.current > 0) {
        const ids = new Set()
        json.history?.slice(0, total - prevTradeCount.current).forEach((_, i) => ids.add(i))
        setNewTrades(ids)
        setTimeout(() => setNewTrades(new Set()), 3000)
      }
      prevTradeCount.current = total
    } catch (e) {
      console.warn('Paper trader status:', e)
    }
  }, [])

  // ── Tick (execute one round) ──────────────────────────────────────────────
  const doTick = useCallback(async () => {
    setLoading(true)
    try {
      await fetch('/api/paper/tick', { method: 'POST' })
      await fetchStatus()
    } catch (e) {
      console.warn('Paper tick error:', e)
    } finally {
      setLoading(false)
      setTickCountdown(60)
    }
  }, [fetchStatus])

  // ── Reset ─────────────────────────────────────────────────────────────────
  const doReset = async () => {
    try {
      await fetch('/api/paper/reset', { method: 'POST' })
      prevTradeCount.current = 0
      await fetchStatus()
    } catch (e) {
      console.warn('Paper reset error:', e)
    }
  }

  // ── Init & intervals ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus()
    const statusTimer = setInterval(fetchStatus, STATUS_MS)
    return () => clearInterval(statusTimer)
  }, [fetchStatus])

  // Auto-tick every 60s
  useEffect(() => {
    if (!autoRun) return
    doTick() // ilk tick
    const tickTimer = setInterval(doTick, TICK_MS)
    return () => clearInterval(tickTimer)
  }, [autoRun, doTick])

  // Countdown
  useEffect(() => {
    if (!autoRun) return
    countdownRef.current = setInterval(() => {
      setTickCountdown(c => c <= 1 ? 60 : c - 1)
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [autoRun])

  const bal = data?.balance ?? 100000
  const pnl = data?.total_pnl ?? 0
  const positions = data?.positions ?? []
  const history = data?.history ?? []
  const winRate = data?.win_rate ?? 0
  const totalTrades = data?.total_trades ?? 0

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 20,
      width: 380, zIndex: 500,
      fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
      borderRadius: 12, overflow: 'hidden',
      background: '#0a0d14',
      border: '1px solid #1f2937',
    }}>
      <style>{`
        @keyframes ptSlideIn {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes ptPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes ptGlow {
          0%, 100% { box-shadow: 0 0 4px rgba(59,130,246,0.2); }
          50%      { box-shadow: 0 0 12px rgba(59,130,246,0.5); }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: '#0f1420',
        borderBottom: collapsed ? 'none' : '1px solid #1a2030',
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', userSelect: 'none', flexShrink: 0,
      }}
        onClick={() => setCol(c => !c)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: autoRun ? '#3b82f6' : '#4a5568',
            display: 'inline-block',
            animation: autoRun ? 'ptPulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7a99', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            🤖 Paper Bot
          </span>
          <span style={{
            fontSize: 7, fontWeight: 800, letterSpacing: '0.06em',
            padding: '1px 5px', borderRadius: 3,
            background: bistOpen ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: bistOpen ? '#22c55e' : '#ef4444',
            border: `1px solid ${bistOpen ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            {bistOpen ? 'BIST AÇIK' : 'BIST KAPALI'}
          </span>
          {loading && (
            <span style={{ fontSize: 8, color: '#3b82f6' }}>işlem…</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Balance + PnL summary */}
          <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
            {fmt(bal)} ₺
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: pnlColor(pnl),
          }}>
            {pnlSign(pnl)}{fmt(pnl)}
          </span>
          <span style={{ fontSize: 11, color: '#374151' }}>{collapsed ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* ── Body (collapsible) ── */}
      {!collapsed && (
        <>
          {/* Stats bar */}
          <div style={{
            display: 'flex',
            background: '#0d1220',
            borderBottom: '1px solid #1f2937',
          }}>
            {[
              { label: 'Bakiye', value: `${fmt(bal)} ₺`, color: '#f8fafc' },
              { label: 'P&L', value: `${pnlSign(pnl)}${fmt(pnl)} ₺`, color: pnlColor(pnl) },
              { label: 'Kazanma', value: `${winRate}%`, color: winRate >= 50 ? '#10b981' : '#f43f5e' },
              { label: 'İşlem', value: `${totalTrades}`, color: '#94a3b8' },
            ].map((s, index) => (
              <div key={s.label} style={{
                flex: 1, textAlign: 'center', padding: '12px 4px',
                borderRight: index < 3 ? '1px solid #1f2937' : 'none',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Positions */}
          <div style={{ maxHeight: positions.length > 1 ? 220 : 'auto', overflowY: 'auto' }}>
            {positions.length === 0 ? (
              <div style={{
                padding: '14px 12px', textAlign: 'center',
                color: '#475569', fontSize: 11, fontStyle: 'italic',
                borderBottom: '1px solid #1f2937',
              }}>
                Yeni pozisyon fırsatı aranıyor…
              </div>
            ) : (
              positions.map((p, idx) => <PositionCard key={p.symbol || idx} pos={p} />)
            )}
          </div>

          {/* Trade history */}
          <div style={{
            background: '#0a0d14',
            maxHeight: 200,
            overflowY: 'auto',
          }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 12px', color: '#2d3748', fontSize: 11 }}>
                Henüz işlem yok
              </div>
            ) : (
              <>
                <div style={{
                  padding: '5px 12px', fontSize: 8, fontWeight: 700,
                  color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase',
                  borderBottom: '1px solid #111827', background: '#0d1220',
                }}>
                  İşlem Geçmişi
                </div>
                {history.map((t, i) => (
                  <TradeRow key={`${t.symbol}-${t.exit_time}-${i}`} trade={t} isNew={newTrades.has(i)} />
                ))}
              </>
            )}
          </div>

          {/* Footer controls */}
          <div style={{
            background: '#0d1220',
            borderTop: '1px solid #1f2937',
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Auto toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setAutoRun(a => !a) }}
                style={{
                  background: autoRun ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                  border: `1px solid ${autoRun ? 'rgba(16, 185, 129, 0.4)' : 'rgba(148, 163, 184, 0.2)'}`,
                  color: autoRun ? '#10b981' : '#94a3b8',
                  fontSize: 10, fontWeight: 700, padding: '5px 10px',
                  borderRadius: 6, cursor: 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                  outline: 'none',
                }}
              >
                {autoRun ? '⏸ OTOMATİK İŞLEM AÇIK' : '▶ OTOMATİK İŞLEM KAPALI'}
              </button>

              {/* Reset */}
              <button
                onClick={(e) => { e.stopPropagation(); doReset() }}
                style={{
                  background: 'none', border: 'none', color: '#64748b',
                  fontSize: 12, cursor: 'pointer', padding: '4px',
                  transition: 'color 0.2s',
                  outline: 'none',
                }}
                onMouseOver={(e) => e.target.style.color = '#f8fafc'}
                onMouseOut={(e) => e.target.style.color = '#64748b'}
                title="Sıfırla (Bakiye Yükle)"
              >
                ↻
              </button>
            </div>

            <span style={{ fontSize: 9, fontWeight: 600, color: bistOpen ? '#64748b' : '#f43f5e', letterSpacing: '0.02em' }}>
              {autoRun ? `Yenileme: ${tickCountdown}s` : 'Durduruldu'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
