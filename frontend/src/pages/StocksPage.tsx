import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleDollarSign,
  Search,
  ShieldAlert,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getStockHistory, getStockQuote, type StockHistoryPoint, type StockQuote } from "@/lib/api"
import { cn } from "@/lib/utils"
import { getHoldingValue, usePortfolioStore, type RiskLevel } from "@/store/portfolio"

const popularTickers = ["AAPL", "GOOGL", "TSLA", "MSFT", "NVDA"]
const beginnerFunds = [
  {
    symbol: "VTI",
    name: "Vanguard Total Stock Market ETF",
    expenseRatio: 0.03,
    diversification: "Thousands of U.S. companies",
    plainLanguageRisk: "Broad stock-market exposure; less tied to one company but still moves with markets.",
  },
  {
    symbol: "VXUS",
    name: "Vanguard Total International Stock ETF",
    expenseRatio: 0.05,
    diversification: "Companies outside the U.S.",
    plainLanguageRisk: "Adds global spread, but currency and international markets can move differently.",
  },
  {
    symbol: "BND",
    name: "Vanguard Total Bond Market ETF",
    expenseRatio: 0.03,
    diversification: "Many U.S. bonds",
    plainLanguageRisk: "Often steadier than stocks, but bond prices can still fall when rates change.",
  },
]
const periods = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "all"]

function apiPeriod(p: string) {
  return p === "all" ? "max" : p
}

const riskVariant: Record<RiskLevel, "low" | "medium" | "high"> = {
  Low: "low",
  Medium: "medium",
  High: "high",
}

function formatMcap(value: number): string {
  if (value >= 1_000_000_000_000) return `$${(value / 1e12).toFixed(1)}T`
  if (value >= 1_000_000_000) return `$${(value / 1e9).toFixed(0)}B`
  return `$${(value / 1e6).toFixed(0)}M`
}

function deriveRisk(
  quote: StockQuote,
  fundRiskOverride?: string,
): { level: RiskLevel; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  // 1. Market cap — primary signal
  const mcap = quote.marketCap
  if (mcap === null) {
    score += 3
    reasons.push("Market cap data unavailable — treat as higher risk when fundamentals are scarce.")
  } else if (mcap > 200_000_000_000) {
    score += 0
    reasons.push(
      `Mega-cap (${formatMcap(mcap)} market cap) — one of the largest, most liquid stocks in the world. High institutional ownership helps absorb selling pressure and limits extreme swings.`,
    )
  } else if (mcap > 10_000_000_000) {
    score += 1
    reasons.push(
      `Large-cap (${formatMcap(mcap)} market cap) — well-established company with broad analyst coverage. Still subject to market cycles, but less likely to collapse on a single piece of news.`,
    )
  } else if (mcap > 2_000_000_000) {
    score += 2
    reasons.push(
      `Mid-cap (${formatMcap(mcap)} market cap) — growing company with more room to run, but also more sensitive to earnings surprises and sector-specific news.`,
    )
  } else {
    score += 3
    reasons.push(
      `Small/micro-cap (${formatMcap(mcap)} market cap) — lower trading volume means even modest buying or selling can cause sharp price moves.`,
    )
  }

  // 2. Intraday range spread — volatility signal
  if (quote.dayHigh && quote.dayLow && quote.price > 0) {
    const spread = ((quote.dayHigh - quote.dayLow) / quote.price) * 100
    if (spread > 4) {
      score += 1
      reasons.push(
        `Wide intraday range today (${spread.toFixed(1)}% of price) — the gap between today's high and low suggests elevated short-term volatility.`,
      )
    } else if (spread > 0) {
      reasons.push(
        `Tight intraday range today (${spread.toFixed(1)}% of price) — price has stayed relatively contained this session.`,
      )
    }
  }

  // 3. Single-day move magnitude
  const absChange = Math.abs(quote.changePercent ?? 0)
  if (absChange > 5) {
    score += 1
    reasons.push(`Moved ${absChange.toFixed(1)}% today — an unusually large single-day swing; worth watching if this becomes a pattern.`)
  }

  // For funds, prepend the curated plain-English explanation
  if (fundRiskOverride) {
    reasons.unshift(fundRiskOverride)
  }

  const level: RiskLevel = score >= 4 ? "High" : score >= 2 ? "Medium" : "Low"
  return { level, reasons: reasons.slice(0, 3) }
}

