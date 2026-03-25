import React, { useEffect, useRef } from 'react'
import { Modal, Tabs, Row, Col, Card, Spin, Typography } from 'antd'
import { createChart } from 'lightweight-charts'

const { Text } = Typography

const SIG_COLORS = {
  'GÜÇLÜ AL':  '#00e676',
  'AL':        '#22c55e',
  'BEKLE':     '#4a5568',
  'SAT':       '#ef4444',
  'GÜÇLÜ SAT': '#ff1744',
}

const CHART_OPTS = {
  layout:    { background: { color: '#0a0d14' }, textColor: '#374151' },
  grid:      { vertLines: { color: '#111827' }, horzLines: { color: '#111827' } },
  crosshair: { mode: 1 },
  timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#1e2738' },
  rightPriceScale: { borderColor: '#1e2738', textColor: '#4a5568' },
  handleScroll: true,
  handleScale: true,
}

function CandleChart({ candles }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !candles?.length) return
    ref.current.innerHTML = ''
    const chart = createChart(ref.current, { ...CHART_OPTS, height: 260 })

    // Candlestick
    const cs = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#1a5c2a', wickDownColor: '#7f1d1d',
    })
    cs.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })))

    // Bollinger Bands
    chart.addLineSeries({ color: 'rgba(139,92,246,0.4)', lineWidth: 1, title: 'BB↑', lastValueVisible: false, priceLineVisible: false })
      .setData(candles.filter(c => c.bb_upper  != null).map(c => ({ time: c.time, value: c.bb_upper })))
    chart.addLineSeries({ color: 'rgba(100,116,139,0.3)', lineWidth: 1, lineStyle: 2, title: '', lastValueVisible: false, priceLineVisible: false })
      .setData(candles.filter(c => c.bb_middle != null).map(c => ({ time: c.time, value: c.bb_middle })))
    chart.addLineSeries({ color: 'rgba(139,92,246,0.4)', lineWidth: 1, title: 'BB↓', lastValueVisible: false, priceLineVisible: false })
      .setData(candles.filter(c => c.bb_lower  != null).map(c => ({ time: c.time, value: c.bb_lower })))

    // EMA 9/21
    chart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, title: 'EMA9', lastValueVisible: false, priceLineVisible: false })
      .setData(candles.filter(c => c.ema_fast != null).map(c => ({ time: c.time, value: c.ema_fast })))
    chart.addLineSeries({ color: '#6366f1', lineWidth: 1.5, title: 'EMA21', lastValueVisible: false, priceLineVisible: false })
      .setData(candles.filter(c => c.ema_slow != null).map(c => ({ time: c.time, value: c.ema_slow })))

    // VWAP
    chart.addLineSeries({ color: 'rgba(99,179,237,0.6)', lineWidth: 1, lineStyle: 3, title: 'VWAP', lastValueVisible: false, priceLineVisible: false })
      .setData(candles.filter(c => c.vwap != null).map(c => ({ time: c.time, value: c.vwap })))

    // Swing markers
    const markers = []
    candles.forEach(c => {
      if (c.swing_high) markers.push({ time: c.time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: '' })
      if (c.swing_low)  markers.push({ time: c.time, position: 'belowBar',  color: '#22c55e', shape: 'arrowUp',   text: '' })
      if (c.vol_spike)  markers.push({ time: c.time, position: 'belowBar',  color: '#f59e0b', shape: 'circle',    text: '' })
    })
    if (markers.length) cs.setMarkers(markers)
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [candles])
  return <div ref={ref} style={{ borderRadius: 4, overflow: 'hidden' }} />
}

function RsiStochChart({ candles }) {
  const rsiRef  = useRef(null)
  const srsiRef = useRef(null)

  useEffect(() => {
    if (!rsiRef.current || !candles?.length) return
    rsiRef.current.innerHTML = ''
    const opts = { ...CHART_OPTS, height: 90, timeScale: { ...CHART_OPTS.timeScale, visible: false } }
    const chart = createChart(rsiRef.current, opts)
    const rsiData = candles.filter(c => c.rsi != null).map(c => ({ time: c.time, value: c.rsi }))
    chart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, title: 'RSI', lastValueVisible: true }).setData(rsiData)
    if (rsiData.length) {
      const [f, l] = [rsiData[0].time, rsiData[rsiData.length-1].time]
      chart.addLineSeries({ color: 'rgba(239,68,68,0.3)', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false }).setData([{ time: f, value: 70 }, { time: l, value: 70 }])
      chart.addLineSeries({ color: 'rgba(34,197,94,0.3)',  lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false }).setData([{ time: f, value: 30 }, { time: l, value: 30 }])
    }
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [candles])

  useEffect(() => {
    if (!srsiRef.current || !candles?.length) return
    srsiRef.current.innerHTML = ''
    const opts = { ...CHART_OPTS, height: 90, timeScale: { ...CHART_OPTS.timeScale, visible: false } }
    const chart = createChart(srsiRef.current, opts)
    const srsiData = candles.filter(c => c.stoch_rsi != null).map(c => ({ time: c.time, value: c.stoch_rsi * 100 }))
    chart.addLineSeries({ color: '#a78bfa', lineWidth: 1.5, title: 'StochRSI', lastValueVisible: true }).setData(srsiData)
    if (srsiData.length) {
      const [f, l] = [srsiData[0].time, srsiData[srsiData.length-1].time]
      chart.addLineSeries({ color: 'rgba(239,68,68,0.3)', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false }).setData([{ time: f, value: 80 }, { time: l, value: 80 }])
      chart.addLineSeries({ color: 'rgba(34,197,94,0.3)',  lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false }).setData([{ time: f, value: 20 }, { time: l, value: 20 }])
    }
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [candles])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', letterSpacing: '0.08em' }}>RSI 14</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', letterSpacing: '0.08em' }}>STOCH RSI</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div ref={rsiRef}  style={{ borderRadius: 4, overflow: 'hidden' }} />
        <div ref={srsiRef} style={{ borderRadius: 4, overflow: 'hidden' }} />
      </div>
    </>
  )
}

