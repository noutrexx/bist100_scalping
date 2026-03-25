/* ─── app.js ───────────────────────────────────────────────────────────────
   BIST Trade Bot — Frontend Ana Uygulama
   Özellikler:
   • /api/signals'den sinyal verisi çekme (30 sn otomatik yenileme)
   • Filtreleme (sinyal tipi) + arama (sembol adı)
   • Tabloda sıralama
   • Hisse detay modalı: TradingView Lightweight Chart (mum, RSI, MACD)
────────────────────────────────────────────────────────────────────────── */

const API_BASE      = "";        // Aynı origin
const REFRESH_MS    = 30_000;    // 30 saniye
const SIGNAL_ORDER  = ["GÜÇLÜ AL","AL","BEKLE","SAT","GÜÇLÜ SAT"];

let allSignals      = [];
let currentFilter   = "ALL";
let currentSearch   = "";
let sortCol         = "score";
let sortDir         = -1;        // -1 = desc (büyükten küçüğe)
let refreshTimer    = null;

// TradingView grafik referansları
let tvChart = null, tvRsiChart = null, tvMacdChart = null;

// ─────────────────────────────────────────────────────────────────────────
// Başlatma
// ─────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  bindFilters();
  bindSearch();
  bindTableHeaders();
  bindModal();
  document.getElementById("refresh-btn").addEventListener("click", () => loadSignals(true));
  loadSignals();
  refreshTimer = setInterval(() => loadSignals(), REFRESH_MS);
});

// ─────────────────────────────────────────────────────────────────────────
// API Çağrıları
// ─────────────────────────────────────────────────────────────────────────
async function loadSignals(forceShow = false) {
  showLoading(true);
  spinRefreshBtn(true);
  try {
    const res  = await fetch(`${API_BASE}/api/signals`);
    const data = await res.json();
    allSignals = data.signals || [];
    updateStats();
    renderTable();
    document.getElementById("last-update").textContent =
      "Son güncelleme: " + new Date().toLocaleTimeString("tr-TR");
  } catch (e) {
    console.error("Sinyal yüklenemedi:", e);
  } finally {
    showLoading(false);
    spinRefreshBtn(false);
  }
}

async function loadStockDetail(symbol) {
  try {
    const res  = await fetch(`${API_BASE}/api/stock/${symbol}`);
    const data = await res.json();
    openModal(data);
  } catch (e) {
    console.error("Hisse detayı yüklenemedi:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Stat kartları güncelle
// ─────────────────────────────────────────────────────────────────────────
function updateStats() {
  const counts = {"GÜÇLÜ AL":0, "AL":0, "BEKLE":0, "SAT":0, "GÜÇLÜ SAT":0};
  allSignals.forEach(s => {
    if (counts.hasOwnProperty(s.signal)) counts[s.signal]++;
  });
  document.getElementById("cnt-strong-buy").textContent  = counts["GÜÇLÜ AL"];
  document.getElementById("cnt-buy").textContent          = counts["AL"];
  document.getElementById("cnt-hold").textContent         = counts["BEKLE"];
  document.getElementById("cnt-sell").textContent         = counts["SAT"];
  document.getElementById("cnt-strong-sell").textContent  = counts["GÜÇLÜ SAT"];
}

// ─────────────────────────────────────────────────────────────────────────
// Tablo Render
// ─────────────────────────────────────────────────────────────────────────
function renderTable() {
  let data = [...allSignals];

  // Filtre
  if (currentFilter !== "ALL") {
    data = data.filter(s => s.signal === currentFilter);
  }

  // Arama
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    data = data.filter(s =>
      s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q)
    );
  }

  // Sıralama
  data.sort((a, b) => {
    let va = a[sortCol]; let vb = b[sortCol];
    if (sortCol === "signal") {
      va = SIGNAL_ORDER.indexOf(a.signal);
      vb = SIGNAL_ORDER.indexOf(b.signal);
    }
    if (va == null) va = -Infinity;
    if (vb == null) vb = -Infinity;
    return sortDir * ((va > vb ? 1 : va < vb ? -1 : 0));
  });

  const tbody = document.getElementById("signals-tbody");
  const empty = document.getElementById("empty-state");

  if (data.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  tbody.innerHTML = data.map(s => rowHTML(s)).join("");

  // Satır tıklama → detay
  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", (e) => {
      if (e.target.closest(".detail-btn")) return; // buton kendi handler'ında
      const sym = tr.dataset.symbol;
      if (sym) loadStockDetail(sym);
    });
  });

  tbody.querySelectorAll(".detail-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      loadStockDetail(btn.dataset.symbol);
    });
  });
}

