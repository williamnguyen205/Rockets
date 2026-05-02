export type StockQuote = {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  previousClose: number | null
  dayHigh: number | null
  dayLow: number | null
  marketCap: number | null
  volume: number | null
}

export type StockHistoryPoint = {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number
  volume: number | null
}

export type LearnAnswer = {
  answer: string
  takeaway: string
  example: string
}

export type LearnQuestionContext = {
  moduleTitle?: string
  lessonTitle?: string
}

export type ScenarioPortfolioSummaryPayload = {
  totalValueUsd: number
  cashPct: number
  stocksPct: number
  fundsPct: number
  profile: string
  timeline: string
  goal: string
  monthlyContribution: number
  topHoldings: { symbol: string; name: string; pctRounded: number }[]
}

export type ScenarioExplainAnswer = {
  theWhy: string
  theRisk: string
  theMove: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : "Something went wrong while fetching stock data."

    throw new Error(message)
  }

  return data as T
}

export async function getStockQuote(ticker: string) {
  return fetchJson<StockQuote>(`/stock/${encodeURIComponent(ticker)}`)
}

export async function getStockHistory(ticker: string, period = "1mo", interval = "1d") {
  return fetchJson<StockHistoryPoint[]>(
    `/stock/${encodeURIComponent(ticker)}/history?period=${encodeURIComponent(period)}&interval=${encodeURIComponent(interval)}`,
  )
}

export async function askLearnQuestion(question: string, context?: LearnQuestionContext) {
  return fetchJson<LearnAnswer>("/ai/learn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, ...context }),
  })
}

export async function explainScenarioAdjustment(payload: {
  scenarioId: string
  scenarioTitle: string
  portfolioSummary: ScenarioPortfolioSummaryPayload
  suggestedTrade: string
}) {
  return fetchJson<ScenarioExplainAnswer>("/ai/scenario-explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}