function MacdChart({ candles }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !candles?.length) return
    ref.current.innerHTML = ''
    const opts = { ...CHART_OPTS, height: 90, timeScale: { ...CHART_OPTS.timeScale, visible: false } }
    const chart = createChart(ref.current, opts)
    chart.addHistogramSeries({ priceFormat: { type: 'price', precision: 4 }, lastValueVisible: false })
      .setData(candles.filter(c => c.macd_hist != null).map(c => ({
        time: c.time, value: c.macd_hist,
        color: c.macd_hist >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
      })))
    chart.addLineSeries({ color: '#3b82f6', lineWidth: 1.5, title: 'MACD', lastValueVisible: true })
      .setData(candles.filter(c => c.macd != null).map(c => ({ time: c.time, value: c.macd })))
    chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'Sig', lastValueVisible: false })
      .setData(candles.filter(c => c.macd_signal != null).map(c => ({ time: c.time, value: c.macd_signal })))
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [candles])
  return <div ref={ref} style={{ borderRadius: 4, overflow: 'hidden', marginTop: 6 }} />
}

const IND_CARDS = [
  {
    key: 'rsi', title: 'RSI (14)',
    val: (sig) => sig.rsi != null ? sig.rsi.toFixed(1) : '—',
    dir: (sig) => sig.details?.rsi,
    desc: (sig) => sig.rsi < 30 ? 'Aşırı Satım ← AL bölgesi' : sig.rsi > 70 ? 'Aşırı Alım ← SAT bölgesi' : 'Nötr',
  },
  {
    key: 'bollinger', title: 'Bollinger 20,2',
    val: (sig, c) => c?.bb_lower != null ? `${c.bb_lower.toFixed(2)} – ${c.bb_upper?.toFixed(2)}` : '—',
    dir: (sig) => sig.details?.bollinger,
    desc: (sig, c) => !c ? '—' : c.close < c.bb_lower ? 'Alt bant kırıldı' : c.close > c.bb_upper ? 'Üst bant kırıldı' : 'Bant içinde',
  },
  {
    key: 'macd', title: 'MACD 12/26/9',
    val: (sig) => sig.macd_hist != null ? sig.macd_hist.toFixed(4) : '—',
    dir: (sig) => sig.details?.macd,
    desc: (sig) => sig.details?.macd > 0 ? 'Yukarı kesim' : sig.details?.macd < 0 ? 'Aşağı kesim' : 'Kesim yok',
  },
  {
    key: 'swing', title: 'Swing Points',
    val: (sig) => sig.details?.swing === 1 ? 'DİP' : sig.details?.swing === -1 ? 'TEPE' : 'YOK',
    dir: (sig) => sig.details?.swing,
    desc: (sig) => sig.details?.swing === 1 ? 'Yerel dip (son 3 mum)' : sig.details?.swing === -1 ? 'Yerel tepe (son 3 mum)' : 'Belirgin nokta yok',
  },
  {
    key: 'ema_cross', title: 'EMA 9/21',
    val: (sig, c) => c?.ema_fast != null ? `${c.ema_fast.toFixed(2)} / ${c.ema_slow?.toFixed(2)}` : '—',
    dir: (sig) => sig.details?.ema_cross,
    desc: (sig) => sig.details?.ema_cross > 0 ? 'EMA9 > EMA21 (boğa)' : sig.details?.ema_cross < 0 ? 'EMA9 < EMA21 (ayı)' : 'Nötr',
  },
  {
    key: 'stoch_rsi', title: 'Stochastic RSI',
    val: (sig) => sig.stoch_rsi != null ? (sig.stoch_rsi * 100).toFixed(1) : '—',
    dir: (sig) => sig.details?.stoch_rsi,
    desc: (sig) => sig.details?.stoch_rsi > 0 ? '< 20 → Aşırı satım' : sig.details?.stoch_rsi < 0 ? '> 80 → Aşırı alım' : 'Nötr bölge',
  },
  {
    key: 'volume', title: 'Volume Spike',
    val: (sig) => sig.vol_spike ? 'SPIKE' : 'NORMAL',
    dir: (sig) => sig.details?.volume,
    desc: (sig) => sig.details?.volume !== 0 ? 'Hacim ortalamanın 1.5× üstü' : 'Normal hacim',
  },
  {
    key: 'vwap', title: 'VWAP',
    val: (sig) => sig.vwap != null ? sig.vwap.toFixed(2) + ' ₺' : '—',
    dir: (sig) => sig.details?.vwap,
    desc: (sig) => sig.details?.vwap > 0 ? 'Fiyat VWAP altında (ucuz)' : sig.details?.vwap < 0 ? 'Fiyat VWAP üstünde (pahalı)' : 'VWAP seviyesinde',
  },
]

