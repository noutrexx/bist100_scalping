"""
institutional_fetcher.py — Kurumsal Yatırımcı Alım/Satım Akışı
Kaynak: KAP (Kamuyu Aydınlatma Platformu) RSS + demo verisi
Büyük fonlar, yabancı kurumlar, yerli bankalar ve vakıf fonlarının
önemli hisse değişikliklerini takip eder.
"""

import re
import time
import hashlib
from datetime import datetime, timezone

try:
    import feedparser
    FEEDPARSER_OK = True
except ImportError:
    FEEDPARSER_OK = False

import requests

# ─── Bilinen kurumsal oyuncular (isim → kısa tag) ─────────────────────────────
KNOWN_INSTITUTIONS = {
    # Yabancı kurumlar
    "bank of america": "BofA",
    "bofa":            "BofA",
    "merrill lynch":   "BofA",
    "goldman sachs":   "Goldman",
    "goldman":         "Goldman",
    "morgan stanley":  "MS",
    "jp morgan":       "JPM",
    "jpmorgan":        "JPM",
    "citigroup":       "Citi",
    "citi":            "Citi",
    "ubs":             "UBS",
    "barclays":        "Barclays",
    "deutsche bank":   "Deutsche",
    "blackrock":       "BlackRock",
    "fidelity":        "Fidelity",
    "vanguard":        "Vanguard",
    "norges bank":     "Norges",

    # Yerli bankalar ve kurumlar
    "ziraat":          "Ziraat",
    "ziraat bankası":  "Ziraat",
    "vakıf":           "VakıfBank",
    "vakıfbank":       "VakıfBank",
    "vakıf yatırım":   "VakıfYat.",
    "garanti":         "Garanti",
    "garanti bbva":    "Garanti",
    "işbank":          "İşbank",
    "is bank":         "İşbank",
    "akbank":          "Akbank",
    "yapı kredi":      "YKB",
    "yapıkredi":       "YKB",
    "qnb finans":      "QNB",
    "denizbank":       "Deniz",
    "enpara":          "Enpara",

    # Yerli fonlar / SPK kurumlar
    "oyak":            "OYAK",
    "oyak yatırım":    "OYAK",
    "türkiye varlık fonu": "TVF",
    "tvf":             "TVF",
    "emekli sandığı":  "ES",
    "bağkur":          "Bağkur",
    "sgk":             "SGK",
    "ata yatırım":     "Ata",
    "info yatırım":    "Info",
    "gedik yatırım":   "Gedik",
    "alan yatırım":    "Alan",
    "strateji menkul": "Strateji",
}

# KAP RSS  
KAP_RSS_URLS = [
    "https://www.kap.org.tr/tr/rss/BildirimRss",   # Tüm bildirimler
    "https://www.kap.org.tr/tr/rss/BildirimRss?tip=FR",  # Finansal raporlar
]

# Demo verisi (RSS çekilemezse)
_DEMO_TRANSACTIONS = [
    {
        "institution": "Ziraat",
        "full_name":   "Ziraat Bankası A.Ş.",
        "action":      "AL",
        "symbol":      "THYAO",
        "amount":      "₺42.5M",
        "change_pct":  "+3.2%",
        "color":       "#22c55e",
    },
    {
        "institution": "BofA",
        "full_name":   "Bank of America",
        "action":      "AL",
        "symbol":      "GARAN",
        "amount":      "₺28.1M",
        "change_pct":  "+1.8%",
        "color":       "#22c55e",
    },
    {
        "institution": "Goldman",
        "full_name":   "Goldman Sachs",
        "action":      "SAT",
        "symbol":      "EREGL",
        "amount":      "₺15.7M",
        "change_pct":  "-2.1%",
        "color":       "#ef4444",
    },
    {
        "institution": "VakıfYat.",
        "full_name":   "Vakıf Yatırım",
        "action":      "AL",
        "symbol":      "AKBNK",
        "amount":      "₺33.0M",
        "change_pct":  "+2.5%",
        "color":       "#22c55e",
    },
    {
        "institution": "JPM",
        "full_name":   "JP Morgan",
        "action":      "AL",
        "symbol":      "BIMAS",
        "amount":      "₺19.4M",
        "change_pct":  "+0.9%",
        "color":       "#22c55e",
    },
    {
        "institution": "OYAK",
        "full_name":   "OYAK Yatırım",
        "action":      "AL",
        "symbol":      "TUPRS",
        "amount":      "₺51.2M",
        "change_pct":  "+4.1%",
        "color":       "#22c55e",
    },
    {
        "institution": "BlackRock",
        "full_name":   "BlackRock Inc.",
        "action":      "SAT",
        "symbol":      "SISE",
        "amount":      "₺8.3M",
        "change_pct":  "-1.4%",
        "color":       "#ef4444",
    },
    {
        "institution": "MS",
        "full_name":   "Morgan Stanley",
        "action":      "AL",
        "symbol":      "KCHOL",
        "amount":      "₺67.8M",
        "change_pct":  "+5.3%",
        "color":       "#22c55e",
    },
]


