import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Link } from "react-router-dom"
import { ArrowDownRight, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getHoldingValue, type RiskLevel, usePortfolioStore } from "@/store/portfolio"

const riskVariant: Record<RiskLevel, "low" | "medium" | "high"> = {
  Low: "low",
  Medium: "medium",
  High: "high",
}

function AllocationTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number }>
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-panel">
      <p className="font-medium text-white">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value}% allocation</p>
    </div>
  )
}

function HealthRing({ score }: { score: number }) {
  const radius = 84
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 220 220">
        <circle
          cx="110"
          cy="110"
          fill="none"
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="12"
        />
        <circle
          cx="110"
          cy="110"
          fill="none"
          r={radius}
          stroke="url(#healthGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="12"
        />
        <defs>
          <linearGradient id="healthGradient" x1="30" x2="190" y1="30" y2="190">
            <stop stopColor="#34a85a" />
            <stop offset="1" stopColor="#6495ed" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center">
        <div className="text-6xl font-semibold tracking-normal text-white">{score}</div>
        <div className="mt-2 text-sm font-medium text-muted-foreground">Portfolio Health</div>
      </div>
    </div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

export function DashboardPage() {
  const { healthScore, profile, timeline, goal, allocation, holdings, cashBalance } =
    usePortfolioStore()

  return (
    <div className="space-y-8">
      <section className="space-y-3 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-glow">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-white">Financial clarity, instantly.</h1>
        <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
          A calm command center for understanding your risk, allocation, and holdings without spreadsheet anxiety.
        </p>
      </section>

      <Card className="overflow-hidden">
        <CardContent className="p-8">
          <HealthRing score={healthScore} />
          <div className="mt-7 grid grid-cols-3 gap-3">
            {[profile, timeline, goal].map((chip) => (
              <div
                key={chip}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {chip}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid items-center gap-5 sm:grid-cols-[1fr_0.9fr]">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<AllocationTooltip />} cursor={false} />
                  <Pie
                    data={allocation}
                    dataKey="value"
                    innerRadius={66}
                    outerRadius={92}
                    paddingAngle={4}
                    stroke="rgba(10,13,20,0.92)"
                    strokeWidth={5}
                  >
                    {allocation.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {allocation.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-md border border-white/[0.08] bg-white/[0.035] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-white">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 rounded-md border border-white/[0.08] bg-white/[0.035] px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Cash available</span>
              <span className="text-sm font-semibold text-primary">{formatCurrency(cashBalance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Your Holdings</CardTitle>
          <Badge variant="outline">{holdings.length} positions</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {holdings.map((holding) => {
            const positive = holding.change >= 0
            const value = getHoldingValue(holding)

            return (
              <Link
                key={holding.symbol}
                aria-label={`View ${holding.symbol} stock details`}
                className="grid grid-cols-[auto_1fr] gap-4 rounded-lg border border-white/[0.08] bg-white/[0.035] p-4 transition-colors hover:border-primary/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[76px_1fr_96px_104px_86px_auto] sm:items-center"
                to={`/stocks?ticker=${encodeURIComponent(holding.symbol)}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-xs font-semibold text-white sm:h-auto sm:w-auto sm:border-0 sm:bg-transparent sm:text-sm">
                  {holding.symbol}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{holding.name}</p>
                  <p className="text-xs text-muted-foreground sm:hidden">
                    {holding.shares.toFixed(2)} shares · {formatCurrency(value)}
                  </p>
                </div>
                <div className="hidden text-sm font-medium text-white sm:block">
                  {holding.shares.toFixed(2)} sh
                </div>
                <div className="hidden text-sm font-medium text-white sm:block">{formatCurrency(value)}</div>
                <div
                  className={cn(
                    "hidden items-center gap-1 text-sm font-semibold sm:flex",
                    positive ? "text-emerald-300" : "text-rose-300",
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                  )}
                  {positive ? "+" : ""}
                  {holding.change}%
                </div>
                <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:justify-end">
                  <div
                    className={cn(
                      "flex items-center gap-1 text-sm font-semibold sm:hidden",
                      positive ? "text-emerald-300" : "text-rose-300",
                    )}
                  >
                    {positive ? (
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                    )}
                    {positive ? "+" : ""}
                    {holding.change}%
                  </div>
                  <Badge variant={riskVariant[holding.risk]}>{holding.risk} risk</Badge>
                </div>
              </Link>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/[0.07]">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/[0.15] text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Suggested next move</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Keep cash near 15% while gradually adding to diversified mutual funds. Your portfolio is healthy, but a little more broad exposure would smooth volatility.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