function IndicatorGrid({ sig, candles }) {
  const last = candles?.length ? candles[candles.length - 1] : {}
  return (
    <Row gutter={[8, 8]}>
      {IND_CARDS.map(card => {
        const dir   = card.dir(sig)
        const color = dir > 0 ? '#22c55e' : dir < 0 ? '#ef4444' : '#4a5568'
        const arrow = dir > 0 ? '▲' : dir < 0 ? '▼' : '—'
        return (
          <Col key={card.key} span={12}>
            <div style={{
              background: '#0f1420', border: '1px solid #1e2738',
              borderRadius: 6, padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#374151', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{card.title}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color }}>{arrow}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1.1, marginBottom: 3 }}>{card.val(sig, last)}</div>
              <div style={{ fontSize: 10, color: '#374151' }}>{card.desc(sig, last)}</div>
            </div>
          </Col>
        )
      })}
    </Row>
  )
}

// Chart legend
function ChartLegend() {
  const items = [
    { color: '#f59e0b', label: 'EMA 9' },
    { color: '#6366f1', label: 'EMA 21' },
    { color: 'rgba(99,179,237,0.7)', label: 'VWAP' },
    { color: 'rgba(139,92,246,0.6)', label: 'Bollinger' },
  ]
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
      {items.map(it => (
        <span key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: '#4a5568' }}>
          <span style={{ width: 16, height: 2, background: it.color, display: 'inline-block', borderRadius: 1 }} />
          {it.label}
        </span>
      ))}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: '#4a5568' }}>
        <span style={{ width: 7, height: 7, background: '#f59e0b', borderRadius: '50%', display: 'inline-block' }} />
        Vol Spike
      </span>
    </div>
  )
}

export default function StockModal({ open, loading, data, onClose }) {
  const sig    = data?.signal || {}
  const ticker = (sig.symbol || data?.symbol || '').replace('.IS', '')
  const name   = sig.name || data?.name || ''
  const signal = sig.signal || 'BEKLE'
  const sigCol = SIG_COLORS[signal] || '#4a5568'

  const tabItems = [
    {
      key: 'chart',
      label: 'Grafik',
      children: loading
        ? <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        : data
          ? <>
              <ChartLegend />
              <CandleChart       candles={data.candles} />
              <RsiStochChart     candles={data.candles} />
              <div style={{ fontSize: 9, fontWeight: 700, color: '#374151', letterSpacing: '0.08em', marginTop: 10, marginBottom: 4 }}>MACD 12/26/9</div>
              <MacdChart         candles={data.candles} />
            </>
          : null,
    },
    {
      key: 'indicators',
      label: 'Göstergeler (8)',
      children: loading
        ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        : data ? <IndicatorGrid sig={sig} candles={data.candles} /> : null,
    },
  ]

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={820}
      destroyOnClose
      styles={{
        content: { background: '#0a0d14', border: '1px solid #1e2738', borderRadius: 8, padding: 0 },
        header:  { background: '#0a0d14', borderBottom: '1px solid #1e2738', padding: '10px 16px 8px', margin: 0 },
        body:    { padding: '0 16px 14px' },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Text style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>{ticker}</Text>
          <Text style={{ color: '#374151', fontSize: 11, fontWeight: 400 }}>{name}</Text>
          <span style={{
            fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: `${sigCol}14`, color: sigCol, border: `1px solid ${sigCol}33`,
            letterSpacing: '0.05em',
          }}>
            {signal}
          </span>
          {sig.price != null && (
            <>
              <Text style={{ color: '#c9d1d9', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {sig.price.toLocaleString('tr-TR')} ₺
              </Text>
              {sig.change_pct != null && (
                <Text style={{ color: sig.change_pct >= 0 ? '#22c55e' : '#ef4444', fontSize: 11 }}>
                  {sig.change_pct > 0 ? '+' : ''}{sig.change_pct.toFixed(2)}%
                </Text>
              )}
            </>
          )}
          {sig.vol_spike && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 6px', borderRadius: 4 }}>
              ⚡ VOL SPIKE
            </span>
          )}
        </div>
      }
    >
      <Tabs items={tabItems} size="small" style={{ marginTop: 4 }} />
    </Modal>
  )
}
