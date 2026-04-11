"""
sentiment.py — Türkçe Finansal Haber Sentiment Analizi
Anahtar kelime bazlı skor hesaplar → AL / SAT / BEKLE tavsiyesi üretir.
"""

import re
from typing import TypedDict

# ─── Kelime Listeleri ──────────────────────────────────────────────────────────

POSITIVE_WORDS = {
    # Kârlılık / büyüme
    "kâr": 2, "kar": 2, "kazanç": 2, "büyüme": 1.5, "büyüdü": 1.5,
    "artış": 1.5, "arttı": 1.5, "yükseldi": 1.5, "yükseliş": 1.5,
    "rekor": 2, "zirve": 1.5, "güçlü": 1, "pozitif": 1,
    # İş gelişmeleri
    "anlaşma": 1.5, "sözleşme": 1.5, "ihracat": 1, "ihraç": 1,
    "yatırım": 1, "ortaklık": 1.5, "birleşme": 1, "satın alma": 1,
    "temettü": 2, "temettü açıkladı": 2.5, "kâr payı": 2,
    "sipariş": 1, "kapasite": 1, "genişleme": 1,
    # Piyasa
    "yükselti": 1, "rally": 1.5, "toparlandı": 1, "iyileşme": 1,
    "güven": 1, "olumlu": 1, "beklenti üzeri": 2, "sürpriz": 1,
    "fiyat artış": 1.5, "hedef fiyat yükseltildi": 2,
}

NEGATIVE_WORDS = {
    # Zarar / düşüş
    "zarar": 2, "kayıp": 2, "düşüş": 1.5, "düştü": 1.5,
    "geriledi": 1.5, "gerileme": 1.5, "daraldı": 1.5, "daralma": 1.5,
    "negatif": 1, "zayıf": 1, "kötü": 1,
    # Hukuki / operasyonel
    "ceza": 2, "dava": 1.5, "soruşturma": 2, "iflas": 3, "konkordato": 3,
    "yeniden yapılandırma": 1.5, "borç": 1.5, "temerrüt": 3,
    "borcunu ödeyemedi": 3, "haciz": 2,
    # Piyasa baskısı
    "satış baskısı": 2, "panik": 2, "risk": 1, "endişe": 1,
    "çöküş": 2.5, "çakıldı": 2, "sert düştü": 2.5,
    "hedef fiyat düşürüldü": 2, "beklenti altı": 2, "hayal kırıklığı": 1.5,
    # Makro
    "enflasyon": 1, "faiz artışı": 1.5, "kur baskısı": 1.5,
    "ithalat yasağı": 1.5, "ihracat yasağı": 1.5, "ambargo": 2,
}

# Etki açıklamaları (action → template listesi, rastgele birini seç değil hepsini döngüde dene)
IMPACT_TEMPLATES = {
    "POZITIF": [
        "Olumlu haber kısa vadede yukarı baskı oluşturabilir.",
        "Güçlü temel haber, fiyatı destekleyebilir.",
        "Pozitif gelişme — momentum alıcıları cezbedebilir.",
        "Kârlılık/büyüme haberi genellikle yükseliş getirir.",
        "Piyasa bu haberi olumlu karşılayabilir, AL fırsatı değerlendirilebilir.",
    ],
    "NEGATIF": [
        "Olumsuz haber kısa vadede satış baskısı oluşturabilir.",
        "Negatif gelişme — hisse fiyatı baskı altına girebilir.",
        "Risk algısı artmış, pozisyon azaltılabilir.",
        "Temel olumsuzluk devam ederse fiyat gerilemeye devam edebilir.",
        "Satış riskine karşı dikkatli olunmalı.",
    ],
    "NÖTR": [
        "Piyasaya etkisi sınırlı görünüyor, gelişmeleri takip edin.",
        "Nötr haber — net bir yön sinyali yok.",
        "Haberin etkisi hisse bazında değişebilir.",
        "Daha fazla veri beklenmeli, aceleci karar verilmemeli.",
        "Belirsizlik sürüyor — bekle-gör stratejisi önerilir.",
    ],
}


class SentimentResult(TypedDict):
    sentiment: str   # POZITIF / NEGATIF / NÖTR
    score: float     # -1.0 ... +1.0 normalize
    action: str      # AL / SAT / BEKLE
    action_color: str  # hex renk
    impact_desc: str


def _clean(text: str) -> str:
    return re.sub(r'[^\w\sığüşöçİĞÜŞÖÇ]', ' ', text.lower())


def analyze(title: str, summary: str = "") -> SentimentResult:
    text = _clean(title + " " + summary)

    raw_pos = 0.0
    raw_neg = 0.0

    for word, weight in POSITIVE_WORDS.items():
        if word in text:
            raw_pos += weight

    for word, weight in NEGATIVE_WORDS.items():
        if word in text:
            raw_neg += weight

    # Net skor: pozitif — negatif, max normalize
    raw_net = raw_pos - raw_neg
    max_val = max(raw_pos + raw_neg, 1.0)
    score = round(max(-1.0, min(1.0, raw_net / max_val)), 3)

    # Eşikler
    if score >= 0.15:
        sentiment = "POZITIF"
        action = "AL"
        action_color = "#22c55e"
    elif score <= -0.15:
        sentiment = "NEGATIF"
        action = "SAT"
        action_color = "#ef4444"
    else:
        sentiment = "NÖTR"
        action = "BEKLE"
        action_color = "#f59e0b"

    # Etki açıklaması — skora göre şiddet seç
    templates = IMPACT_TEMPLATES[sentiment]
    idx = min(int(abs(score) * len(templates)), len(templates) - 1)
    impact_desc = templates[idx]

    return SentimentResult(
        sentiment=sentiment,
        score=score,
        action=action,
        action_color=action_color,
        impact_desc=impact_desc,
    )