function formatCompact(value: number | null) {
  if (value === null) return "N/A"

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCurrency(value: number | null) {
  if (value === null) return "N/A"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatHistoryLabel(value: string, period: string) {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`)

  if (period === "1d") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

export function StocksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const ticker = searchParams.get("ticker")?.trim().toUpperCase() || "AAPL"
  const [tickerInput, setTickerInput] = useState(ticker)
  const [period, setPeriod] = useState("1mo")
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [history, setHistory] = useState<StockHistoryPoint[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [tradeShares, setTradeShares] = useState("1")
  const [tradeMessage, setTradeMessage] = useState("")
  const [tradeError, setTradeError] = useState("")
  const [pendingTrade, setPendingTrade] = useState<{ action: "buy" | "sell"; shares: number; price: number } | null>(null)
  const { holdings, cashBalance, buyStock, sellStock } = usePortfolioStore()
  const selectedFund = beginnerFunds.find((fund) => fund.symbol === ticker)

  useEffect(() => {
    let cancelled = false

    async function loadStock() {
      setLoading(true)
      setError("")

      try {
        const [quoteData, historyData] = await Promise.all([
          getStockQuote(ticker),
          getStockHistory(ticker, apiPeriod(period), period === "1d" ? "1h" : "1d"),
        ])

        if (!cancelled) {
          setQuote(quoteData)
          setHistory(historyData)
        }
      } catch (err) {
        if (!cancelled) {
          setQuote(null)
          setHistory([])
          setError(err instanceof Error ? err.message : "Unable to load stock data.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadStock()

    return () => {
      cancelled = true
    }
  }, [ticker, period])

  const positive = (quote?.change ?? 0) >= 0
  const chartDomain = useMemo(() => {
    if (!history.length) return ["auto", "auto"] as const

    const closes = history.map((point) => point.close)
    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const padding = Math.max((max - min) * 0.18, 1)

    return [Math.floor(min - padding), Math.ceil(max + padding)]
  }, [history])
  const recentHistory = useMemo(() => history.slice(-6).reverse(), [history])
  const derivedRisk = useMemo(
    () => (quote ? deriveRisk(quote, selectedFund?.plainLanguageRisk) : null),
    [quote, selectedFund],
  )
  const currentHolding = useMemo(
    () => holdings.find((holding) => holding.symbol === ticker),
    [holdings, ticker],
  )
  const tradeShareCount = Number(tradeShares)
  const tradeValue =
    quote && Number.isFinite(tradeShareCount) && tradeShareCount > 0
      ? tradeShareCount * quote.price
      : 0
  const periodMove = useMemo(() => {
    if (history.length < 2) return null

    const first = history[0].close
    const last = history[history.length - 1].close
    const change = last - first
    const changePercent = first ? (change / first) * 100 : 0

    return {
      change,
      changePercent,
      positive: change >= 0,
    }
  }, [history])
  const priceLabel = period === "1d" ? "Price" : "Close"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextTicker = tickerInput.trim().toUpperCase()
    if (!nextTicker) return

    setTickerInput(nextTicker)
    setSearchParams({ ticker: nextTicker })
  }

  function selectTicker(nextTicker: string) {
    setTickerInput(nextTicker)
    setSearchParams({ ticker: nextTicker })
    setTradeMessage("")
    setTradeError("")
  }

  function requestTrade(action: "buy" | "sell") {
    if (!quote) return

    const shares = Number(tradeShares)
    if (!Number.isFinite(shares) || shares <= 0) {
      setTradeMessage("")
      setTradeError("Enter a valid share amount.")
      return
    }

    setTradeError("")
    setTradeMessage("")
    setPendingTrade({ action, shares, price: quote.price })
  }

  function confirmTrade() {
    if (!pendingTrade || !quote) return

    const { action, shares, price } = pendingTrade
    const result =
      action === "buy"
        ? buyStock({
            symbol: quote.ticker,
            name: selectedFund?.name ?? quote.name,
            shares,
            price,
            change: quote.changePercent,
            category: selectedFund ? "fund" : "stock",
            risk: selectedFund?.symbol === "BND" ? "Low" : "Medium",
            expenseRatio: selectedFund?.expenseRatio,
            diversification: selectedFund?.diversification,
            plainLanguageRisk: selectedFund?.plainLanguageRisk,
            dataSource: selectedFund
              ? "Live ETF quote from market data when available; fee/risk profile from curated beginner fund shelf."
              : "Live stock quote from FastAPI/yfinance when available.",
          })
        : sellStock({ symbol: quote.ticker, shares, price })

    setPendingTrade(null)
    if (result.ok) {
      setTradeError("")
      setTradeMessage(result.message)
    } else {
      setTradeMessage("")
      setTradeError(result.message)
    }
  }

  function cancelTrade() {
    setPendingTrade(null)
    setTradeError("")
    setTradeMessage("")
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Live stock lookup
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-foreground">Research a ticker with context.</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Pull real market data from the FastAPI backend and inspect price, movement, volume, market cap, and recent history.
        </p>
      </section>

      <Card>
        <CardContent className="p-5">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-12 w-full rounded-md border border-input bg-card pl-10 pr-4 text-sm font-semibold uppercase text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/20"
                placeholder="AAPL"
                value={tickerInput}
                onChange={(event) => setTickerInput(event.target.value)}
              />
            </div>
            <Button className="h-11" disabled={loading} type="submit">
              {loading ? "Searching..." : "Lookup"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {popularTickers.map((item) => (
              <button
                key={item}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  item === ticker
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
                type="button"
                onClick={() => selectTicker(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-md border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Beginner fund shelf</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  These ETFs stand in for mutual-fund style diversification in the prototype.
                </p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Fees shown before simulated buys</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {beginnerFunds.map((fund) => (
                <button
                  key={fund.symbol}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-xs transition-colors",
                    fund.symbol === ticker
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                  type="button"
                  onClick={() => selectTicker(fund.symbol)}
                >
                  <span className="block font-semibold">{fund.symbol}</span>
                  <span className="block">{fund.expenseRatio.toFixed(2)}% yearly fee</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground">Could not load ticker</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {quote ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b border-border p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-semibold tracking-normal text-foreground">{quote.ticker}</h2>
                    <Badge variant="outline">{quote.name}</Badge>
                    {selectedFund ? <Badge variant="default">Fund / ETF</Badge> : null}
                  </div>
                  <p className="mt-3 text-4xl font-semibold tracking-normal text-foreground">
                    {formatCurrency(quote.price)}
                  </p>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold",
                    positive
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-destructive/30 bg-destructive/10 text-rose-700",
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                  )}
                  {positive ? "+" : ""}
                  {formatCurrency(quote.change)} ({positive ? "+" : ""}
                  {quote.changePercent}%)
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Market cap</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatCompact(quote.marketCap)}</p>
                </div>
                <div className="rounded-md border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Volume</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatCompact(quote.volume)}</p>
                </div>
                <div className="rounded-md border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Previous close</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(quote.previousClose)}</p>
                </div>
                <div className="rounded-md border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Day range</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatCurrency(quote.dayLow)} - {formatCurrency(quote.dayHigh)}
                  </p>
                </div>
              </div>

              {selectedFund ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-muted/45 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Expense ratio</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {selectedFund.expenseRatio.toFixed(2)}%/yr
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/45 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Diversification</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-foreground">{selectedFund.diversification}</p>
                  </div>
                </div>
              ) : null}

              {derivedRisk ? (
                <div className="mt-4 rounded-md border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-accent" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">Risk assessment</p>
                    <Badge variant={riskVariant[derivedRisk.level]}>{derivedRisk.level} risk</Badge>
                  </div>
                  <ul className="space-y-2">
                    {derivedRisk.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
                <div className="rounded-md border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">Portfolio position</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border bg-muted/45 px-3 py-3">
                      <p className="text-sm font-medium text-muted-foreground">Shares owned</p>
                      <p className="shrink-0 whitespace-nowrap text-right text-xl font-semibold tabular-nums leading-none text-foreground">
                        {currentHolding ? currentHolding.shares.toFixed(2) : "0.00"}
                      </p>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border bg-muted/45 px-3 py-3">
                      <p className="text-sm font-medium text-muted-foreground">Position value</p>
                      <p className="shrink-0 whitespace-nowrap text-right text-xl font-semibold tabular-nums leading-none text-foreground">
                        {currentHolding ? formatCurrency(getHoldingValue(currentHolding)) : "$0.00"}
                      </p>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border bg-muted/45 px-3 py-3">
                      <p className="text-sm font-medium text-muted-foreground">Cash available</p>
                      <p className="shrink-0 whitespace-nowrap text-right text-xl font-semibold tabular-nums leading-none text-primary">
                        {formatCurrency(cashBalance)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground">Trade</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <label className="flex-1">
                      <span className="mb-1 block text-xs font-medium text-muted-foreground">Shares</span>
                      <input
                        className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-ring/20"
                        min="0.01"
                        step="0.01"
                        type="number"
                        value={tradeShares}
                        onChange={(event) => {
                          setTradeShares(event.target.value)
                          setTradeMessage("")
                          setTradeError("")
                          setPendingTrade(null)
                        }}
                      />
                    </label>
                    <div className="flex items-end gap-2">
                      <Button className="h-10 flex-1" disabled={!!pendingTrade} type="button" onClick={() => requestTrade("buy")}>
                        Buy
                      </Button>
                      <Button
                        className="h-10 flex-1"
                        disabled={!!pendingTrade}
                        type="button"
                        variant="secondary"
                        onClick={() => requestTrade("sell")}
                      >
                        Sell
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Estimated value</span>
                    <span className="font-semibold text-foreground">{formatCurrency(tradeValue)}</span>
                  </div>

                  {pendingTrade ? (
                    <div className="mt-3 rounded-md border border-amber-300/60 bg-amber-50/80 p-3 dark:border-amber-700/40 dark:bg-amber-950/30">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        Confirm trade
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        <span className={cn(
                          "mr-1.5 rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase",
                          pendingTrade.action === "buy"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                        )}>
                          {pendingTrade.action}
                        </span>
                        {pendingTrade.shares} share{pendingTrade.shares !== 1 ? "s" : ""} of {quote?.ticker} at {formatCurrency(pendingTrade.price)} each
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        Total: {formatCurrency(pendingTrade.shares * pendingTrade.price)}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button className="h-8 flex-1 text-xs" type="button" onClick={confirmTrade}>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Confirm
                        </Button>
                        <Button className="h-8 flex-1 text-xs" type="button" variant="ghost" onClick={cancelTrade}>
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {tradeMessage ? <p className="mt-3 text-xs font-medium text-primary">{tradeMessage}</p> : null}
                  {tradeError ? <p className="mt-3 text-xs font-medium text-rose-700">{tradeError}</p> : null}
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold text-foreground">Price history</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {periods.map((item) => (
                    <button
                      key={item}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                        item === period
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                      type="button"
                      onClick={() => setPeriod(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {periodMove ? (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{period === "all" ? "all-time" : period} movement</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold",
                      periodMove.positive ? "text-primary" : "text-rose-700",
                    )}
                  >
                    {periodMove.positive ? (
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                    )}
                    {periodMove.positive ? "+" : ""}
                    {formatCurrency(periodMove.change)} ({periodMove.positive ? "+" : ""}
                    {periodMove.changePercent.toFixed(2)}%)
                  </span>
                </div>
              ) : null}

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="stockLookup" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(8,13,33,0.1)" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="date"
                      minTickGap={24}
                      tick={{ fill: "#6d7d99", fontSize: 12, fontWeight: 800 }}
                      tickFormatter={(value) => formatHistoryLabel(String(value), period)}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={false}
                      domain={chartDomain}
                      tick={{ fill: "#6d7d99", fontSize: 12, fontWeight: 800 }}
                      tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value) => [formatCurrency(Number(value)), priceLabel]}
                      labelFormatter={(value) => formatHistoryLabel(String(value), period)}
                    />
                    <Area
                      dataKey="close"
                      fill="url(#stockLookup)"
                      stroke="#0f766e"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              </div>

              <div className="rounded-md border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {period === "1d" ? "Recent hours" : "Recent sessions"}
                  </h3>
                  </div>
                  <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[340px] text-left text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 font-medium">{period === "1d" ? "Time" : "Date"}</th>
                        <th className="px-3 py-3 font-medium">{priceLabel}</th>
                        <th className="px-3 py-3 font-medium">Range</th>
                        <th className="px-4 py-3 font-medium">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentHistory.map((point) => (
                        <tr className="border-b border-border/70 last:border-0" key={point.date}>
                          <td className="px-4 py-3 font-medium text-foreground">
                            {formatHistoryLabel(point.date, period)}
                          </td>
                          <td className="px-3 py-3 text-foreground">{formatCurrency(point.close)}</td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {formatCurrency(point.low)} - {formatCurrency(point.high)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatCompact(point.volume)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
