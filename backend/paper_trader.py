"""
Paper Trading Engine — Hayali bakiye ile otomatik AL/SAT botu.
Durum dosyaya kaydedilir, sunucu restart'ında korunur.
BIST işlem saatlerine uyar (10:00 - 18:10 TR saati).
Haberlere göre de hareket eder.
"""

import threading
import time
import random
import json
import os
from datetime import datetime
from bist100_list import BIST100_SYMBOLS, get_symbol_name
from data_fetcher import fetch_stock_data, fetch_multiple
from signal_engine import generate_signal

# ─── Sabitler ────────────────────────────────────────────────────────────────
INITIAL_BALANCE = 100000.0
STOP_LOSS_PCT   = 0.01    # %1.0 zarar → sert kes
TAKE_PROFIT_PCT = 0.015   # %1.5 kâr → hedefe ulaştı (hızlı al-kaç)
MAX_HISTORY     = 50      # Saklanacak max işlem sayısı
COMMISSION_PCT  = 0.001   # %0.1 komisyon
MAX_POSITIONS   = 5       # Eşzamanlı maksimum pozisyon sayısı

# BIST işlem saatleri (TR saati)
BIST_OPEN_HOUR  = 10
BIST_OPEN_MIN   = 0
BIST_CLOSE_HOUR = 18
BIST_CLOSE_MIN  = 10

# Kalıcı dosya yolu
STATE_FILE = os.path.join(os.path.dirname(__file__), "paper_state.json")


def _is_bist_open() -> bool:
    """BIST işlem saatlerini kontrol et (10:00 - 18:10 TR, Pzt-Cum)."""
    now = datetime.now()
    # Hafta sonu kontrolü (5=Cumartesi, 6=Pazar)
    if now.weekday() >= 5:
        return False
    open_minutes = BIST_OPEN_HOUR * 60 + BIST_OPEN_MIN
    close_minutes = BIST_CLOSE_HOUR * 60 + BIST_CLOSE_MIN
    now_minutes = now.hour * 60 + now.minute
    return open_minutes <= now_minutes <= close_minutes


