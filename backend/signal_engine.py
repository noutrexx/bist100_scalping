import pandas as pd
from indicators import calculate_all
from bist100_list import get_symbol_name

# Sinyal seviyeleri
SIGNAL_STRONG_BUY  = "GÜÇLÜ AL"
SIGNAL_BUY         = "AL"
SIGNAL_HOLD        = "BEKLE"
SIGNAL_SELL        = "SAT"
SIGNAL_STRONG_SELL = "GÜÇLÜ SAT"

# ── Temel sinyaller ──────────────────────────────────────────────────────────

def _rsi_signal(df: pd.DataFrame) -> int:
    if df["rsi"].isna().all(): return 0
    rsi = df["rsi"].iloc[-1]
    if rsi < 30: return 1
    if rsi > 70: return -1
    return 0

def _bollinger_signal(df: pd.DataFrame) -> int:
    if df["bb_lower"].isna().all(): return 0
    close, lower, upper = df["Close"].iloc[-1], df["bb_lower"].iloc[-1], df["bb_upper"].iloc[-1]
    if close < lower: return 1
    if close > upper: return -1
    return 0

def _macd_signal(df: pd.DataFrame) -> int:
    if len(df) < 3 or df["macd"].isna().iloc[-1]: return 0
    crossed_up   = df["macd"].iloc[-2] < df["macd_signal"].iloc[-2] and df["macd"].iloc[-1] >= df["macd_signal"].iloc[-1]
    crossed_down = df["macd"].iloc[-2] > df["macd_signal"].iloc[-2] and df["macd"].iloc[-1] <= df["macd_signal"].iloc[-1]
    if crossed_up:   return 1
    if crossed_down: return -1
    return 0

def _swing_signal(df: pd.DataFrame) -> int:
    recent = df.tail(3)
    if recent["swing_low"].any():  return 1
    if recent["swing_high"].any(): return -1
    return 0

# ── Gelişmiş sinyaller (gizli teknikler) ────────────────────────────────────

def _ema_cross_signal(df: pd.DataFrame) -> int:
    """
    EMA 9/21 çapraz kesim (scalping altın kuralı).
    Kısa EMA uzun EMA'yı yukarı keserse AL, aşağı keserse SAT.
    """
    if "ema_fast" not in df.columns or len(df) < 3: return 0
    if df["ema_fast"].isna().iloc[-1]: return 0
    prev_diff = df["ema_fast"].iloc[-2] - df["ema_slow"].iloc[-2]
    curr_diff = df["ema_fast"].iloc[-1] - df["ema_slow"].iloc[-1]
    if prev_diff <= 0 and curr_diff > 0: return 1   # Golden cross
    if prev_diff >= 0 and curr_diff < 0: return -1  # Death cross
    # Trend yönü güçlendirici (kesim olmasa da trend al/sat katkısı)
    if curr_diff > 0: return 1
    if curr_diff < 0: return -1
    return 0

def _stoch_rsi_signal(df: pd.DataFrame) -> int:
    """
    Stochastic RSI — RSI'dan daha hassas aşırı alım/satım tespiti.
    < 0.20 → aşırı satım (AL), > 0.80 → aşırı alım (SAT).
    """
    if "stoch_rsi" not in df.columns or df["stoch_rsi"].isna().all(): return 0
    val = df["stoch_rsi"].iloc[-1]
    if pd.isna(val): return 0
    if val < 0.20: return 1
    if val > 0.80: return -1
    return 0

def _volume_spike_signal(df: pd.DataFrame) -> int:
    """
    Hacim patlaması ile momentum onayı.
    Spike varsa, mum yönünde sinyal üretir (boğa mumu → AL).
    """
    if "vol_spike" not in df.columns: return 0
    if not df["vol_spike"].iloc[-1]: return 0
    last = df.iloc[-1]
    close, open_ = float(last["Close"]), float(last["Open"])
    if close > open_: return 1   # Boğa mumu + hacim patlaması → AL
    if close < open_: return -1  # Ayı mumu + hacim patlaması → SAT
    return 0

def _vwap_signal(df: pd.DataFrame) -> int:
    """
    VWAP kurumsal fiyat seviyesi filtresi.
    Fiyat > VWAP → boğa eğilimi, < VWAP → ayı eğilimi.
    """
    if "vwap" not in df.columns or df["vwap"].isna().all(): return 0
    vwap  = df["vwap"].iloc[-1]
    close = df["Close"].iloc[-1]
    if pd.isna(vwap): return 0
    deviation = (close - vwap) / vwap
    if deviation < -0.005: return 1   # VWAP'ın %0.5 altında → ucuz, AL
    if deviation >  0.005: return -1  # VWAP'ın %0.5 üstünde → pahalı, SAT
    return 0