function rowHTML(s) {
  const changeClass = s.change_pct >= 0 ? "positive" : "negative";
  const changeSign  = s.change_pct >= 0 ? "+" : "";

  const rsiClass = s.rsi == null ? "" :
    s.rsi < 30 ? "rsi-oversold" : s.rsi > 70 ? "rsi-overbought" : "rsi-neutral";

  const d = s.details || {};
  const indDots = ["rsi","bollinger","macd","swing"].map(k => {
    const v = d[k] || 0;
    const cls = v > 0 ? "pos" : v < 0 ? "neg" : "neu";
    const lbl = { rsi:"R", bollinger:"B", macd:"M", swing:"S" }[k];
    return `<span class="ind-dot ${cls}" title="${k.toUpperCase()}">${lbl}</span>`;
  }).join("");

  const scoreDots = mkScoreDots(s.score);
  const scoreNum  = s.score > 0 ? `+${s.score}` : s.score;

  return `
  <tr data-symbol="${s.symbol}" title="${s.name} — ${s.signal}">
    <td class="symbol-cell">${s.symbol.replace(".IS","")}<small>${s.name}</small></td>
    <td class="price-cell">${s.price != null ? s.price.toLocaleString("tr-TR") + " ₺" : "—"}</td>
    <td class="change-cell ${changeClass}">${s.change_pct != null ? changeSign + s.change_pct.toFixed(2) + "%" : "—"}</td>
    <td><span class="signal-badge badge-${s.signal}">${s.signal}</span></td>
    <td>
      <div class="score-bar">
        <span class="score-num" style="color:${scoreColor(s.score)}">${scoreNum}</span>
        <div class="score-dots">${scoreDots}</div>
      </div>
    </td>
    <td class="rsi-cell ${rsiClass}">${s.rsi != null ? s.rsi.toFixed(1) : "—"}</td>
    <td><div class="ind-dots">${indDots}</div></td>
    <td><button class="detail-btn" data-symbol="${s.symbol}">📊</button></td>
  </tr>`;
}

function mkScoreDots(score) {
  // 4 yeşil (AL) + 4 kırmızı (SAT) nokta, ortadan sağa/sola açılır
  const dots = [];
  for (let i = 4; i >= 1; i--) {
    const active = score >= i;
    dots.push(`<span class="score-dot ${active ? "active-buy" : ""}"></span>`);
  }
  for (let i = 1; i <= 4; i++) {
    const active = score <= -i;
    dots.push(`<span class="score-dot ${active ? "active-sell" : ""}"></span>`);
  }
  return dots.join("");
}

function scoreColor(score) {
  if (score >= 3) return "var(--green-strong)";
  if (score >= 1) return "var(--green)";
  if (score <= -3) return "var(--red-strong)";
  if (score <= -1) return "var(--red)";
  return "var(--text-muted)";
}

// ─────────────────────────────────────────────────────────────────────────
// Filtreler
// ─────────────────────────────────────────────────────────────────────────
function bindFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTable();
    });
  });
}

function bindSearch() {
  document.getElementById("search-input").addEventListener("input", e => {
    currentSearch = e.target.value.trim();
    renderTable();
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Sıralama
// ─────────────────────────────────────────────────────────────────────────
function bindTableHeaders() {
  document.querySelectorAll(".sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) {
        sortDir = -sortDir;
      } else {
        sortCol = col;
        sortDir = -1;
      }
      document.querySelectorAll(".sortable").forEach(t => {
        t.classList.remove("sort-asc", "sort-desc");
      });
      th.classList.add(sortDir === 1 ? "sort-asc" : "sort-desc");
      renderTable();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Modal + TradingView Lightweight Charts
// ─────────────────────────────────────────────────────────────────────────
function bindModal() {
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("modal-overlay")) closeModal();
  });
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const id = tab.dataset.tab;
      document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
      document.getElementById(`tab-${id}`).style.display = "block";
      if (id === "chart" && tvChart) tvChart.timeScale().fitContent();
    });
  });
}

