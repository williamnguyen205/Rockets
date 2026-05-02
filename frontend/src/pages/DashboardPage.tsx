import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Link } from "react-router-dom"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ChevronRight,
  PieChart as PieChartIcon,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getAllocation,
  getAllocationDrift,
  getHoldingValue,
  getPortfolioValue,
  TARGET_ALLOCATION_BY_PROFILE,
  type Holding,
  type InvestmentTimeline,
  type InvestorProfile,
  type RiskLevel,
  usePortfolioStore,
} from "@/store/portfolio"

const PROFILE_CHOICES: { value: InvestorProfile; label: string }[] = [
  { value: "Conservative", label: "Conservative" },
  { value: "Balanced", label: "Balanced" },
  { value: "Growth", label: "Growth" },
  { value: "Aggressive", label: "Aggressive" },
]

const TIMELINE_CHOICES: { value: InvestmentTimeline; label: string }[] = [
  { value: "1-3 years", label: "Within the next 1–3 years" },
  { value: "3-5 years", label: "About 3–5 years" },
  { value: "5-10 years", label: "5–10 years" },
  { value: "10+ years", label: "More than 10 years" },
]

const GOAL_CHOICES: { value: string; label: string }[] = [
  { value: "Buying a home", label: "Buying a home" },
  { value: "Retirement", label: "Retirement" },
  { value: "Wealth Growth", label: "Wealth growth" },
  { value: "Big purchase", label: "A big purchase (car, wedding, education)" },
  { value: "Exploring", label: "Other / not sure yet" },
]

const MONTHLY_PRESETS = [0, 50, 200, 500, 1000]

function goalChipLabel(goal: string) {
  return GOAL_CHOICES.find((g) => g.value === goal)?.label ?? goal
}

function PlanMetricDropdown({
  open,
  onOpenChange,
  triggerLabel,
  triggerText,
  children,
  menuRole = "listbox",
  wideMenu = false,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  triggerLabel: string
  triggerText: string
  children: ReactNode
  /** Use "none" when the panel mixes inputs with options (e.g. monthly custom amount). */
  menuRole?: "listbox" | "none"
  wideMenu?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open, onOpenChange])

  return (
    <div className={cn("relative", open ? "z-[250]" : "z-0")} ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex min-h-[4.25rem] w-full min-w-0 items-center justify-between gap-3 rounded-md border border-border/70 bg-muted/45 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
          open && "border-primary/50 bg-muted shadow-sm",
        )}
        type="button"
        onClick={() => onOpenChange(!open)}
      >
        <span className="min-w-0">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-normal text-muted-foreground">
            {triggerLabel}
          </span>
          <span className="mt-1 block text-sm font-semibold leading-snug text-foreground">
            {triggerText}
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[260] max-h-[min(24rem,calc(100vh-8rem))] min-w-[14rem] overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-panel outline-none ring-1 ring-border/70"
          role={menuRole === "none" ? undefined : menuRole}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

const riskVariant: Record<RiskLevel, "low" | "medium" | "high"> = {
  Low: "low",
  Medium: "medium",
  High: "high",
}

