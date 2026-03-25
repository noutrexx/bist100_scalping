import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import threading
import time

# Önbellek: {symbol: (timestamp, dataframe)}
_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 60 * 5  # 5 dakika


def fetch_stock_data(symbol: str, period: str = "5d", interval: str = "15m") -> pd.DataFrame | None:
    """
    Yahoo Finance'den 15 dakikalık mum verisi çeker.
    Sonuçları önbellekte tutar (5 dakika TTL).
    """
    now = time.time()
    with _cache_lock:
        if symbol in _cache:
            cached_time, cached_df = _cache[symbol]
            if now - cached_time < CACHE_TTL_SECONDS:
                return cached_df

    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        if df is None or df.empty:
            return None

        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.index = pd.to_datetime(df.index)
        df.dropna(inplace=True)

        with _cache_lock:
            _cache[symbol] = (now, df)

        return df
    except Exception as e:
        print(f"[HATA] {symbol} verisi çekilemedi: {e}")
        return None


def fetch_multiple(symbols: list, max_workers: int = 10) -> dict:
    """
    Birden fazla hisseyi paralel olarak çeker.
    Döndürür: {symbol: DataFrame}
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    results = {}

    def _fetch(sym):
        return sym, fetch_stock_data(sym)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_fetch, sym): sym for sym in symbols}
        for future in as_completed(futures):
            sym, df = future.result()
            if df is not None and not df.empty:
                results[sym] = df

    return results


def get_latest_price(symbol: str) -> float | None:
    """Son kapanış fiyatını döndürür."""
    df = fetch_stock_data(symbol)
    if df is not None and not df.empty:
        return round(float(df["Close"].iloc[-1]), 2)
    return None