# ── Ana sinyal üretici ───────────────────────────────────────────────────────

def generate_signal(df: pd.DataFrame) -> dict:
    """
    8 indikatörden bileşik skor hesaplar. Skor aralığı: -8 … +8
    """
    df_ind = calculate_all(df)

    # Temel (4 sinyal)
    rsi_s  = _rsi_signal(df_ind)
    bb_s   = _bollinger_signal(df_ind)
    macd_s = _macd_signal(df_ind)
    sw_s   = _swing_signal(df_ind)

    # Gelişmiş (4 sinyal)
    ema_s    = _ema_cross_signal(df_ind)
    srsi_s   = _stoch_rsi_signal(df_ind)
    vol_s    = _volume_spike_signal(df_ind)
    vwap_s   = _vwap_signal(df_ind)

    score = rsi_s + bb_s + macd_s + sw_s + ema_s + srsi_s + vol_s + vwap_s  # -8…+8

    # Skor → sinyal etiketi (8 indikatörle ölçeklendirildi)
    if score >= 5:   signal = SIGNAL_STRONG_BUY
    elif score >= 3: signal = SIGNAL_BUY
    elif score <= -5: signal = SIGNAL_STRONG_SELL
    elif score <= -3: signal = SIGNAL_SELL
    else:             signal = SIGNAL_HOLD

    latest = df_ind.iloc[-1]
    price  = round(float(latest["Close"]), 2)

    first_close = float(df_ind["Close"].iloc[0])
    change_pct  = round(((price - first_close) / first_close) * 100, 2) if first_close != 0 else 0.0

    rsi_val      = round(float(latest["rsi"]),       2) if not pd.isna(latest["rsi"])      else None
    macd_val     = round(float(latest["macd_hist"]), 4) if not pd.isna(latest["macd_hist"]) else None
    stoch_val    = round(float(latest["stoch_rsi"]), 3) if not pd.isna(latest["stoch_rsi"]) else None
    vwap_val     = round(float(latest["vwap"]),      2) if not pd.isna(latest["vwap"])       else None
    vol_spike_v  = bool(latest["vol_spike"])

    # ── Al / Sat Fiyatı ─────────────────────────────────────────────────────
    # Al Fiyatı  = Bollinger alt bandı (destek / ideal giriş seviyesi)
    #              Yoksa → anlık fiyatın %1.5 altı
    # Sat Fiyatı = Bollinger üst bandı (direnç / ideal çıkış seviyesi)
    #              Yoksa → anlık fiyatın %1.5 üstü
    bb_lower_v = latest["bb_lower"]
    bb_upper_v = latest["bb_upper"]
    al_fiyati  = round(float(bb_lower_v), 2) if not pd.isna(bb_lower_v) else round(price * 0.985, 2)
    sat_fiyati = round(float(bb_upper_v), 2) if not pd.isna(bb_upper_v) else round(price * 1.015, 2)

    return {
        "signal":      signal,
        "score":       score,
        "price":       price,
        "change_pct":  change_pct,
        "al_fiyati":   al_fiyati,
        "sat_fiyati":  sat_fiyati,
        "rsi":         rsi_val,
        "macd_hist":   macd_val,
        "stoch_rsi":   stoch_val,
        "vwap":        vwap_val,
        "vol_spike":   vol_spike_v,
        "details": {
            "rsi":       rsi_s,
            "bollinger": bb_s,
            "macd":      macd_s,
            "swing":     sw_s,
            "ema_cross": ema_s,
            "stoch_rsi": srsi_s,
            "volume":    vol_s,
            "vwap":      vwap_s,
        }
    }


def generate_all_signals(data_dict: dict) -> list:
    results = []
    for symbol, df in data_dict.items():
        try:
            sig = generate_signal(df)
            sig["symbol"] = symbol
            sig["name"]   = get_symbol_name(symbol)
            results.append(sig)
        except Exception as e:
            print(f"[HATA] {symbol} sinyal üretilemedi: {e}")
    results.sort(key=lambda x: abs(x["score"]), reverse=True)
    return results