const defaultRiskExplanation: Record<RiskLevel, string> = {
  Low: "Lower expected volatility in this prototype. Diversified funds, ETFs, mutual funds, and bond-style holdings are treated as low risk.",
  Medium: "Moderate expected volatility. This stock can move day to day, but it is not flagged as one of the most volatile names.",
  High: "Higher expected volatility. This stock is more likely to have large price swings, so losses can be steeper and faster.",
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
            <stop stopColor="#2178C4" />
            <stop offset="1" stopColor="#22263F" />
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

const DASH_PERIODS = ["1d", "1w", "1mo", "3mo", "6mo", "1y", "all"] as const
type DashPeriod = (typeof DASH_PERIODS)[number]

// For "1d" the unit is half-hour slots (13 slots = 9:30am–4:00pm); all others are calendar days.
const DASH_PERIOD_POINTS: Record<DashPeriod, number> = {
  "1d": 13,
  "1w": 7,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
  all: 730,
}

function generatePortfolioHistory(
  currentValue: number,
  dailyVolatility: number,
  points: number,
): { date: string; value: number }[] {
  if (currentValue <= 0) return []

  const intraday = points <= 13

  let s = ((Math.floor(currentValue) * 37 + points * 13) % 2_147_483_647) + 1
  function rand() {
    s = (s * 16807) % 2_147_483_647
    return (s - 1) / 2_147_483_646
  }

  // Intraday vol is much smaller (daily vol spread over ~13 half-hour slots)
  const vol = intraday
    ? Math.max(0.001, Math.min(dailyVolatility / 4, 0.004))
    : Math.max(0.004, Math.min(dailyVolatility, 0.025))

  const multipliers: number[] = []
  for (let i = 0; i < points - 1; i++) {
    multipliers.push(1 + (rand() * 2 - 1) * vol)
  }

  const values: number[] = [currentValue]
  for (let i = multipliers.length - 1; i >= 0; i--) {
    values.unshift(values[0] / multipliers[i])
  }

  const now = new Date()

  return values.map((value, i) => {
    let label: string
    if (intraday) {
      // Map 13 slots evenly across 9:30am–4:00pm (6.5 trading hours)
      const totalMins = 390 // 6.5 * 60
      const mins = Math.round((i / (points - 1)) * totalMins)
      const totalFromMidnight = 9 * 60 + 30 + mins
      const h = Math.floor(totalFromMidnight / 60)
      const m = totalFromMidnight % 60
      const ampm = h < 12 ? "am" : "pm"
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      label = `${h12}:${m.toString().padStart(2, "0")}${ampm}`
    } else if (points > 90) {
      const d = new Date(now)
      d.setDate(now.getDate() - (points - 1 - i))
      label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    } else {
      const d = new Date(now)
      d.setDate(now.getDate() - (points - 1 - i))
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
    return { date: label, value: Math.round(value * 100) / 100 }
  })
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
    return <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">{rounded}% over target</span>
  }
  return <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">{Math.abs(rounded)}% under target</span>
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

function getSuggestedNextMove(
  profile: InvestorProfile,
  allocation: ReturnType<typeof getAllocation>,
  holdings: Holding[],
  cashBalance: number,
  formatMoney: (value: number) => string,
) {
  const target = TARGET_ALLOCATION_BY_PROFILE[profile]
  const cashPct = allocation.find((a) => a.name === "Cash")?.value ?? 0
  const stocksPct = allocation.find((a) => a.name === "Stocks")?.value ?? 0
  const fundsPct = allocation.find((a) => a.name === "Mutual Funds")?.value ?? 0
  const investedPct = stocksPct + fundsPct
  const totalValue = getPortfolioValue(holdings, cashBalance)

  if (totalValue <= 0) {
    return "Add practice cash and your first positions from the Stocks tab—your allocation bars will update with every trade."
  }

  if (holdings.length === 0 && cashBalance > 0) {
    return `You're 100% in cash (${formatMoney(cashBalance)} available). Your ${profile.toLowerCase()} target is about ${target.stocks}% stocks, ${target.funds}% funds, and ${target.cash}% cash—when you're ready, start with a buy that moves you toward that mix.`
  }

  if (cashPct >= 90 && holdings.length > 0) {
    return `Most of your portfolio is still cash (${cashPct}%). Consider investing toward your ${target.stocks + target.funds}% stocks-and-funds target if that fits your timeline.`
  }

  if (cashPct > target.cash + 12) {
    return `You're at about ${cashPct}% cash versus a ~${target.cash}% target for a ${profile.toLowerCase()} posture—deploying some into stocks or funds could bring you closer to plan.`
  }

  if (investedPct > target.stocks + target.funds + 12) {
    return "You're more invested than your target mix—if a goal is getting closer, consider trimming risk or building a cash buffer."
  }

  return nextMoveByProfile[profile]
}

export function DashboardPage() {
  const {
    healthScore,
    profile,
    timeline,
    goal,
    monthlyContribution,
    holdings,
    cashBalance,
    updateProfileSettings,
    setCashBalance,
  } = usePortfolioStore()

  const [openMetric, setOpenMetric] = useState<"profile" | "timeline" | "goal" | "monthly" | null>(null)
  const [chartPeriod, setChartPeriod] = useState<DashPeriod>("1mo")
  const [monthlyInputDraft, setMonthlyInputDraft] = useState("")
  const [cashPanelOpen, setCashPanelOpen] = useState(false)
  const [cashDraft, setCashDraft] = useState("")

  function commitCash() {
    const parsed = parseFloat(cashDraft.replace(/,/g, ""))
    setCashBalance(Number.isFinite(parsed) ? parsed : 0)
    setCashPanelOpen(false)
  }

  function commitMonthlyFromDraft() {
    const parsed = Number.parseFloat(monthlyInputDraft.replace(/,/g, ""))
    const value = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
    updateProfileSettings({ monthlyContribution: value })
    setOpenMetric(null)
  }

  const monthlyOptions = useMemo(
    () => [...new Set([...MONTHLY_PRESETS, monthlyContribution])].sort((a, b) => a - b),
    [monthlyContribution],
  )

  const allocation = useMemo(() => getAllocation(holdings, cashBalance), [holdings, cashBalance])
  const pieSlices = useMemo(() => allocation.filter((item) => item.value > 0), [allocation])

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
        color: "#34a85a",
        driftPp: drift.stocks,
      },
      {
        label: "Mutual Funds",
        current: allocation.find((a) => a.name === "Mutual Funds")?.value ?? 0,
        targetPct: targetAllocation.funds,
        color: "#4682b4",
        driftPp: drift.funds,
      },
      {
        label: "Cash",
        current: allocation.find((a) => a.name === "Cash")?.value ?? 0,
        targetPct: targetAllocation.cash,
        color: "#6495ed",
        driftPp: drift.cash,
      },
    ],
    [allocation, targetAllocation, drift],
  )

  const suggestedNextMove = useMemo(
    () => getSuggestedNextMove(profile, allocation, holdings, cashBalance, formatCurrency),
    [profile, allocation, holdings, cashBalance],
  )

  const portfolioTotal = useMemo(() => getPortfolioValue(holdings, cashBalance), [holdings, cashBalance])
  const investedValue = portfolioTotal - cashBalance
  const weightedDayMove = useMemo(
    () =>
      holdings.reduce((total, holding) => {
        const value = getHoldingValue(holding)
        return total + value * (holding.change / 100)
      }, 0),
    [holdings],
  )
  const weightedDayMovePct = investedValue ? (weightedDayMove / investedValue) * 100 : 0

  const avgDailyVol = useMemo(() => {
    if (!holdings.length) return 0.01
    return holdings.reduce((sum, h) => sum + Math.abs(h.change) / 100, 0) / holdings.length / 5
  }, [holdings])

  const portfolioHistory = useMemo(
    () => generatePortfolioHistory(portfolioTotal, avgDailyVol, DASH_PERIOD_POINTS[chartPeriod]),
    [portfolioTotal, avgDailyVol, chartPeriod],
  )

  const chartPositive =
    portfolioHistory.length > 1 &&
    portfolioHistory[portfolioHistory.length - 1].value >= portfolioHistory[0].value
  const chartColor = portfolioHistory.length === 0 ? "#8B9BB4" : chartPositive ? "#2178C4" : "#be123c"

  const chartMove = useMemo(() => {
    if (portfolioHistory.length < 2) return null
    const first = portfolioHistory[0].value
    const last = portfolioHistory[portfolioHistory.length - 1].value
    const change = last - first
    const changePct = first ? (change / first) * 100 : 0
    return { change, changePct, positive: change >= 0 }
  }, [portfolioHistory])

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
                    {formatCurrency(portfolioTotal)}
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

            {portfolioHistory.length > 0 ? (
              <div className="border-t border-border bg-card px-5 pb-4 pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">Portfolio value</span>
                    {chartMove ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-sm font-semibold",
                          chartMove.positive ? "text-emerald-700" : "text-rose-700",
                        )}
                      >
                        {chartMove.positive ? (
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                        )}
                        {chartMove.positive ? "+" : ""}
                        {formatCurrency(chartMove.change)} ({chartMove.positive ? "+" : ""}
                        {chartMove.changePct.toFixed(2)}%)
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DASH_PERIODS.map((p) => (
                      <button
                        key={p}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                          p === chartPeriod
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                        type="button"
                        onClick={() => setChartPeriod(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={portfolioHistory} margin={{ left: 0, right: 4, top: 6, bottom: 0 }}>
                      <defs>
                        <linearGradient id="portfolioGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor={chartColor} stopOpacity={0.28} />
                          <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(34,38,63,0.06)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6d7d99", fontSize: 11, fontWeight: 600 }}
                        minTickGap={32}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        domain={["auto", "auto"]}
                        tick={{ fill: "#6d7d99", fontSize: 11, fontWeight: 600 }}
                        tickFormatter={(v) =>
                          v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Number(v).toFixed(0)}`
                        }
                        width={44}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                        formatter={(value) => [formatCurrency(Number(value)), "Portfolio value"]}
                      />
                      <Area
                        dataKey="value"
                        type="monotone"
                        stroke={chartColor}
                        strokeWidth={2}
                        fill="url(#portfolioGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card
          className={cn(
            "relative overflow-visible",
            openMetric !== null && "z-40 shadow-md ring-1 ring-border/40",
          )}
        >
          <CardContent className="overflow-visible p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Plan fit</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{profile}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {TIMELINE_CHOICES.find((t) => t.value === timeline)?.label ?? timeline} · {goalChipLabel(goal)}
                </p>
              </div>
              <Badge variant="outline">{formatCurrency(monthlyContribution)}/mo</Badge>
            </div>
            <HealthRing score={healthScore} />
            <div className="mt-4 grid grid-cols-1 gap-3 overflow-visible sm:grid-cols-2">
              <PlanMetricDropdown
                open={openMetric === "profile"}
                triggerLabel="Profile"
                triggerText={profile}
                onOpenChange={(next) => setOpenMetric(next ? "profile" : null)}
              >
                {PROFILE_CHOICES.map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      opt.value === profile && "bg-primary/10 font-semibold text-primary",
                    )}
                    role="option"
                    type="button"
                    onClick={() => {
                      updateProfileSettings({ profile: opt.value })
                      setOpenMetric(null)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </PlanMetricDropdown>
              <PlanMetricDropdown
                open={openMetric === "timeline"}
                triggerLabel="Timeline"
                triggerText={TIMELINE_CHOICES.find((t) => t.value === timeline)?.label ?? timeline}
                wideMenu
                onOpenChange={(next) => setOpenMetric(next ? "timeline" : null)}
              >
                {TIMELINE_CHOICES.map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      opt.value === timeline && "bg-primary/10 font-semibold text-primary",
                    )}
                    role="option"
                    type="button"
                    onClick={() => {
                      updateProfileSettings({ timeline: opt.value })
                      setOpenMetric(null)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </PlanMetricDropdown>
              <PlanMetricDropdown
                open={openMetric === "goal"}
                triggerLabel="Goal"
                triggerText={goalChipLabel(goal)}
                wideMenu
                onOpenChange={(next) => setOpenMetric(next ? "goal" : null)}
              >
                {GOAL_CHOICES.map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      opt.value === goal && "bg-primary/10 font-semibold text-primary",
                    )}
                    role="option"
                    type="button"
                    onClick={() => {
                      updateProfileSettings({ goal: opt.value })
                      setOpenMetric(null)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </PlanMetricDropdown>
              <PlanMetricDropdown
                menuRole="none"
                open={openMetric === "monthly"}
                triggerLabel="Monthly"
                triggerText={`${formatCurrency(monthlyContribution)}/mo`}
                onOpenChange={(next) => {
                  if (next) {
                    setMonthlyInputDraft(
                      monthlyContribution > 0 ? String(monthlyContribution) : "",
                    )
                  }
                  setOpenMetric(next ? "monthly" : null)
                }}
              >
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick amounts
                </p>
                {monthlyOptions.map((amount) => (
                  <button
                    key={amount}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      amount === monthlyContribution && "bg-primary/10 font-semibold text-primary",
                    )}
                    type="button"
                    onClick={() => {
                      updateProfileSettings({ monthlyContribution: amount })
                      setOpenMetric(null)
                    }}
                  >
                    {formatCurrency(amount)}/mo
                  </button>
                ))}
                <div className="mx-2 my-2 border-t border-border" />
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Custom amount
                </p>
                <div className="px-3 pb-2">
                  <label className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 focus-within:ring-2 focus-within:ring-ring/30">
                    <span className="pl-1 text-xs font-semibold text-muted-foreground">$</span>
                    <input
                      className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                      inputMode="decimal"
                      placeholder="0"
                      type="text"
                      autoComplete="off"
                      value={monthlyInputDraft}
                      onChange={(event) => {
                        let next = event.target.value.replace(/[^\d.]/g, "")
                        const dot = next.indexOf(".")
                        if (dot !== -1) {
                          next = `${next.slice(0, dot + 1)}${next.slice(dot + 1).replace(/\./g, "")}`
                        }
                        setMonthlyInputDraft(next)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return
                        event.preventDefault()
                        commitMonthlyFromDraft()
                      }}
                    />
                    <span className="pr-1 text-xs font-semibold text-muted-foreground">/mo</span>
                  </label>
                  <button
                    className="mt-2 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    type="button"
                    onClick={commitMonthlyFromDraft}
                  >
                    Apply
                  </button>
                </div>
              </PlanMetricDropdown>
          </div>
        </CardContent>
      </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Your allocation</CardTitle>
              <CardDescription>
                Percentages are computed from your positions and cash ({formatCurrency(portfolioTotal)} total)—same
                numbers drive the guidance below.
              </CardDescription>
            </div>
            <PieChartIcon className="h-5 w-5 text-accent" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actual mix</p>
              <div
                className="flex h-11 w-full overflow-hidden rounded-full border-2 border-border/90 bg-muted shadow-inner"
                role="img"
                aria-label={`Allocation: ${allocation.map((s) => `${s.name} ${s.value}%`).join(", ")}`}
              >
                {allocation.map((seg) =>
                  seg.value > 0 ? (
                    <div
                      key={seg.name}
                      className="flex min-w-0 items-center justify-center px-1 text-[10px] font-black leading-tight text-white drop-shadow-sm sm:text-xs"
                      style={{
                        width: `${seg.value}%`,
                        backgroundColor: seg.color,
                      }}
                      title={`${seg.name}: ${seg.value}%`}
                    >
                      {seg.value >= 6 ? `${seg.value}%` : ""}
                    </div>
                  ) : null,
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {allocation.map((item) => (
                  <span key={item.name} className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span>{item.value.toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid items-center gap-5 sm:grid-cols-[1fr_0.9fr]">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<AllocationTooltip />} cursor={false} />
                    <Pie
                      data={pieSlices.length ? pieSlices : [{ name: "Cash", value: 100, color: "#6495ed" }]}
                      dataKey="value"
                      innerRadius={66}
                      outerRadius={92}
                      paddingAngle={0}
                      stroke="none"
                      strokeWidth={0}
                    >
                      {(pieSlices.length ? pieSlices : [{ name: "Cash", value: 100, color: "#6495ed" }]).map(
                        (entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ),
                      )}
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
                    <span className="text-sm font-semibold text-muted-foreground">{item.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/45 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">Cash available</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">{formatCurrency(cashBalance)}</span>
                  <button
                    className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    type="button"
                    onClick={() => {
                      setCashDraft(cashBalance > 0 ? String(cashBalance) : "")
                      setCashPanelOpen((prev) => !prev)
                    }}
                  >
                    {cashPanelOpen ? "Cancel" : "Edit"}
                  </button>
                </div>
              </div>
              {cashPanelOpen ? (
                <div className="mt-3 flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-1 rounded-lg border border-border bg-background px-2 focus-within:ring-2 focus-within:ring-ring/30">
                    <span className="pl-1 text-xs font-semibold text-muted-foreground">$</span>
                    <input
                      autoFocus
                      className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                      inputMode="decimal"
                      placeholder="10000"
                      type="text"
                      value={cashDraft}
                      onChange={(e) => {
                        let next = e.target.value.replace(/[^\d.]/g, "")
                        const dot = next.indexOf(".")
                        if (dot !== -1) next = `${next.slice(0, dot + 1)}${next.slice(dot + 1).replace(/\./g, "")}`
                        setCashDraft(next)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commitCash() }
                      }}
                    />
                  </label>
                  <button
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    type="button"
                    onClick={commitCash}
                  >
                    Set
                  </button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How your mix compares with your plan</CardTitle>
            <CardDescription>
              Targets match your <span className="font-medium text-foreground">{profile}</span> posture. Each bar shows
              where your money is now; the thin line shows the goal for that bucket.
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
          {holdings.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/80 bg-muted/40 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">No holdings yet.</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Add practice positions from the Stocks tab, then use Scenarios to review rebalancing ideas.
              </p>
            </div>
          ) : null}
          {holdings.length > 0 ? (
            <div className="hidden grid-cols-[76px_minmax(0,1fr)_96px_116px_86px_258px_24px] items-center gap-4 px-4 text-xs font-semibold uppercase text-muted-foreground sm:grid">
              <span className="text-center">Symbol</span>
              <span className="pl-0">Name</span>
              <span className="text-right">Shares</span>
              <span className="text-center">Value</span>
              <span className="text-right">Daily move</span>
              <span className="text-right">Type / Risk</span>
              <span />
            </div>
          ) : null}
          {holdings.map((holding) => {
            const positive = holding.change >= 0
            const value = getHoldingValue(holding)

            return (
              <Link
                key={holding.symbol}
                aria-label={`View ${holding.symbol} stock details`}
                className="grid min-h-[5.75rem] grid-cols-[auto_1fr] gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-accent hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[76px_minmax(0,1fr)_96px_116px_86px_258px_24px] sm:items-center"
                to={`/stocks?ticker=${encodeURIComponent(holding.symbol)}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-muted text-xs font-semibold text-foreground sm:h-auto sm:w-auto sm:border-0 sm:bg-transparent sm:text-sm">
                  {holding.symbol}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{holding.name}</p>
                  <p className="text-xs text-muted-foreground sm:hidden">
                    {holding.shares.toFixed(2)} shares · {formatCurrency(value)}
                  </p>
                  {holding.category === "fund" ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {holding.expenseRatio?.toFixed(2)}% yearly fee · {holding.diversification}
                    </p>
                  ) : null}
                </div>
                <div className="hidden text-right text-sm font-medium text-foreground sm:block">
                  {holding.shares.toFixed(2)} sh
                </div>
                <div className="hidden text-center text-sm font-medium tabular-nums text-foreground sm:block">{formatCurrency(value)}</div>
                <div
                  className={cn(
                    "hidden items-center justify-end gap-1 text-sm font-semibold sm:flex",
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
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant={holding.category === "fund" ? "default" : "outline"}>
                      {holding.category === "fund" ? "Fund" : "Stock"}
                    </Badge>
                    <div
                      className="group/risk relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge variant={riskVariant[holding.risk]}>{holding.risk} risk</Badge>
                      <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-60 rounded-md border border-border bg-popover p-3 text-xs shadow-panel opacity-0 transition-opacity duration-150 group-hover/risk:pointer-events-auto group-hover/risk:opacity-100">
                        <p className="font-semibold text-foreground">{holding.risk} risk — why?</p>
                        <p className="mt-1 leading-5 text-muted-foreground">
                          {holding.plainLanguageRisk ?? defaultRiskExplanation[holding.risk]}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <ChevronRight className="ml-auto hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
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
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{suggestedNextMove}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
