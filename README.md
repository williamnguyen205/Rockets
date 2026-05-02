# Clarity

Clarity is a practice investing workspace for beginner investors: a React dashboard with portfolio allocation guidance, stock/fund lookup, scenario-driven rebalancing, a first-run investing guide, and a Learn tab backed by local AI. The repo splits **frontend** and **backend** so the UI and API can evolve independently.

## Project structure

```txt
clarity/
  frontend/                 Vite + React + TypeScript
    src/
      components/           App shell (sidebar + mobile nav), tutor, UI primitives, gates
      pages/                Auth, onboarding wizard, dashboard, stocks, scenarios, learn, account
      store/                Zustand portfolio state (persisted)
      lib/                  API client, session helpers, utilities
  backend/                  FastAPI
    main.py                 App, CORS, routers
    routes/ai.py            Learn tutor + scenario explanation/simulation (Ollama)
    routes/stocks.py        Quotes, history, batch
    requirements.txt
  package.json              Root scripts (delegate to frontend/backend)
```

## Tech stack

- Vite, React, TypeScript, Tailwind CSS, React Router v6, Zustand (persist), Recharts  
- FastAPI, yfinance, Ollama (optional, for `/ai/*`)

## App behavior (frontend)

- **Auth:** `/`, `/login`, `/auth`, and `/create` render the same auth screen. Session is a lightweight flag in `localStorage` (`clarity-session`), managed in `frontend/src/lib/session.ts`. The login tab includes preset credentials for a blank account (`blank@clarity.app` / `blankdemo1`) and a populated demo account (`demo@clarity.app` / `claritydemo1`).
- **Onboarding:** After sign-in, `OnboardingGate` sends users to `/onboarding` until they finish the guided setup. Completing onboarding sets `onboarded` in the portfolio store and persists it.
- **Getting started guide:** First-time/blank-account users see a short tutorial after onboarding that explains the dashboard, beginner investing basics, stock/fund lookup, and scenarios. It can be reopened from the sidebar or mobile navigation.
- **Main app:** Routes under `AppShell` include `/dashboard`, `/stocks`, `/scenarios`, `/learn`, and `/account`. The shell uses a **sidebar** on large screens and a **mobile** header with slide-down navigation.
- **Portfolio data:** Mock/practice holdings and profile fields live in `frontend/src/store/portfolio.ts`, persisted under **`clarity-portfolio-v2`**. Allocation percentages for the dashboard are derived from holdings and cash (`getAllocation`), not from stale store snapshots.
- **Stocks and funds:** The Stocks page searches live tickers through the backend and shows suggestion dropdowns for popular stocks plus beginner-friendly funds/ETFs. Fund/ETF suggestions include expense-ratio and diversification context.
- **Risk assessment:** Single-stock risk is based on expected volatility signals such as known high-volatility tickers, large daily moves, day range, and market cap. Funds/ETFs/mutual-fund-style holdings and bond-style holdings are treated as low risk in the prototype.
- **Scenarios:** The Scenarios page includes deterministic what-if rebalancing plans for market drops, high inflation, and upcoming withdrawals. Plans show concrete dollar moves, before/after allocation, review/apply practice rebalancing, estimated costs, tax awareness, and “what could go wrong.” AI simulation is available as an additional explanation layer.
- **Clarity tutor:** Floating help widget (inside `AppShell`) calls the backend `/ai/learn` endpoint; Learn lessons can pass module/lesson context via `useClarityTutor` from `ClarityTutorContext.tsx`.
- **Theming:** Light/dark follows `localStorage` key `clarity-theme` or system preference (`frontend/src/index.css`).

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API defaults to `http://127.0.0.1:8000`.

For AI features, install and run Ollama. The app defaults to **Gemma 4 E4B** (`gemma4:e4b`) for faster local inference than larger chat models:

```bash
ollama pull gemma4:e4b
ollama serve
```

Run both for full functionality:

```bash
# terminal 1
cd backend && source .venv/bin/activate && uvicorn main:app --reload

# terminal 2
cd frontend && npm run dev
```

## Root scripts

From the repo root:

```bash
npm run dev            # frontend dev server
npm run dev:frontend   # same
npm run dev:backend    # FastAPI with backend/.venv
npm run build          # production build (frontend)
npm run lint           # ESLint (frontend)
```

## Backend endpoints

```txt
GET  /health
POST /ai/learn
POST /ai/scenario-explain
POST /ai/scenario-simulate
GET  /stock/{ticker}
GET  /stock/{ticker}/history?period=1mo
GET  /stocks/batch?tickers=AAPL,GOOGL,TSLA
```

Examples:

```bash
curl http://127.0.0.1:8000/stock/AAPL
curl -X POST http://127.0.0.1:8000/ai/learn \
  -H "Content-Type: application/json" \
  -d '{"question":"What is diversification?"}'
```

## Development notes

- Keep browser-only code in `frontend/src`; keep HTTP/API code in `backend/`.
- Override the API base URL with `VITE_API_BASE_URL` (e.g. in `frontend/.env.local`).
- Ollama defaults: `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=gemma4:e4b` (override via env; see `backend/routes/ai.py`).
