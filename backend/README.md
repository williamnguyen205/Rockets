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
- `POST /ai/learn`
- `GET /stock/{ticker}`
- `GET /stock/{ticker}/history?period=1mo`
- `GET /stocks/batch?tickers=AAPL,GOOGL,TSLA`

## Ollama

The AI tutor uses Ollama locally.

```bash
ollama pull phi4:14b
ollama serve
```

Defaults:

- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `OLLAMA_MODEL=phi4:14b`
