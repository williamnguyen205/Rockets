export type StockQuote = {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: number | null
  volume: number | null
}

export type StockHistoryPoint = {
  date: string
  close: number
}

export type LearnAnswer = {
  answer: string
  takeaway: string
  example: string
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

export async function getStockHistory(ticker: string, period = "1mo") {
  return fetchJson<StockHistoryPoint[]>(
    `/stock/${encodeURIComponent(ticker)}/history?period=${encodeURIComponent(period)}`,
  )
}

export async function askLearnQuestion(question: string) {
  return fetchJson<LearnAnswer>("/ai/learn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  })
}
