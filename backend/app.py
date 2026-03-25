import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from bist100_list import BIST100_SYMBOLS, get_symbol_name
from data_fetcher import fetch_stock_data, fetch_multiple
from signal_engine import generate_signal, generate_all_signals
from indicators import calculate_all

import pandas as pd
from typing import Any

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="")
CORS(app)

# ────────────────────────────────────────────
# Ana sayfa: frontend/index.html'i servis eder
# ────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


# ────────────────────────────────────────────
# API: Tüm hisselerin sinyalleri
# ────────────────────────────────────────────
@app.route("/api/signals")
def api_signals():
    data = fetch_multiple(BIST100_SYMBOLS)
    signals = generate_all_signals(data)
    return jsonify({"status": "ok", "count": len(signals), "signals": signals})


# ────────────────────────────────────────────
# API: Tek hisse detayı (mum + indikatörler)
# ────────────────────────────────────────────
@app.route("/api/stock/<symbol>")
def api_stock_detail(symbol: str):
    full_symbol = symbol if symbol.endswith(".IS") else symbol + ".IS"
    df = fetch_stock_data(full_symbol)
    if df is None or df.empty:
        return jsonify({"error": "Veri bulunamadı"}), 404

    df_ind = calculate_all(df)

    candles = []
    for ts, row in df_ind.iterrows():
        o: float = float(row["Open"])
        h: float = float(row["High"])
        lo: float = float(row["Low"])
        c: float = float(row["Close"])
        candles.append({
            "time":        int(ts.timestamp()),
            "open":        round(o,  2),
            "high":        round(h,  2),
            "low":         round(lo, 2),
            "close":       round(c,  2),
            "volume":      int(row["Volume"]),
            "rsi":         round(float(row["rsi"]),        2) if not pd.isna(row["rsi"])        else None,
            "bb_upper":    round(float(row["bb_upper"]),   2) if not pd.isna(row["bb_upper"])   else None,
            "bb_middle":   round(float(row["bb_middle"]),  2) if not pd.isna(row["bb_middle"])  else None,
            "bb_lower":    round(float(row["bb_lower"]),   2) if not pd.isna(row["bb_lower"])   else None,
            "macd":        round(float(row["macd"]),       4) if not pd.isna(row["macd"])        else None,
            "macd_signal": round(float(row["macd_signal"]),4) if not pd.isna(row["macd_signal"]) else None,
            "macd_hist":   round(float(row["macd_hist"]),  4) if not pd.isna(row["macd_hist"])   else None,
            "swing_high":  bool(row["swing_high"]),
            "swing_low":   bool(row["swing_low"]),
            "ema_fast":    round(float(row["ema_fast"]),   2) if not pd.isna(row["ema_fast"])   else None,
            "ema_slow":    round(float(row["ema_slow"]),   2) if not pd.isna(row["ema_slow"])   else None,
            "stoch_rsi":   round(float(row["stoch_rsi"]),  3) if not pd.isna(row["stoch_rsi"])  else None,
            "vol_spike":   bool(row["vol_spike"]),
            "vwap":        round(float(row["vwap"]),       2) if not pd.isna(row["vwap"])        else None,
        })

    signal_info = generate_signal(df)
    signal_info["symbol"] = full_symbol
    signal_info["name"]   = get_symbol_name(full_symbol)

    return jsonify({
        "status":  "ok",
        "symbol":  full_symbol,
        "name":    get_symbol_name(full_symbol),
        "signal":  signal_info,
        "candles": candles
    })


# ────────────────────────────────────────────
# API: İstatistikler
# ────────────────────────────────────────────
@app.route("/api/stats")
def api_stats():
    data = fetch_multiple(BIST100_SYMBOLS)
    signals: list[Any] = generate_all_signals(data)

    counts = {"GÜÇLÜ AL": 0, "AL": 0, "BEKLE": 0, "SAT": 0, "GÜÇLÜ SAT": 0}
    for s in signals:
        sig = s.get("signal", "BEKLE")
        counts[sig] = counts.get(sig, 0) + 1

    return jsonify({
        "status":         "ok",
        "total":          len(signals),
        "signal_counts":  counts,
        "top_buy":        list([s for s in signals if s["score"] >= 2])[:5],
        "top_sell":       list([s for s in signals if s["score"] <= -2])[:5],
    })


# ────────────────────────────────────────────
# API: Hisse listesi
# ────────────────────────────────────────────
@app.route("/api/bist100")
def api_bist100():
    symbols = [{"symbol": s, "name": get_symbol_name(s)} for s in BIST100_SYMBOLS]
    return jsonify({"status": "ok", "symbols": symbols})


if __name__ == "__main__":
    print("🚀 BIST Trade Bot başlatılıyor: http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000, threaded=True)