def _detect_institution(text: str) -> tuple[str, str] | None:
    """Metinde bilinen kurum adı geçiyorsa (kısa_ad, tam_ad) döner."""
    text_lower = text.lower()
    for key, tag in KNOWN_INSTITUTIONS.items():
        if key in text_lower:
            return (tag, key.title())
    return None


def _detect_action(text: str) -> str:
    text_lower = text.lower()
    buy_kw  = ["alım", "satın", "artır", "yükseltt", "aldı"]
    sell_kw = ["satış", "satt", "azalt", "düşürd"]
    buy  = sum(kw in text_lower for kw in buy_kw)
    sell = sum(kw in text_lower for kw in sell_kw)
    if buy > sell: return "AL"
    if sell > buy: return "SAT"
    return "AL"  # default


def _detect_symbol(text: str) -> str:
    """Metinde BIST sembolü ara."""
    try:
        from bist100_list import BIST100_SYMBOLS
        symbols = [s.replace(".IS", "") for s in BIST100_SYMBOLS]
    except Exception:
        symbols = []
    text_upper = text.upper()
    for sym in symbols:
        if re.search(r'\b' + re.escape(sym) + r'\b', text_upper):
            return sym
    return "BIST"


def _parse_amount(text: str) -> str:
    """Metin içinde para miktarı bul."""
    m = re.search(r'(\d[\d,.]+)\s*(milyon|bin|mn|mn\.|mln)', text, re.IGNORECASE)
    if m:
        num = m.group(1).replace(",", ".")
        unit = m.group(2).lower()
        if "milyon" in unit or "mn" in unit or "mln" in unit:
            return f"₺{num}M"
        return f"₺{num}K"
    return "—"


def fetch_institutional(max_items: int = 15) -> list[dict]:
    """
    KAP RSS'den kurumsal işlem haberlerini çeker.
    Bulunamazsa demo verisi döner.
    """
    if not FEEDPARSER_OK:
        return _DEMO_TRANSACTIONS[:max_items]

    headers = {"User-Agent": "Mozilla/5.0 (compatible; BISTBot/1.0)"}
    results: list[dict] = []
    seen: set[str] = set()

    for url in KAP_RSS_URLS:
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            feed = feedparser.parse(resp.content)
        except Exception:
            continue

        for entry in feed.entries[:20]:
            title   = getattr(entry, "title",   "") or ""
            summary = getattr(entry, "summary", "") or ""
            full_text = title + " " + summary

            inst = _detect_institution(full_text)
            if not inst:
                continue

            uid = hashlib.md5(full_text[:80].encode()).hexdigest()[:10]
            if uid in seen:
                continue
            seen.add(uid)

            action = _detect_action(full_text)
            symbol = _detect_symbol(full_text)
            amount = _parse_amount(full_text)

            results.append({
                "id":          uid,
                "institution": inst[0],
                "full_name":   inst[1],
                "action":      action,
                "symbol":      symbol,
                "amount":      amount,
                "change_pct":  "",
                "color":       "#22c55e" if action == "AL" else "#ef4444",
                "source":      "KAP",
                "title":       title[:120],
                "published_at": datetime.now(timezone.utc).isoformat(),
            })

        if len(results) >= max_items:
            break

    if not results:
        return _DEMO_TRANSACTIONS[:max_items]

    return results[:max_items]
