import pandas as pd
import numpy as np


# ─────────────────────────────────────────────────────
# RSI (Relative Strength Index)
# ─────────────────────────────────────────────────────
def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


# ─────────────────────────────────────────────────────
# Bollinger Bantları
# ─────────────────────────────────────────────────────
def calculate_bollinger(df: pd.DataFrame, period: int = 20, std_dev: float = 2.0) -> pd.DataFrame:
    close = df["Close"]
    middle = close.rolling(window=period).mean()
    std = close.rolling(window=period).std()
    return pd.DataFrame({
        "bb_upper":  middle + std_dev * std,
        "bb_middle": middle,
        "bb_lower":  middle - std_dev * std,
    }, index=df.index)


# ─────────────────────────────────────────────────────
# MACD
# ─────────────────────────────────────────────────────
def calculate_macd(series: pd.Series,
                   fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    ema_fast  = series.ewm(span=fast,   adjust=False).mean()
    ema_slow  = series.ewm(span=slow,   adjust=False).mean()
    macd_line = ema_fast - ema_slow
    sig_line  = macd_line.ewm(span=signal, adjust=False).mean()
    return pd.DataFrame({
        "macd":        macd_line,
        "macd_signal": sig_line,
        "macd_hist":   macd_line - sig_line,
    }, index=series.index)


# ─────────────────────────────────────────────────────
# Swing High / Swing Low
# ─────────────────────────────────────────────────────
def detect_swing_points(df: pd.DataFrame, window: int = 5) -> pd.DataFrame:
    highs = df["High"]
    lows  = df["Low"]
    swing_high = pd.Series(False, index=df.index)
    swing_low  = pd.Series(False, index=df.index)
    for i in range(window, len(df) - window):
        h = highs.iloc[i - window: i + window + 1]
        l = lows.iloc[ i - window: i + window + 1]
        if highs.iloc[i] == h.max(): swing_high.iloc[i] = True
        if lows.iloc[i]  == l.min(): swing_low.iloc[i]  = True
    return pd.DataFrame({"swing_high": swing_high, "swing_low": swing_low}, index=df.index)


# ─────────────────────────────────────────────────────
# EMA Cross  (9 / 21 — scalping altın kuralı)
# AL sinyali: kısa EMA uzun EMA'yı yukarı keser
# ─────────────────────────────────────────────────────
def calculate_ema_cross(close: pd.Series,
                        fast: int = 9, slow: int = 21) -> pd.DataFrame:
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    return pd.DataFrame({
        "ema_fast": ema_fast,
        "ema_slow": ema_slow,
    }, index=close.index)


# ─────────────────────────────────────────────────────
# Stochastic RSI  (RSI'nin stokastiği — daha hassas)
# Overbought > 0.80, Oversold < 0.20
# ─────────────────────────────────────────────────────
def calculate_stoch_rsi(close: pd.Series,
                        rsi_period: int = 14, stoch_period: int = 14) -> pd.Series:
    rsi = calculate_rsi(close, rsi_period)
    rsi_min = rsi.rolling(stoch_period).min()
    rsi_max = rsi.rolling(stoch_period).max()
    stoch = (rsi - rsi_min) / (rsi_max - rsi_min).replace(0, np.nan)
    return stoch.rename("stoch_rsi")


# ─────────────────────────────────────────────────────
# Volume Spike  (Piyasa katılımcısı girişi)
# Güncel hacim, son N günün ortalamasının multiplier katından
# büyükse "spike" var → momentum onayı
# ─────────────────────────────────────────────────────
def calculate_volume_spike(volume: pd.Series,
                           period: int = 20, multiplier: float = 1.5) -> pd.DataFrame:
    avg_vol = volume.rolling(period).mean()
    spike   = volume > (avg_vol * multiplier)
    return pd.DataFrame({
        "vol_avg":   avg_vol,
        "vol_spike": spike,
    }, index=volume.index)


# ─────────────────────────────────────────────────────
# VWAP  (Volume Weighted Average Price)
# Kurumsal seviye fiyat referansı — intraday bias
# Fiyat > VWAP → boğa eğilimi, < VWAP → ayı eğilimi
# ─────────────────────────────────────────────────────
def calculate_vwap(df: pd.DataFrame) -> pd.Series:
    typical_price = (df["High"] + df["Low"] + df["Close"]) / 3
    cum_vol = df["Volume"].cumsum()
    cum_pvol = (typical_price * df["Volume"]).cumsum()
    vwap = cum_pvol / cum_vol.replace(0, np.nan)
    return vwap.rename("vwap")


# ─────────────────────────────────────────────────────
# Tüm indikatörleri hesapla (tek çağrı)
# ─────────────────────────────────────────────────────
def calculate_all(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()

    # Temel
    result["rsi"] = calculate_rsi(result["Close"])

    bb = calculate_bollinger(result)
    result["bb_upper"]  = bb["bb_upper"]
    result["bb_middle"] = bb["bb_middle"]
    result["bb_lower"]  = bb["bb_lower"]

    macd = calculate_macd(result["Close"])
    result["macd"]        = macd["macd"]
    result["macd_signal"] = macd["macd_signal"]
    result["macd_hist"]   = macd["macd_hist"]

    swings = detect_swing_points(result)
    result["swing_high"] = swings["swing_high"]
    result["swing_low"]  = swings["swing_low"]

    # Gelişmiş
    ema = calculate_ema_cross(result["Close"])
    result["ema_fast"] = ema["ema_fast"]
    result["ema_slow"] = ema["ema_slow"]

    result["stoch_rsi"] = calculate_stoch_rsi(result["Close"])

    vol = calculate_volume_spike(result["Volume"])
    result["vol_avg"]   = vol["vol_avg"]
    result["vol_spike"] = vol["vol_spike"]

    result["vwap"] = calculate_vwap(result)

    return result
