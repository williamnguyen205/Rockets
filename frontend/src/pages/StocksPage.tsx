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
  CircleDollarSign,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getStockHistory, getStockQuote, type StockHistoryPoint, type StockQuote } from "@/lib/api"
import { cn } from "@/lib/utils"
import { getHoldingValue, usePortfolioStore } from "@/store/portfolio"

const popularTickers = ["AAPL", "GOOGL", "TSLA", "MSFT", "NVDA"]
const periods = ["1d", "5d", "1mo", "3mo", "6mo", "1y"]

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
  const initialTicker = searchParams.get("ticker")?.trim().toUpperCase() || "AAPL"
  const [tickerInput, setTickerInput] = useState(initialTicker)
  const [ticker, setTicker] = useState(initialTicker)
  const [period, setPeriod] = useState("1mo")
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [history, setHistory] = useState<StockHistoryPoint[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [tradeShares, setTradeShares] = useState("1")
  const [tradeMessage, setTradeMessage] = useState("")
  const [tradeError, setTradeError] = useState("")
  const { holdings, cashBalance, buyStock, sellStock } = usePortfolioStore()

  useEffect(() => {
    const nextTicker = searchParams.get("ticker")?.trim().toUpperCase()
    if (!nextTicker || nextTicker === ticker) return

    setTicker(nextTicker)
    setTickerInput(nextTicker)
    setTradeMessage("")
    setTradeError("")
  }, [searchParams, ticker])

  useEffect(() => {
    let cancelled = false

    async function loadStock() {
      setLoading(true)
      setError("")

      try {
        const [quoteData, historyData] = await Promise.all([
          getStockQuote(ticker),
          getStockHistory(ticker, period, period === "1d" ? "1h" : "1d"),
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

    setTicker(nextTicker)
    setTickerInput(nextTicker)
    setSearchParams({ ticker: nextTicker })
  }

  function selectTicker(nextTicker: string) {
    setTicker(nextTicker)
    setTickerInput(nextTicker)
    setSearchParams({ ticker: nextTicker })
    setTradeMessage("")
    setTradeError("")
  }

  function handleTrade(action: "buy" | "sell") {
    if (!quote) return

    const shares = Number(tradeShares)
    if (!Number.isFinite(shares) || shares <= 0) {
      setTradeMessage("")
      setTradeError("Enter a valid share amount.")
      return
    }

    const result =
      action === "buy"
        ? buyStock({
            symbol: quote.ticker,
            name: quote.name,
            shares,
            price: quote.price,
            change: quote.changePercent,
          })
        : sellStock({
            symbol: quote.ticker,
            shares,
            price: quote.price,
          })

    if (result.ok) {
      setTradeError("")
      setTradeMessage(result.message)
    } else {
      setTradeMessage("")
      setTradeError(result.message)
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-primary">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Live stock lookup
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-white">Search any ticker.</h1>
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
                className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-4 text-sm font-semibold uppercase text-white outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                    : "border-border bg-white/[0.035] text-muted-foreground hover:text-white",
                )}
                type="button"
                onClick={() => selectTicker(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-white">Could not load ticker</p>
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
                    <h2 className="text-3xl font-semibold tracking-normal text-white">{quote.ticker}</h2>
                    <Badge variant="outline">{quote.name}</Badge>
                  </div>
                  <p className="mt-3 text-5xl font-semibold tracking-normal text-white">
                    {formatCurrency(quote.price)}
                  </p>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold",
                    positive
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-destructive/30 bg-destructive/10 text-rose-300",
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
                <div className="rounded-lg border border-border bg-white/[0.035] p-4">
                  <p className="text-xs font-medium text-muted-foreground">Market cap</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatCompact(quote.marketCap)}</p>
                </div>
                <div className="rounded-lg border border-border bg-white/[0.035] p-4">
                  <p className="text-xs font-medium text-muted-foreground">Volume</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatCompact(quote.volume)}</p>
                </div>
                <div className="rounded-lg border border-border bg-white/[0.035] p-4">
                  <p className="text-xs font-medium text-muted-foreground">Previous close</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(quote.previousClose)}</p>
                </div>
                <div className="rounded-lg border border-border bg-white/[0.035] p-4">
                  <p className="text-xs font-medium text-muted-foreground">Day range</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {formatCurrency(quote.dayLow)} - {formatCurrency(quote.dayHigh)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
                <div className="rounded-lg border border-border bg-white/[0.035] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold text-white">Portfolio position</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-white/[0.06] bg-background/30 px-3 py-3">
                      <p className="text-sm font-medium text-muted-foreground">Shares owned</p>
                      <p className="shrink-0 whitespace-nowrap text-right text-xl font-semibold tabular-nums leading-none text-white">
                        {currentHolding ? currentHolding.shares.toFixed(2) : "0.00"}
                      </p>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-white/[0.06] bg-background/30 px-3 py-3">
                      <p className="text-sm font-medium text-muted-foreground">Position value</p>
                      <p className="shrink-0 whitespace-nowrap text-right text-xl font-semibold tabular-nums leading-none text-white">
                        {currentHolding ? formatCurrency(getHoldingValue(currentHolding)) : "$0.00"}
                      </p>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-white/[0.06] bg-background/30 px-3 py-3">
                      <p className="text-sm font-medium text-muted-foreground">Cash available</p>
                      <p className="shrink-0 whitespace-nowrap text-right text-xl font-semibold tabular-nums leading-none text-primary">
                        {formatCurrency(cashBalance)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-white/[0.035] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold text-white">Trade</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <label className="flex-1">
                      <span className="mb-1 block text-xs font-medium text-muted-foreground">Shares</span>
                      <input
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        min="0.01"
                        step="0.01"
                        type="number"
                        value={tradeShares}
                        onChange={(event) => {
                          setTradeShares(event.target.value)
                          setTradeMessage("")
                          setTradeError("")
                        }}
                      />
                    </label>
                    <div className="flex items-end gap-2">
                      <Button className="h-10 flex-1" type="button" onClick={() => handleTrade("buy")}>
                        Buy
                      </Button>
                      <Button
                        className="h-10 flex-1"
                        type="button"
                        variant="secondary"
                        onClick={() => handleTrade("sell")}
                      >
                        Sell
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Estimated value</span>
                    <span className="font-semibold text-white">{formatCurrency(tradeValue)}</span>
                  </div>
                  {tradeMessage ? <p className="mt-3 text-xs font-medium text-primary">{tradeMessage}</p> : null}
                  {tradeError ? <p className="mt-3 text-xs font-medium text-rose-300">{tradeError}</p> : null}
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold text-white">Price history</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {periods.map((item) => (
                    <button
                      key={item}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                        item === period
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:text-white",
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
                  <span className="text-muted-foreground">{period} movement</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold",
                      periodMove.positive ? "text-primary" : "text-rose-300",
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
                        <stop offset="5%" stopColor="#34a85a" stopOpacity={0.42} />
                        <stop offset="95%" stopColor="#34a85a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(229,229,229,0.08)" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="date"
                      minTickGap={24}
                      tick={{ fill: "#a3a3a3", fontSize: 12 }}
                      tickFormatter={(value) => formatHistoryLabel(String(value), period)}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={false}
                      domain={chartDomain}
                      tick={{ fill: "#a3a3a3", fontSize: 12 }}
                      tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#2f3436",
                        border: "1px solid #444444",
                        borderRadius: 8,
                        color: "#e5e5e5",
                      }}
                      formatter={(value) => [formatCurrency(Number(value)), priceLabel]}
                      labelFormatter={(value) => formatHistoryLabel(String(value), period)}
                    />
                    <Area
                      dataKey="close"
                      fill="url(#stockLookup)"
                      stroke="#34a85a"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              </div>

              <div className="rounded-lg border border-border bg-white/[0.025]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-white">
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
                          <td className="px-4 py-3 font-medium text-white">
                            {formatHistoryLabel(point.date, period)}
                          </td>
                          <td className="px-3 py-3 text-white">{formatCurrency(point.close)}</td>
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
