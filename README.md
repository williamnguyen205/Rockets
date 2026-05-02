# Clarity

Clarity is a polished fintech app shell for beginner investors. The project is split into separate frontend and backend workspaces so the UI and API can evolve independently.

## Project Structure

```txt
clarity/
  frontend/            Vite + React + TypeScript app
    src/
      components/      App shell and shadcn-style UI primitives
      pages/           Dashboard, Stocks, Scenarios, Learn, Account via avatar
      store/           Zustand portfolio mock data
      lib/             Shared frontend utilities
  backend/             FastAPI backend
    main.py            FastAPI app, CORS, router registration
    routes/ai.py       Ollama-powered Learn tab tutor endpoint
    routes/stocks.py   Stock quote, history, and batch endpoints
    requirements.txt   Python dependencies
  package.json         Root scripts for frontend/backend tasks
```

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router v6
- Zustand
- Recharts
- FastAPI
- Ollama
- yfinance

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend runs on `http://127.0.0.1:8000`.

For AI tutor responses, install and start Ollama:

```bash
ollama pull phi4:14b
ollama serve
```

To use the frontend stock lookup and AI tutor pages, run the backend and frontend at the same time:

```bash
# terminal 1
cd backend
source .venv/bin/activate
uvicorn main:app --reload

# terminal 2
cd frontend
npm run dev
```

## Root Scripts

Run these from the root `clarity/` directory:

```bash
npm run dev            # start the frontend Vite dev server
npm run dev:frontend   # start the frontend Vite dev server
npm run dev:backend    # start the FastAPI backend from backend/.venv
npm run build          # build the frontend
npm run lint           # lint the frontend
```

## Backend Endpoints

```txt
GET /health
POST /ai/learn
POST /ai/scenario-explain
GET /stock/{ticker}
GET /stock/{ticker}/history?period=1mo
GET /stocks/batch?tickers=AAPL,GOOGL,TSLA
```

Example:

```bash
curl http://127.0.0.1:8000/stock/AAPL
curl -X POST http://127.0.0.1:8000/ai/learn \
  -H "Content-Type: application/json" \
  -d '{"question":"What is diversification?"}'
curl -X POST http://127.0.0.1:8000/ai/scenario-explain \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"market_drop_20","scenarioTitle":"What if the market drops about 20%?","portfolioSummary":{"totalValueUsd":10000,"cashPct":10,"stocksPct":60,"fundsPct":30,"profile":"Balanced","timeline":"5-10 years","goal":"Wealth Growth","monthlyContribution":100,"topHoldings":[]},"suggestedTrade":"• Stay diversified\n\nGeneral guidance."}'
```

## Development Notes

- Keep frontend-only code inside `frontend/src`.
- Keep server/API code inside `backend`.
- Shared types can eventually live in a `shared/` folder if both frontend and backend need them.
- Replace frontend mock data in `frontend/src/store/portfolio.ts` with API calls when you connect the app to the backend.
- The stock lookup page calls `http://127.0.0.1:8000` by default. Override with `VITE_API_BASE_URL` if needed.
- The Learn tab AI tutor uses local Ollama by default: `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=phi4:14b`.
