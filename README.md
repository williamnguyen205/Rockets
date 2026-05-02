# Clarity

Clarity is a polished fintech app shell for beginner investors. The app is set up with a clean frontend/backend split so the UI can keep evolving while an API layer is added later.

## Project Structure

```txt
clarity/
  frontend/            Vite + React + TypeScript app
    src/
      components/      App shell and shadcn-style UI primitives
      pages/           Dashboard, Scenarios, Learn
      store/           Zustand portfolio mock data
      lib/             Shared frontend utilities
  backend/             Backend workspace for future API work
    src/server.ts      Starter Node HTTP server with /health
  package.json         Root scripts for frontend/backend tasks
```

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- React Router v6
- Zustand
- Recharts
- Node HTTP backend starter

## Getting Started

Install frontend dependencies from the frontend workspace:

```bash
cd frontend
npm install
```

Then return to the project root:

```bash
cd ..
```

## Scripts

Run these from the root `clarity/` directory:

```bash
npm run dev            # start the frontend Vite dev server
npm run dev:frontend   # same as above, explicit frontend command
npm run dev:backend    # start the backend server on http://127.0.0.1:4000
npm run build          # build the frontend
npm run lint           # lint the frontend
```

## Frontend

The frontend lives in `frontend/` and contains the current Clarity app shell:

- Fixed top navigation
- Dashboard page with portfolio health, allocation chart, and holdings
- Scenarios page with projections
- Learn page for beginner investor education

The frontend is currently powered by mock data in:

```txt
frontend/src/store/portfolio.ts
```

When the backend is ready, this is a natural place to replace local mock state with API calls.

## Backend

The backend lives in `backend/`. It currently includes a minimal Node server so the folder has a clear starting point.

Health check:

```bash
GET http://127.0.0.1:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "clarity-backend"
}
```

## Development Notes

- Keep frontend-only code inside `frontend/src`.
- Keep server/API code inside `backend/src`.
- Shared types can eventually live in a `shared/` folder if both frontend and backend need them.
- The root `package.json` is only for coordinating workspace scripts.
