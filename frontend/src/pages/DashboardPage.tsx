import { useMemo } from "react"
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Link } from "react-router-dom"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  PieChart as PieChartIcon,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getAllocationDrift,
  getHoldingValue,
  getPortfolioValue,
  TARGET_ALLOCATION_BY_PROFILE,
  type InvestorProfile,
  type RiskLevel,
  usePortfolioStore,
} from "@/store/portfolio"

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
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-panel">
      <p className="font-medium text-foreground">{payload[0].name}</p>
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
          stroke="hsl(var(--muted))"
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
            <stop stopColor="#0f766e" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative z-10 text-center">
        <div className="text-5xl font-semibold tracking-normal text-foreground">{score}</div>
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

function DeltaChip({ driftPp }: { driftPp: number }) {
  const rounded = Math.round(driftPp)
  if (Math.abs(rounded) <= 3) {
    return <span className="text-xs font-medium text-muted-foreground">On target</span>
  }
  if (rounded > 0) {
    return <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">+{rounded}pp overweight</span>
  }
  return <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">{rounded}pp underweight</span>
}

const nextMoveByProfile: Record<InvestorProfile, string> = {
  Conservative:
    "Prioritize steady contributions and keep enough cash for near-term needs before adding more stock exposure.",
  Balanced:
    "Maintain regular contributions while keeping stocks and funds close to your target allocation.",
  Growth:
    "Your longer-term plan can support more growth exposure, but keep contributions consistent through volatility.",
  Aggressive:
    "Watch concentration risk closely and rebalance when fast-moving positions start dominating the portfolio.",
}

export function DashboardPage() {
  const { healthScore, profile, timeline, goal, monthlyContribution, allocation, holdings, cashBalance } =
    usePortfolioStore()
  const totalValue = getPortfolioValue(holdings, cashBalance)
  const investedValue = totalValue - cashBalance
  const weightedDayMove = holdings.reduce((total, holding) => {
    const value = getHoldingValue(holding)
    return total + value * (holding.change / 100)
  }, 0)
  const weightedDayMovePct = investedValue ? (weightedDayMove / investedValue) * 100 : 0

  const targetAllocation = TARGET_ALLOCATION_BY_PROFILE[profile]
  const drift = useMemo(
    () => getAllocationDrift(allocation, targetAllocation),
    [allocation, targetAllocation],
  )

  const vsTargetRows = useMemo(
    () => [
      {
        label: "Stocks",
        current: allocation.find((a) => a.name === "Stocks")?.value ?? 0,
        targetPct: targetAllocation.stocks,
        color: "#0f766e",
        driftPp: drift.stocks,
      },
      {
        label: "Mutual Funds",
        current: allocation.find((a) => a.name === "Mutual Funds")?.value ?? 0,
        targetPct: targetAllocation.funds,
        color: "#2563eb",
        driftPp: drift.funds,
      },
      {
        label: "Cash",
        current: allocation.find((a) => a.name === "Cash")?.value ?? 0,
        targetPct: targetAllocation.cash,
        color: "#64748b",
        driftPp: drift.cash,
      },
    ],
    [allocation, targetAllocation, drift],
  )

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b border-border bg-muted/35 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Portfolio dashboard</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                    {formatCurrency(totalValue)}
                  </h1>
                </div>
                <Badge variant={weightedDayMove >= 0 ? "low" : "high"}>
                  {weightedDayMove >= 0 ? "+" : ""}
                  {formatCurrency(weightedDayMove)} today
                </Badge>
              </div>
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-3">
              {[
                { label: "Invested", value: formatCurrency(investedValue), icon: BarChart3 },
                { label: "Cash", value: formatCurrency(cashBalance), icon: Wallet },
                {
                  label: "Day move",
                  value: `${weightedDayMovePct >= 0 ? "+" : ""}${weightedDayMovePct.toFixed(2)}%`,
                  icon: ArrowUpRight,
                },
              ].map((metric) => (
                <div key={metric.label} className="bg-card p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <metric.icon className="h-4 w-4 text-accent" aria-hidden="true" />
                    {metric.label}
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Plan fit</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{profile}</p>
                <p className="mt-1 text-sm text-muted-foreground">{timeline} · {goal}</p>
              </div>
              <Badge variant="outline">{formatCurrency(monthlyContribution)}/mo</Badge>
            </div>
            <HealthRing score={healthScore} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Allocation</CardTitle>
            <CardDescription>Current portfolio mix by asset type.</CardDescription>
          </div>
          <PieChartIcon className="h-5 w-5 text-accent" aria-hidden="true" />
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
                    paddingAngle={0}
                    stroke="none"
                    strokeWidth={0}
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
                className="flex items-center justify-between rounded-md border border-border bg-muted/45 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 rounded-md border border-border bg-muted/45 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Cash available</span>
              <span className="text-sm font-semibold text-primary">{formatCurrency(cashBalance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current vs target</CardTitle>
          <CardDescription>
            Targets match your <span className="font-medium text-foreground">{profile}</span> posture. Bars show
            today&apos;s mix; the vertical line is your target for that bucket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {vsTargetRows.map((row) => (
            <div key={row.label} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{row.current}%</span> now ·{" "}
                    <span className="font-semibold text-foreground">{row.targetPct}%</span> target
                  </span>
                  <DeltaChip driftPp={row.driftPp} />
                </div>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-full opacity-90"
                  style={{
                    width: `${Math.min(100, Math.max(0, row.current))}%`,
                    backgroundColor: row.color,
                  }}
                />
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-foreground shadow-sm"
                  style={{ left: `${Math.min(100, Math.max(0, row.targetPct))}%`, transform: "translateX(-50%)" }}
                  aria-hidden
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </section>

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
                className="grid grid-cols-[auto_1fr] gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-accent hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[76px_1fr_96px_104px_86px_auto] sm:items-center"
                to={`/stocks?ticker=${encodeURIComponent(holding.symbol)}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold text-foreground sm:h-auto sm:w-auto sm:border-0 sm:bg-transparent sm:text-sm">
                  {holding.symbol}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{holding.name}</p>
                  <p className="text-xs text-muted-foreground sm:hidden">
                    {holding.shares.toFixed(2)} shares · {formatCurrency(value)}
                  </p>
                </div>
                <div className="hidden text-sm font-medium text-foreground sm:block">
                  {holding.shares.toFixed(2)} sh
                </div>
                <div className="hidden text-sm font-medium text-foreground sm:block">{formatCurrency(value)}</div>
                <div
                  className={cn(
                    "hidden items-center gap-1 text-sm font-semibold sm:flex",
                    positive ? "text-emerald-700" : "text-rose-700",
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
                      positive ? "text-emerald-700" : "text-rose-700",
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
                  <ChevronRight className="ml-2 hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
                </div>
              </Link>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-accent/25 bg-secondary">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary bg-card text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Suggested next move</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {nextMoveByProfile[profile]}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
