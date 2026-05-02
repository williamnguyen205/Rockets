# Clarity backend

FastAPI service for stock data and AI-assisted Learn / Scenarios copy.

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

Serves at `http://127.0.0.1:8000`.

## Endpoints

| Method | Path | Description |
|--------|------|----------------|
| `GET` | `/health` | Liveness |
| `POST` | `/ai/learn` | Answer a natural-language investing question (Ollama) |
| `POST` | `/ai/scenario-explain` | Explain a scenario for the current portfolio summary |
| `GET` | `/stock/{ticker}` | Quote snapshot |
| `GET` | `/stock/{ticker}/history` | Historical series (`period` query, e.g. `1mo`) |
| `GET` | `/stocks/batch` | Batch quotes (`tickers` query) |

## Ollama

```bash
ollama pull phi4:14b
ollama serve
```

Typical env (see `main.py` / `routes/ai.py` for exact names):

- `OLLAMA_BASE_URL=http://127.0.0.1:11434`
- `OLLAMA_MODEL=phi4:14b`