function openModal(data) {
  document.getElementById("modal-overlay").style.display = "flex";

  const sig = data.signal || {};
  document.getElementById("modal-title").textContent =
    `${sig.name || data.name} (${sig.symbol || data.symbol})`;

  const badge = document.getElementById("modal-signal-badge");
  badge.textContent = sig.signal || "—";
  badge.className = `signal-badge badge-${sig.signal || "BEKLE"}`;

  // Grafik sekmesini göster
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelector('.tab[data-tab="chart"]').classList.add("active");
  document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
  document.getElementById("tab-chart").style.display = "block";

  buildCharts(data.candles || []);
  buildIndicatorGrid(sig, data.candles);
}

function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
  destroyCharts();
}

function destroyCharts() {
  if (tvChart)     { tvChart.remove();     tvChart = null; }
  if (tvRsiChart)  { tvRsiChart.remove();  tvRsiChart = null; }
  if (tvMacdChart) { tvMacdChart.remove(); tvMacdChart = null; }
}

function buildCharts(candles) {
  destroyCharts();
  if (!candles || candles.length === 0) return;

  const chartOpts = {
    layout:     { background: { color: "#0d1422" }, textColor: "#64748b" },
    grid:       { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
    crosshair:  { mode: 1 },
    timeScale:  { timeVisible: true, secondsVisible: false, borderColor: "#1e293b" },
    rightPriceScale: { borderColor: "#1e293b" },
  };

  // ── Mum grafiği ──────────────────────────────────────
  const chartEl = document.getElementById("tv-chart");
  chartEl.innerHTML = "";
  tvChart = LightweightCharts.createChart(chartEl, { ...chartOpts, height: 320 });

  const candleSeries = tvChart.addCandlestickSeries({
    upColor: "#22c55e", downColor: "#ef4444",
    borderUpColor: "#22c55e", borderDownColor: "#ef4444",
    wickUpColor: "#22c55e", wickDownColor: "#ef4444",
  });
  candleSeries.setData(candles.map(c => ({
    time: c.time, open: c.open, high: c.high, low: c.low, close: c.close
  })));

  // Bollinger bantları
  const bbUpper  = tvChart.addLineSeries({ color: "rgba(139,92,246,0.6)", lineWidth: 1, title: "BB Üst"  });
  const bbMiddle = tvChart.addLineSeries({ color: "rgba(100,116,139,0.5)", lineWidth: 1, title: "BB Ort" });
  const bbLower  = tvChart.addLineSeries({ color: "rgba(139,92,246,0.6)", lineWidth: 1, title: "BB Alt"  });

  const bbUp = [], bbMid = [], bbLow = [];
  candles.forEach(c => {
    if (c.bb_upper  != null) bbUp .push({ time: c.time, value: c.bb_upper  });
    if (c.bb_middle != null) bbMid.push({ time: c.time, value: c.bb_middle });
    if (c.bb_lower  != null) bbLow.push({ time: c.time, value: c.bb_lower  });
  });
  bbUpper .setData(bbUp);
  bbMiddle.setData(bbMid);
  bbLower .setData(bbLow);

  // Swing işaretleyicileri
  const markers = [];
  candles.forEach(c => {
    if (c.swing_high) markers.push({ time: c.time, position: "aboveBar", color: "#ef4444", shape: "arrowDown", text: "T" });
    if (c.swing_low)  markers.push({ time: c.time, position: "belowBar", color: "#22c55e", shape: "arrowUp",   text: "D" });
  });
  if (markers.length) candleSeries.setMarkers(markers);

  tvChart.timeScale().fitContent();

  // ── RSI grafiği ──────────────────────────────────────
  const rsiEl = document.getElementById("tv-rsi-chart");
  rsiEl.innerHTML = "";
  tvRsiChart = LightweightCharts.createChart(rsiEl, { ...chartOpts, height: 130 });
  tvRsiChart.timeScale().applyOptions({ visible: false });

  const rsiSeries = tvRsiChart.addLineSeries({ color: "#f59e0b", lineWidth: 2, title: "RSI" });
  const rsiData   = candles.filter(c => c.rsi != null).map(c => ({ time: c.time, value: c.rsi }));
  rsiSeries.setData(rsiData);

  // 70 / 30 çizgileri
  const ob = tvRsiChart.addLineSeries({ color: "rgba(239,68,68,0.4)",  lineWidth: 1, lineStyle: 2 });
  const os = tvRsiChart.addLineSeries({ color: "rgba(34,197,94,0.4)",  lineWidth: 1, lineStyle: 2 });
  if (rsiData.length) {
    const first = rsiData[0].time, last = rsiData[rsiData.length-1].time;
    ob.setData([{ time: first, value: 70 }, { time: last, value: 70 }]);
    os.setData([{ time: first, value: 30 }, { time: last, value: 30 }]);
  }
  tvRsiChart.timeScale().fitContent();

  // ── MACD grafiği ─────────────────────────────────────
  const macdEl = document.getElementById("tv-macd-chart");
  macdEl.innerHTML = "";
  tvMacdChart = LightweightCharts.createChart(macdEl, { ...chartOpts, height: 130 });
  tvMacdChart.timeScale().applyOptions({ visible: false });

  const macdLine = tvMacdChart.addLineSeries({ color: "#3b82f6", lineWidth: 2, title: "MACD" });
  const sigLine  = tvMacdChart.addLineSeries({ color: "#f59e0b", lineWidth: 1, title: "Signal" });
  const histSeries = tvMacdChart.addHistogramSeries({
    color: "#22c55e", priceFormat: { type: "price", precision: 4 }, title: "Hist"
  });

  const macdData = [], sigData = [], histData = [];
  candles.forEach(c => {
    if (c.macd        != null) macdData.push({ time: c.time, value: c.macd });
    if (c.macd_signal != null) sigData .push({ time: c.time, value: c.macd_signal });
    if (c.macd_hist   != null) histData.push({
      time: c.time, value: c.macd_hist,
      color: c.macd_hist >= 0 ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)"
    });
  });
  macdLine  .setData(macdData);
  sigLine   .setData(sigData);
  histSeries.setData(histData);
  tvMacdChart.timeScale().fitContent();
}

