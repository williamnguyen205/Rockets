# Clarity Backend

FastAPI backend for the Clarity investing app.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --reload
```

The API runs on `http://127.0.0.1:8000`.

## Endpoints

- `GET /health`
- `GET /stock/{ticker}`
- `GET /stock/{ticker}/history?period=1mo`
- `GET /stocks/batch?tickers=AAPL,GOOGL,TSLA`
