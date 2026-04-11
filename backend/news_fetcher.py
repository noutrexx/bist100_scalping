"""
news_fetcher.py — BIST Haber Çekici
Kaynak: RSS beslemeleri (Investing.com TR, Reuters TR, Bigpara, KAP)
"""

import re
import time
import hashlib
from datetime import datetime, timezone
from typing import Optional

try:
    import feedparser
    FEEDPARSER_AVAILABLE = True
except ImportError:
    FEEDPARSER_AVAILABLE = False

import requests

# ─── RSS Kaynakları ────────────────────────────────────────────────────────────
RSS_FEEDS = [
    {
        "name": "Investing.com TR",
        "url": "https://tr.investing.com/rss/news.rss",
    },
    {
        "name": "Reuters Türkiye",
        "url": "https://feeds.reuters.com/reuters/turkishNews",
    },
    {
        "name": "Bigpara",
        "url": "https://bigpara.hurriyet.com.tr/rss/hisse/",
    },
    {
        "name": "Haber3 Ekonomi",
        "url": "https://www.haber3.com/rss/ekonomi.xml",
    },
    {
        "name": "Bloomberg HT",
        "url": "https://www.bloomberght.com/rss",
    },
]

# Fallback haberler (RSS çekilemezse demo verisi)
FALLBACK_NEWS = [
    {
        "id": "fallback-1",
        "title": "BIST 100 günün ilk saatinde %0.8 yükseldi",
        "summary": "Borsa İstanbul'da yatırımcı iştahı arttı, bankacılık hisseleri öne çıktı.",
        "source": "Demo Veri",
        "url": "#",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "symbols": ["GARAN", "AKBNK", "ISCTR"],
    },
    {
        "id": "fallback-2",
        "title": "Türk Hava Yolları rekor yolcu taşıma rakamı açıkladı",
        "summary": "THY Mart ayında geçen yıla göre %12 artışla 5.2 milyon yolcu taşıdı.",
        "source": "Demo Veri",
        "url": "#",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "symbols": ["THYAO"],
    },
    {
        "id": "fallback-3",
        "title": "Enflasyon beklentilerin üzerinde geldi, tahvil faizleri yükseldi",
        "summary": "Merkez Bankası'nın açıkladığı aylık enflasyon verisi piyasaları olumsuz etkiledi.",
        "source": "Demo Veri",
        "url": "#",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "symbols": [],
    },
    {
        "id": "fallback-4",
        "title": "Ereğli Demir Çelik'ten büyük ihracat anlaşması",
        "summary": "EREGL Avrupa pazarına 500 milyon dolarlık ihracat anlaşması imzaladı.",
        "source": "Demo Veri",
        "url": "#",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "symbols": ["EREGL"],
    },
    {
        "id": "fallback-5",
        "title": "Dolar/TL paritesi yıl içi zirvesini test ediyor",
        "summary": "TL üzerindeki baskı sürerken ihracatçı hisseler avantajlı konumda.",
        "source": "Demo Veri",
        "url": "#",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "symbols": ["THYAO", "EREGL", "TUPRS"],
    },
]

# BIST sembollerini başlık/özetten tespit etmek için liste
# bist100_list.py'den dinamik alınacak
_SYMBOL_CACHE: list[str] = []

def _get_symbols() -> list[str]:
    global _SYMBOL_CACHE
    if not _SYMBOL_CACHE:
        try:
            from bist100_list import BIST100_SYMBOLS
            _SYMBOL_CACHE = [s.replace(".IS", "") for s in BIST100_SYMBOLS]
        except Exception:
            _SYMBOL_CACHE = []
    return _SYMBOL_CACHE


def _detect_symbols(text: str) -> list[str]:
    """Metin içinde geçen BIST sembollerini tespit eder."""
    symbols = _get_symbols()
    found = []
    text_upper = text.upper()
    for sym in symbols:
        # Tam kelime eşleşmesi (örn. THYAO ≠ THYA)
        if re.search(r'\b' + re.escape(sym) + r'\b', text_upper):
            found.append(sym)
    return found[:6]  # max 6 sembol


def _parse_date(entry) -> str:
    """RSS entry'den ISO tarih döner."""
    for attr in ("published_parsed", "updated_parsed"):
        t = getattr(entry, attr, None)
        if t:
            try:
                dt = datetime(*t[:6], tzinfo=timezone.utc)
                return dt.isoformat()
            except Exception:
                pass
    return datetime.now(timezone.utc).isoformat()


def _entry_id(entry) -> str:
    """Benzersiz haber ID üret."""
    base = getattr(entry, "link", "") or getattr(entry, "title", "") or str(time.time())
    return hashlib.md5(base.encode()).hexdigest()[:12]


def fetch_news(max_items: int = 20) -> list[dict]:
    """
    RSS beslemelerinden haber çeker.
    feedparser yoksa fallback verisi döner.
    """
    if not FEEDPARSER_AVAILABLE:
        return FALLBACK_NEWS[:max_items]

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; BISTBot/1.0)",
    }

    all_items: list[dict] = []
    seen_ids: set[str] = set()

    for feed_cfg in RSS_FEEDS:
        try:
            resp = requests.get(feed_cfg["url"], headers=headers, timeout=5)
            feed = feedparser.parse(resp.content)
        except Exception:
            try:
                feed = feedparser.parse(feed_cfg["url"])
            except Exception:
                continue

        for entry in feed.entries[:8]:
            entry_id = _entry_id(entry)
            if entry_id in seen_ids:
                continue
            seen_ids.add(entry_id)

            title   = getattr(entry, "title",   "") or ""
            summary = getattr(entry, "summary", "") or getattr(entry, "description", "") or ""
            # HTML etiketlerini temizle
            summary = re.sub(r'<[^>]+>', '', summary).strip()[:300]

            url = getattr(entry, "link", "#") or "#"
            published_at = _parse_date(entry)
            symbols = _detect_symbols(title + " " + summary)

            all_items.append({
                "id":           entry_id,
                "title":        title[:200],
                "summary":      summary,
                "source":       feed_cfg["name"],
                "url":          url,
                "published_at": published_at,
                "symbols":      symbols,
            })

        if len(all_items) >= max_items * 2:
            break

    # Tarihe göre sırala (yeniden eskiye)
    all_items.sort(key=lambda x: x["published_at"], reverse=True)

    if not all_items:
        return FALLBACK_NEWS[:max_items]

    return all_items[:max_items]
