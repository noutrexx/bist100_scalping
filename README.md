# BIST Trade Bot

BIST 100 hisselerini RSI, Bollinger, MACD, Swing, EMA Cross, Stoch RSI, Volume Spike ve VWAP kombinasyonuyla analiz eden gerçek zamanlı sinyal panosu.

## Özellikler

- 8 teknik indikatörden bileşik sinyal skoru (-8 … +8)
- Al / Sat fiyat seviyeleri (Bollinger Band desteği/direnci)
- Anlık işlem akışı paneli (sağ sidebar)
- TradingView Lightweight Charts (mum + RSI + Stoch RSI + MACD)
- Ant Design v5 dark + compact UI

## Kurulum

### Backend
```bash
cd backend
pip install -r ../requirements.txt
python app.py
```

### Frontend (dev)
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Frontend (production build)
```bash
cd frontend
npm run build      # dist/ → Flask tarafından serve edilir
```

Uygulama: **http://localhost:5000**