class PaperTrader:
    """Thread-safe paper trading motoru. Durum dosyaya kaydedilir."""

    def __init__(self):
        self._lock = threading.Lock()
        if not self._load_state():
            self._init_defaults()
            self._save_state()

    # ── Varsayılan değerler ──────────────────────────────────────────────────
    def _init_defaults(self):
        self.balance: float = INITIAL_BALANCE
        self.positions: list[dict] = []
        self.history: list[dict] = []
        self.total_pnl: float = 0.0
        self.win_count: int = 0
        self.loss_count: int = 0
        self.tick_count: int = 0

    # ── Dosyaya kaydet ───────────────────────────────────────────────────────
    def _save_state(self):
        try:
            state = {
                "balance": self.balance,
                "positions": self.positions,
                "history": self.history,
                "total_pnl": self.total_pnl,
                "win_count": self.win_count,
                "loss_count": self.loss_count,
                "tick_count": self.tick_count,
            }
            with open(STATE_FILE, "w", encoding="utf-8") as f:
                json.dump(state, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[PAPER] Durum kaydedilemedi: {e}")

    # ── Dosyadan yükle ───────────────────────────────────────────────────────
    def _load_state(self) -> bool:
        try:
            if not os.path.exists(STATE_FILE):
                return False
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                state = json.load(f)
            self.balance = state.get("balance", INITIAL_BALANCE)
            
            # Eski "position" verisini "positions" listesine migrate et
            old_pos = state.get("position")
            self.positions = state.get("positions", [])
            if old_pos and not self.positions:
                self.positions = [old_pos]
                
            self.history = state.get("history", [])
            self.total_pnl = state.get("total_pnl", 0.0)
            self.win_count = state.get("win_count", 0)
            self.loss_count = state.get("loss_count", 0)
            self.tick_count = state.get("tick_count", 0)
            print(f"[PAPER] Durum yüklendi: bakiye={self.balance:.2f} ₺, toplam P&L={self.total_pnl:.2f} ₺")
            return True
        except Exception as e:
            print(f"[PAPER] Durum yüklenemedi: {e}")
            return False

    # ── Reset ────────────────────────────────────────────────────────────────
    def reset(self):
        with self._lock:
            self._init_defaults()
            self._save_state()

    # ── Durum raporu ─────────────────────────────────────────────────────────
    def status(self) -> dict:
        with self._lock:
            pos_list = []
            for pos in self.positions:
                current_price = self._get_price(pos["symbol"])
                if current_price:
                    pnl = self._calc_pnl(pos, current_price)
                    pnl_pct = ((current_price - pos["entry_price"]) / pos["entry_price"]) * 100
                else:
                    pnl = 0.0
                    pnl_pct = 0.0
                    current_price = pos["entry_price"]

                pos_list.append({
                    **pos,
                    "current_price": round(current_price, 2),
                    "pnl": round(pnl, 2),
                    "pnl_pct": round(pnl_pct, 2),
                    "stop_loss": round(pos["entry_price"] * (1 - STOP_LOSS_PCT), 2),
                    "take_profit": round(pos["entry_price"] * (1 + TAKE_PROFIT_PCT), 2),
                })

            total_trades = self.win_count + self.loss_count
            win_rate = round((self.win_count / total_trades) * 100, 1) if total_trades > 0 else 0.0

            return {
                "balance": round(self.balance, 2),
                "initial_balance": INITIAL_BALANCE,
                "total_pnl": round(self.total_pnl, 2),
                "total_pnl_pct": round((self.total_pnl / INITIAL_BALANCE) * 100, 2),
                "positions": pos_list,
                "history": list(reversed(self.history[-20:])),
                "win_count": self.win_count,
                "loss_count": self.loss_count,
                "total_trades": total_trades,
                "win_rate": win_rate,
                "tick_count": self.tick_count,
                "bist_open": _is_bist_open(),
                "market_status": "AÇIK" if _is_bist_open() else "KAPALI",
            }

    # ── Haber duyarlılık skoru çek ───────────────────────────────────────────
    def _get_news_bias(self) -> int:
        """Haber akışından genel piyasa yönü belirle. +1 boğa, -1 ayı, 0 nötr."""
        try:
            import requests
            res = requests.get("http://localhost:5000/api/news", timeout=5)
            data = res.json()
            items = data.get("items", [])
            if not items:
                return 0
            buy = sum(1 for it in items if it.get("action") == "AL")
            sell = sum(1 for it in items if it.get("action") == "SAT")
            if buy > sell + 1:
                return 1   # Haberler olumlu → AL yönü
            if sell > buy + 1:
                return -1  # Haberler olumsuz → SAT yönü
            return 0
        except Exception:
            return 0

    # ── Tek bir tur çalıştır ─────────────────────────────────────────────────
    def tick(self) -> dict:
        with self._lock:
            self.tick_count += 1
            action_taken = None
            bist_open = _is_bist_open()

            # BIST kapalıysa işlem yapma ama durum bildir
            if not bist_open:
                result = {
                    "tick": self.tick_count,
                    "actions": [],
                    "message": "BIST kapalı (10:00-18:10 arası işlem yapılır)",
                    "balance": round(self.balance, 2),
                    "positions": self.positions,
                    "total_pnl": round(self.total_pnl, 2),
                    "bist_open": False,
                }
                self._save_state()
                return result

            # Haber yönü al
            news_bias = self._get_news_bias()
            actions_taken = []

            # ── Açık pozisyon varsa: çıkış kontrolü ─────────────────────────
            # Listeyi kopyalayarak üzerinde geziyoruz (silme işlemi olduğu için)
            for pos in list(self.positions):
                current_price = self._get_price(pos["symbol"])
                if current_price:
                    pnl_pct = ((current_price - pos["entry_price"]) / pos["entry_price"])

                    reason = None
                    if pnl_pct <= -STOP_LOSS_PCT:
                        reason = "STOP-LOSS"
                    elif pnl_pct >= TAKE_PROFIT_PCT:
                        reason = "TAKE-PROFIT (HEDEF)"
                    else:
                        # Sinyal kontrolü
                        df = fetch_stock_data(pos["symbol"])
                        if df is not None and not df.empty:
                            sig = generate_signal(df)
                            
                            # Al-kaç (Scalping) erken kâr alma mantığı
                            if pnl_pct >= 0.008 and sig["score"] <= 1:
                                reason = "AL-KAÇ (YETERLİ KÂR)"
                            elif pnl_pct >= 0.004 and sig["score"] < 0:
                                reason = "MOMENTUM BİTTİ (AL-KAÇ)"
                            # Zararı erken kes (kötü haber veya sert düşüş sinyali)
                            elif sig["score"] <= -2:
                                reason = "SAT SİNYALİ (KAÇIŞ)"
                            elif news_bias == -1 and sig["score"] <= 0:
                                reason = "OLUMSUZ HABER"
                            # Swing high tespit → tepe bulundu, çıkış
                            elif sig.get("details", {}).get("swing") == -1 and pnl_pct > 0:
                                reason = "TEPE TESPİT (AL-KAÇ)"

                    if reason:
                        act = self._close_position(pos, current_price, reason)
                        actions_taken.append(act)

            # ── Açık pozisyon limitine ulaşılamadıysa: giriş kontrolü ────────
            open_slots = MAX_POSITIONS - len(self.positions)
            if open_slots > 0 and self.balance > 1000:
                # Kalan boşluk kadar yeni işlem açmaya çalışır
                new_acts = self._find_and_open(news_bias, open_slots)
                actions_taken.extend(new_acts)

            result = {
                "tick": self.tick_count,
                "actions": actions_taken,
                "balance": round(self.balance, 2),
                "positions": self.positions,
                "total_pnl": round(self.total_pnl, 2),
                "bist_open": True,
            }
            self._save_state()
            return result

    # ── İç: Pozisyon aç ──────────────────────────────────────────────────────
    def _find_and_open(self, news_bias: int, open_slots: int) -> list:
        """En güçlü AL sinyallerine sahip hisseleri bul ve pozisyon aç."""
        # Mevcut elde olan sembolleri almayalım
        held_symbols = {p["symbol"] for p in self.positions}
        candidates = [s for s in BIST100_SYMBOLS if s not in held_symbols]
        
        sample = random.sample(candidates, min(40, len(candidates)))
        data = fetch_multiple(sample)

        # Haber olumlu ise eşiği daha da düşür (daha agresif giriş)
        min_score = -1 if news_bias == 1 else 0
        best_signals = []

        for symbol, df in data.items():
            try:
                sig = generate_signal(df)
                effective_score = sig["score"] + news_bias
                if effective_score > min_score:
                    best_signals.append({
                        "symbol": symbol,
                        "name": get_symbol_name(symbol),
                        "signal": sig,
                        "effective_score": effective_score,
                    })
            except Exception:
                continue

        # En yüksek skorlu olanlara göre sırala
        best_signals.sort(key=lambda x: x["effective_score"], reverse=True)
        
        actions = []
        # Boş slot kadar işlem aç (max)
        for best in best_signals[:open_slots]:
            price = best["signal"]["price"]
            if price <= 0: continue

            # Bakiyenin slot başına düşen kısmını (%90 kapasite) kullan
            # Örn: Max 5 pozisyon. Her biri toplamın %18'i. Veya güncel bakiye / open_slots.
            invest = (self.balance * 0.95) / open_slots
            qty = int(invest / price)
            if qty <= 0: continue

            commission = qty * price * COMMISSION_PCT
            cost = qty * price + commission
            
            if cost > self.balance: continue

            new_pos = {
                "symbol": best["symbol"],
                "name": best["name"],
                "side": "AL",
                "entry_price": price,
                "qty": qty,
                "cost": round(cost, 2),
                "time": datetime.now().strftime("%H:%M:%S"),
                "score": best["effective_score"],
            }
            self.positions.append(new_pos)
            self.balance -= cost
            open_slots -= 1

            actions.append({
                "type": "AÇILDI",
                "symbol": best["symbol"],
                "name": best["name"],
                "price": price,
                "qty": qty,
                "score": best["effective_score"],
                "time": new_pos["time"],
            })
            
            if open_slots <= 0:
                break
                
        return actions

    # ── İç: Pozisyon kapat ───────────────────────────────────────────────────
    def _close_position(self, pos: dict, current_price: float, reason: str) -> dict:
        revenue = pos["qty"] * current_price
        commission = revenue * COMMISSION_PCT
        net_revenue = revenue - commission
        pnl = net_revenue - pos["cost"]

        self.balance += net_revenue
        self.total_pnl += pnl

        if pnl >= 0:
            self.win_count += 1
        else:
            self.loss_count += 1

        trade_record = {
            "symbol": pos["symbol"],
            "name": pos["name"],
            "side": pos["side"],
            "entry_price": pos["entry_price"],
            "exit_price": round(current_price, 2),
            "qty": pos["qty"],
            "pnl": round(pnl, 2),
            "pnl_pct": round(((current_price - pos["entry_price"]) / pos["entry_price"]) * 100, 2),
            "reason": reason,
            "entry_time": pos["time"],
            "exit_time": datetime.now().strftime("%H:%M:%S"),
        }
        self.history.append(trade_record)
        if len(self.history) > MAX_HISTORY:
            self.history = self.history[-MAX_HISTORY:]

        action = {
            "type": "KAPANDI",
            "reason": reason,
            **trade_record,
        }
        
        # Pozisyonu listeden çıkar
        self.positions = [p for p in self.positions if p["symbol"] != pos["symbol"]]
        return action

    # ── İç: Fiyat çek ────────────────────────────────────────────────────────
    @staticmethod
    def _get_price(symbol: str) -> float | None:
        df = fetch_stock_data(symbol)
        if df is not None and not df.empty:
            return float(df["Close"].iloc[-1])
        return None

    @staticmethod
    def _calc_pnl(position: dict, current_price: float) -> float:
        revenue = position["qty"] * current_price
        commission = revenue * COMMISSION_PCT
        return (revenue - commission) - position["cost"]


# ── Singleton instance ───────────────────────────────────────────────────────
trader = PaperTrader()
