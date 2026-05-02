# Clarity frontend

Vite + React + TypeScript SPA for Clarity.

## Run

```bash
npm install
npm run dev
```

## Environment

- **API:** Defaults to `http://127.0.0.1:8000`. Override with `frontend/.env.local`:

  ```bash
  VITE_API_BASE_URL=http://127.0.0.1:8000
  ```

- **Tutor:** Uses `POST /ai/learn` on the same base URL; the backend may call local Ollama.

## Routes

| Path | Purpose |
|------|---------|
| `/`, `/login`, `/auth`, `/create` | Auth (session in `localStorage`) |
| `/onboarding` | Guided setup (gated until complete) |
| `/dashboard` | Portfolio summary, allocation, holdings |
| `/stocks` | Ticker lookup (FastAPI + yfinance) |
| `/scenarios` | What-if portfolio scenarios |
| `/learn` | Lessons + AI tutor context |
| `/account` | Settings; can restart onboarding |

Authenticated layout: **`RequireAuth` → `OnboardingGate` → `AppShell`** (sidebar / mobile nav + tutor).

## State

- **Session:** `frontend/src/lib/session.ts`
- **Portfolio + onboarding:** Zustand + `persist`, storage key `clarity-portfolio-v2` in `src/store/portfolio.ts`

## Docs

Repo overview and API list: **`../README.md`**.