function buildIndicatorGrid(sig, candles) {
  const d     = sig.details || {};
  const last  = candles && candles.length ? candles[candles.length - 1] : {};

  const items = [
    {
      title:  "RSI",
      value:  sig.rsi != null ? sig.rsi.toFixed(1) : "—",
      signal: d.rsi,
      desc:   sig.rsi < 30 ? "Aşırı Satım Bölgesi" : sig.rsi > 70 ? "Aşırı Alım Bölgesi" : "Nötr Bölge",
    },
    {
      title:  "Bollinger Bantları",
      value:  last.bb_lower != null ? `Alt: ${last.bb_lower.toFixed(2)}` : "—",
      signal: d.bollinger,
      desc:   last.close != null && last.bb_lower != null
        ? (last.close < last.bb_lower ? "Fiyat Alt Bandın Altında" : last.close > last.bb_upper ? "Fiyat Üst Bandın Üstünde" : "Bant İçinde")
        : "—",
    },
    {
      title:  "MACD",
      value:  sig.macd_hist != null ? sig.macd_hist.toFixed(4) : "—",
      signal: d.macd,
      desc:   d.macd > 0 ? "Yukarı Kesim (AL)" : d.macd < 0 ? "Aşağı Kesim (SAT)" : "Kesim Yok",
    },
    {
      title:  "Swing Noktası",
      value:  d.swing === 1 ? "DİP" : d.swing === -1 ? "TEPE" : "YOK",
      signal: d.swing,
      desc:   d.swing === 1 ? "Son 3 mumda Yerel Dip" : d.swing === -1 ? "Son 3 mumda Yerel Tepe" : "Son mumlarda belirgin swing yok",
    },
  ];

  document.getElementById("indicator-grid").innerHTML = items.map(it => {
    const sigCls  = it.signal > 0 ? "sig-buy" : it.signal < 0 ? "sig-sell" : "sig-hold";
    const sigText = it.signal > 0 ? "▲ AL"    : it.signal < 0 ? "▼ SAT"   : "— BEKLE";
    const valColor = it.signal > 0 ? "var(--green)" : it.signal < 0 ? "var(--red)" : "var(--text-muted)";
    return `
    <div class="ind-card">
      <div class="ind-card-header">
        <span class="ind-card-title">${it.title}</span>
        <span class="ind-signal ${sigCls}">${sigText}</span>
      </div>
      <div class="ind-card-value" style="color:${valColor}">${it.value}</div>
      <div class="ind-card-desc">${it.desc}</div>
    </div>`;
  }).join("");
}

// ─────────────────────────────────────────────────────────────────────────
// Yardımcı
// ─────────────────────────────────────────────────────────────────────────
function showLoading(show) {
  document.getElementById("loading-overlay").style.display = show ? "flex" : "none";
}

function spinRefreshBtn(spin) {
  document.getElementById("refresh-btn").classList.toggle("spinning", spin);
}
