import { useMemo, useRef, useState, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowLeftRight, ArrowRight, BrainCircuit, Loader2, SlidersHorizontal, Sparkles, TrendingUp, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { simulateScenario, type ScenarioSimulationAnswer } from "@/lib/api"
import {
  buildScenarioActionPlan,
  buildScenarioPortfolioSnapshot,
  SCENARIO_DEFINITIONS,
  scenarioSnapshotToApiPayload,
  suggestRebalancingStrategy,
  type ScenarioActionPlan,
  type ScenarioId,
} from "@/lib/scenarioPortfolio"
import { cn } from "@/lib/utils"
import {
  getHoldingValue,
  getPortfolioValue,
  TARGET_ALLOCATION_BY_PROFILE,
  type Holding,
  type InvestmentTimeline,
  type InvestorProfile,
  usePortfolioStore,
} from "@/store/portfolio"

const chartSeries = [
  { key: "baseline", label: "Current path", color: "#2563eb" },
  { key: "optimized", label: "Optimized path", color: "#0f766e" },
  { key: "aiScenario", label: "AI scenario", color: "#b45309" },
]

const annualReturnByProfile: Record<InvestorProfile, number> = {
  Conservative: 0.045,
  Balanced: 0.06,
  Growth: 0.075,
  Aggressive: 0.09,
}

const timelineYears: Record<InvestmentTimeline, number> = {
  "1-3 years": 3,
  "3-5 years": 5,
  "5-10 years": 5,
  "10+ years": 5,
}

const examplePrompts = [
  "What if mortgage rates stay high and tech stocks fall 15%?",
  "What if I lose my job for six months next year?",
  "What if AI stocks rally but inflation comes back?",
]

function projectYearlyValues(
  startingValue: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number,
) {
  let value = startingValue
  const monthlyReturn = annualReturn / 12
  const values = [Math.round(value)]

  for (let year = 0; year < years; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      value = value * (1 + monthlyReturn) + monthlyContribution
    }

    values.push(Math.round(value))
  }

  return values
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 1,
  }).format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

function AssumptionField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function AssumptionSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-11 w-full rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-ring/20",
        props.className,
      )}
    />
  )
}

function AssumptionTextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/20",
        props.className,
      )}
    />
  )
}

function SimulationList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AllocationCompare({
  label,
  before,
  after,
}: {
  label: string
  before: number
  after: number
}) {
  const delta = after - before
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-semibold text-foreground">
          {before}% -&gt; {after}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, after)}%` }} />
      </div>
      <p className={cn("mt-2 text-xs font-semibold", delta === 0 ? "text-muted-foreground" : delta > 0 ? "text-primary" : "text-amber-700")}>
        {delta === 0 ? "No change" : `${Math.abs(delta)}% ${delta > 0 ? "higher" : "lower"} after rebalance`}
      </p>
    </div>
  )
}

function ActionPlanCard({
  active,
  plan,
  scenarioTitle,
  onSelect,
}: {
  active: boolean
  plan: ScenarioActionPlan
  scenarioTitle: string
  onSelect: () => void
}) {
  const primaryTrade = plan.trades[0]

  return (
    <button
      className={cn(
        "rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/45 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
        active ? "border-primary shadow-panel" : "border-border",
      )}
      type="button"
      onClick={onSelect}
    >
      <p className="text-xs font-semibold uppercase text-muted-foreground">{scenarioTitle}</p>
      <h3 className="mt-2 text-base font-semibold text-foreground">{plan.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.calmingCopy}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md border border-border bg-muted/45 px-2 py-1 text-xs font-semibold text-foreground">
          {primaryTrade ? formatCurrency(primaryTrade.amountUsd) : "$0"} reviewed
        </span>
        <span className="rounded-md border border-border bg-muted/45 px-2 py-1 text-xs font-semibold text-foreground">
          {plan.transparency.confidence} confidence
        </span>
      </div>
    </button>
  )
}

function RecommendedMoveCard({ plan }: { plan: ScenarioActionPlan }) {
  const primaryTrade = plan.trades[0]
  const hasAction = Boolean(primaryTrade && primaryTrade.amountUsd > 0)

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary">Recommended move</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
            {hasAction ? primaryTrade.label : "No rebalance needed right now"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {primaryTrade?.because ??
              "Your current mix is close enough to the target for this scenario, so the clearest action is to review your plan and avoid unnecessary trades."}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-border bg-card p-4 lg:min-w-64">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Practice amount</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-primary">
            {formatCurrency(primaryTrade?.amountUsd ?? 0)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{primaryTrade?.from ?? "Current mix"}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{primaryTrade?.to ?? "Review only"}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
          {plan.transparency.confidence} confidence
        </span>
        <span className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
          Review required before practice rebalance
        </span>
      </div>
    </div>
  )
}

function ReviewPlanPanel({
  onCancel,
  onConfirm,
  plan,
}: {
  onCancel: () => void
  onConfirm: () => void
  plan: ScenarioActionPlan
}) {
  const primaryTrade = plan.trades[0]
  const hasAction = Boolean(primaryTrade && primaryTrade.amountUsd > 0)

  return (
    <div className="mt-4 rounded-md border border-primary/30 bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-primary">Practice rebalance preview</p>
      <h4 className="mt-2 text-base font-semibold text-foreground">
        {hasAction ? "Here is what Clarity will simulate" : "No trade will be simulated"}
      </h4>
      <div className="mt-3 grid gap-3">
        <div className="rounded-md border border-border bg-muted/35 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Main action</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {hasAction
              ? `${formatCurrency(primaryTrade.amountUsd)} from ${primaryTrade.from} to ${primaryTrade.to}`
              : "Keep current portfolio mix and review only."}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {primaryTrade?.because ??
              "Your allocation is close enough to the target that an unnecessary trade could add complexity without improving the plan."}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/35 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Stocks</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {plan.before.stocks}% -&gt; {plan.after.stocks}%
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/35 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Mutual funds</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {plan.before.funds}% -&gt; {plan.after.funds}%
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/35 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Cash</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {plan.before.cash}% -&gt; {plan.after.cash}%
            </p>
          </div>
        </div>
        <div className="rounded-md border border-border bg-muted/35 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Before confirming</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
            <li>Estimated trading cost: {formatCurrency(plan.transparency.estimatedTradingCostUsd)} in this practice model.</li>
            <li>{plan.transparency.taxNote}</li>
            <li>This updates the practice portfolio only. No real trades are placed.</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" type="button" onClick={onConfirm}>
          Confirm practice rebalance
        </Button>
        <Button className="flex-1" type="button" variant="secondary" onClick={onCancel}>
          Go back
        </Button>
      </div>
    </div>
  )
}

type SuggestedTrade = {
  action: "sell" | "buy"
  symbol?: string
  shares?: number
  amountUsd: number
  label: string
}

function computeSuggestedTrades(
  snapshot: ReturnType<typeof import("@/lib/scenarioPortfolio").buildScenarioPortfolioSnapshot>,
  holdings: Holding[],
): SuggestedTrade[] {
  if (snapshot.totalValueUsd <= 0) return []

  const target = TARGET_ALLOCATION_BY_PROFILE[snapshot.profile]
  const total = snapshot.totalValueUsd
  const trades: SuggestedTrade[] = []

  const stocksDrift = snapshot.stocksPct - target.stocks
  const fundsDrift = snapshot.fundsPct - target.funds
  const cashDrift = snapshot.cashPct - target.cash

  if (stocksDrift > 5) {
    const excess = (stocksDrift / 100) * total
    const topStock = [...holdings]
      .filter((h) => h.category === "stock")
      .sort((a, b) => b.shares * b.lastPrice - a.shares * a.lastPrice)[0]
    if (topStock && topStock.lastPrice > 0) {
      const raw = excess / topStock.lastPrice
      const shares = Math.min(parseFloat(raw.toFixed(2)), topStock.shares)
      if (shares > 0.01) {
        trades.push({
          action: "sell",
          symbol: topStock.symbol,
          shares,
          amountUsd: shares * topStock.lastPrice,
          label: `Sell ~${shares.toFixed(2)} shares of ${topStock.symbol} (≈${formatCurrency(shares * topStock.lastPrice)}) — reduces stocks from ${snapshot.stocksPct}% toward your ${target.stocks}% target`,
        })
      }
    }
  } else if (stocksDrift < -5) {
    const deficit = Math.abs((stocksDrift / 100) * total)
    if (deficit > 50) {
      trades.push({
        action: "buy",
        amountUsd: deficit,
        label: `Add ≈${formatCurrency(deficit)} to stocks — moves you from ${snapshot.stocksPct}% toward your ${target.stocks}% target`,
      })
    }
  }

  if (fundsDrift > 5) {
    const excess = (fundsDrift / 100) * total
    const topFund = [...holdings]
      .filter((h) => h.category === "fund")
      .sort((a, b) => b.shares * b.lastPrice - a.shares * a.lastPrice)[0]
    if (topFund && topFund.lastPrice > 0) {
      const raw = excess / topFund.lastPrice
      const shares = Math.min(parseFloat(raw.toFixed(2)), topFund.shares)
      if (shares > 0.01) {
        trades.push({
          action: "sell",
          symbol: topFund.symbol,
          shares,
          amountUsd: shares * topFund.lastPrice,
          label: `Trim ~${shares.toFixed(2)} shares of ${topFund.symbol} (≈${formatCurrency(shares * topFund.lastPrice)}) — reduces funds from ${snapshot.fundsPct}% toward your ${target.funds}% target`,
        })
      }
    }
  } else if (fundsDrift < -5) {
    const deficit = Math.abs((fundsDrift / 100) * total)
    if (deficit > 50) {
      trades.push({
        action: "buy",
        amountUsd: deficit,
        label: `Add ≈${formatCurrency(deficit)} to mutual funds — moves you from ${snapshot.fundsPct}% toward your ${target.funds}% target`,
      })
    }
  }

  if (cashDrift > 8) {
    const excess = (cashDrift / 100) * total
    if (excess > 50) {
      trades.push({
        action: "buy",
        amountUsd: excess,
        label: `Deploy ≈${formatCurrency(excess)} of idle cash into your portfolio — reduces cash from ${snapshot.cashPct}% toward your ${target.cash}% target`,
      })
    }
  }

  return trades
}

function SuggestedTradesCard({
  snapshot,
  holdings,
  profile,
}: {
  snapshot: ReturnType<typeof import("@/lib/scenarioPortfolio").buildScenarioPortfolioSnapshot>
  holdings: Holding[]
  profile: InvestorProfile
}) {
  const trades = computeSuggestedTrades(snapshot, holdings)
  const target = TARGET_ALLOCATION_BY_PROFILE[profile]

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowLeftRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          Suggested rebalancing trades
        </CardTitle>
        <CardDescription>
          Specific actions to bring your portfolio in line with your {profile} target ({target.stocks}% stocks / {target.funds}% funds / {target.cash}% cash).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {trades.length === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            Your portfolio is close to its target allocation — no significant rebalancing trades needed right now.
          </p>
        ) : (
          trades.map((trade) => (
            <div
              key={trade.label}
              className="flex items-start gap-3 rounded-md border border-border bg-card p-4"
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide",
                  trade.action === "sell"
                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
                )}
              >
                {trade.action}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-6 text-foreground">{trade.label}</p>
              </div>
            </div>
          ))
        )}
        {snapshot.totalValueUsd <= 0 && (
          <p className="text-sm text-muted-foreground">
            Add holdings and cash to your portfolio so Clarity can generate specific trade amounts.
          </p>
        )}
        <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
          Approximate figures based on your saved profile targets. Not investment advice — consult a financial advisor before making real trades.
        </p>
      </CardContent>
    </Card>
  )
}

export function ScenariosPage() {
  const whatIfRef = useRef<HTMLDivElement>(null)
  const { holdings, cashBalance, monthlyContribution, profile, timeline, goal, updateProfileSettings, buyStock, sellStock, addPracticeCash, loadSamplePortfolio } =
    usePortfolioStore()
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>("market_drop_20")
  const [reviewedScenarioId, setReviewedScenarioId] = useState<ScenarioId | null>(null)
<<<<<<< HEAD
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false)
=======
  const [compareScenarioId, setCompareScenarioId] = useState<ScenarioId>("inflation_high")
  const [showAdvanced, setShowAdvanced] = useState(false)
>>>>>>> 0fa2481 (rubric gap)
  const [practiceMessage, setPracticeMessage] = useState("")
  const [scenarioPrompt, setScenarioPrompt] = useState("")
  const [simulation, setSimulation] = useState<ScenarioSimulationAnswer | null>(null)
  const [simulationError, setSimulationError] = useState("")
  const [simulationLoading, setSimulationLoading] = useState(false)

  const snapshot = useMemo(
    () =>
      buildScenarioPortfolioSnapshot(holdings, cashBalance, profile, timeline, goal, monthlyContribution),
    [holdings, cashBalance, profile, timeline, goal, monthlyContribution],
  )
  const scenarioPlans = useMemo(
    () =>
      SCENARIO_DEFINITIONS.map((definition) => ({
        definition,
        suggestion: suggestRebalancingStrategy(definition.id, snapshot),
        plan: buildScenarioActionPlan(definition.id, snapshot),
      })),
    [snapshot],
  )
  const selectedScenario = scenarioPlans.find((item) => item.definition.id === selectedScenarioId) ?? scenarioPlans[0]
  const selectedPlan = selectedScenario.plan
  const compareCandidates = useMemo(
    () => SCENARIO_DEFINITIONS.filter((scenario) => scenario.id !== selectedScenarioId),
    [selectedScenarioId],
  )
  const effectiveCompareScenarioId =
    compareCandidates.some((scenario) => scenario.id === compareScenarioId)
      ? compareScenarioId
      : compareCandidates[0]?.id ?? selectedScenarioId
  const compareScenario =
    scenarioPlans.find((item) => item.definition.id === effectiveCompareScenarioId) ?? scenarioPlans[1] ?? scenarioPlans[0]
  const comparePlan = compareScenario.plan
  const canApplyPracticePlan = reviewedScenarioId === selectedScenarioId && selectedPlan.trades.length > 0

  const startingValue = getPortfolioValue(holdings, cashBalance)
  const years = timelineYears[timeline]
  const baselineReturn = annualReturnByProfile[profile]
  const optimizedReturn = baselineReturn + 0.012
  const scenarioReturn =
    simulation ? baselineReturn + simulation.estimatedReturnAdjustmentPp / 100 : null
  const annualContribution = monthlyContribution * 12
  const projection = useMemo(
    () => {
      const baselineValues = projectYearlyValues(
        startingValue,
        monthlyContribution,
        baselineReturn,
        years,
      )
      const optimizedValues = projectYearlyValues(
        startingValue,
        monthlyContribution,
        optimizedReturn,
        years,
      )
      const scenarioValues =
        scenarioReturn === null
          ? null
          : projectYearlyValues(startingValue, monthlyContribution, scenarioReturn, years)

      return baselineValues.map((baseline, index) => ({
        year: String(2026 + index),
        baseline,
        optimized: optimizedValues[index],
        aiScenario: scenarioValues?.[index],
      }))
    },
    [baselineReturn, monthlyContribution, optimizedReturn, scenarioReturn, startingValue, years],
  )
  const finalBaseline = projection[projection.length - 1].baseline
  const finalOptimized = projection[projection.length - 1].optimized
  const finalScenario = simulation ? projection[projection.length - 1].aiScenario ?? finalBaseline : null
  const summaryCards = [
    {
      title:
        monthlyContribution > 0
          ? `Add ${formatCurrency(monthlyContribution)} monthly`
          : "No monthly contribution",
      value: `+${formatCompactCurrency(finalOptimized - projectYearlyValues(startingValue, 0, optimizedReturn, years)[years])}`,
      copy:
        monthlyContribution > 0
          ? `${formatCurrency(annualContribution)} added per year from your profile setting`
          : "No profile contribution is added to the projection",
    },
    {
      title: `${profile} profile`,
      value: `${(baselineReturn * 100).toFixed(1)}%`,
      copy: "Annual return assumption used in this model",
    },
    {
      title: simulation ? "AI scenario delta" : `${timeline} timeline`,
      value: simulation
        ? formatCompactCurrency((finalScenario ?? finalBaseline) - finalBaseline)
        : `+${formatCompactCurrency(finalOptimized - finalBaseline)}`,
      copy: simulation
        ? "Estimated difference from your current modeled path"
        : "Estimated optimized upside for your saved settings",
    },
  ]

  const scrollToWhatIf = () => {
    whatIfRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function runSimulation() {
    const prompt = scenarioPrompt.trim()
    if (!prompt) {
      setSimulationError("Describe a scenario first.")
      return
    }

    setSimulationLoading(true)
    setSimulationError("")
    try {
      const result = await simulateScenario({
        scenario: prompt,
        portfolioSummary: scenarioSnapshotToApiPayload(snapshot),
      })
      setSimulation(result)
    } catch (error) {
      setSimulation(null)
      setSimulationError(
        error instanceof Error
          ? error.message
          : "Could not generate a simulation. Make sure the Clarity API and Ollama are running.",
      )
    } finally {
      setSimulationLoading(false)
    }
  }

  function sellHoldingsByValue(amountUsd: number, categories: Array<Holding["category"]>) {
    let remaining = amountUsd
    let soldUsd = 0
    const messages: string[] = []
    const sorted = [...usePortfolioStore.getState().holdings]
      .filter((holding) => categories.includes(holding.category))
      .sort((a, b) => getHoldingValue(b) - getHoldingValue(a))

    for (const holding of sorted) {
      if (remaining <= 1) break
      if (holding.lastPrice <= 0) continue

      const currentHolding = usePortfolioStore
        .getState()
        .holdings.find((item) => item.symbol === holding.symbol)
      if (!currentHolding) continue

      const currentValue = getHoldingValue(currentHolding)
      const saleValue = Math.min(currentValue, remaining)
      const shares = Math.min(currentHolding.shares, Math.floor((saleValue / currentHolding.lastPrice) * 10000) / 10000)
      if (shares <= 0.0001) continue

      const result = sellStock({
        symbol: currentHolding.symbol,
        shares,
        price: currentHolding.lastPrice,
      })
      if (!result.ok) {
        messages.push(result.message)
        continue
      }

      const actualSaleValue = shares * currentHolding.lastPrice
      soldUsd += actualSaleValue
      remaining -= actualSaleValue
      messages.push(`Sold ${shares.toFixed(2)} shares of ${currentHolding.symbol}.`)
    }

    return { soldUsd, messages }
  }

  function buyPracticeFund(amountUsd: number) {
    const price = 252
    const availableCash = usePortfolioStore.getState().cashBalance
    const buyAmount = Math.min(Math.max(0, amountUsd), availableCash)
    if (buyAmount <= 1) {
      return { boughtUsd: 0, message: "Not enough practice cash to buy the fund slice." }
    }

    const shares = Math.floor((buyAmount / price) * 10000) / 10000
    const result = buyStock({
      symbol: "VTI",
      name: "Vanguard Total Stock Market ETF",
      shares,
      price,
      change: -0.4,
      category: "fund",
      risk: "Medium",
      expenseRatio: 0.03,
      diversification: "Thousands of U.S. companies in one fund",
      plainLanguageRisk: "Still moves with the stock market, but less tied to one company.",
      dataSource: "Curated beginner ETF profile; prices are demo values.",
    })

    return {
      boughtUsd: result.ok ? shares * price : 0,
      message: result.ok ? `Bought ${shares.toFixed(2)} shares of VTI.` : result.message,
    }
  }

  function applyPracticePlan() {
    if (!canApplyPracticePlan) return

    const trade = selectedPlan.trades[0]
    const amount = Math.max(0, trade.amountUsd)
    if (amount <= 0) {
      setPracticeMessage("Reviewed. No practice trade was needed because the portfolio is already close to this plan.")
      return
    }

    const actionMessages: string[] = []

    if (selectedScenarioId === "inflation_high") {
      const purchase = buyPracticeFund(amount)
      actionMessages.push(purchase.message)
    } else if (selectedScenarioId === "withdraw_20pct_next_year") {
      const sale = sellHoldingsByValue(amount, ["stock", "fund"])
      actionMessages.push(...sale.messages)
      actionMessages.push(`${formatCurrency(sale.soldUsd)} moved into practice cash for the withdrawal scenario.`)
    } else {
      const starting = usePortfolioStore.getState()
      const sale = sellHoldingsByValue(amount, ["stock"])
      actionMessages.push(...sale.messages)

      const cashTargetIncrease = Math.max(
        0,
        Math.round(starting.cashBalance + getPortfolioValue(starting.holdings, starting.cashBalance) * ((selectedPlan.after.cash - selectedPlan.before.cash) / 100)),
      )
      const cashToKeep = Math.min(sale.soldUsd, Math.max(0, cashTargetIncrease - starting.cashBalance))
      const fundToBuy = Math.max(0, sale.soldUsd - cashToKeep)

      if (fundToBuy > 1) {
        const purchase = buyPracticeFund(fundToBuy)
        actionMessages.push(purchase.message)
      }
      if (cashToKeep > 1) {
        actionMessages.push(`${formatCurrency(cashToKeep)} stayed in practice cash as a buffer.`)
      }
    }

    setPracticeMessage(
      `Practice rebalance applied through the same buy/sell engine as the Stocks tab. ${actionMessages.filter(Boolean).join(" ")}`,
    )
    setReviewedScenarioId(null)
  }

  return (
    <div className="space-y-8">
      {holdings.length === 0 && cashBalance <= 0 ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Start in 60 seconds</CardTitle>
            <CardDescription>
              Add quick practice data first so every scenario shows concrete amounts, costs, and trade steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-2 text-sm text-foreground">
              <li>1. Add practice cash (so rebalances can be sized).</li>
              <li>2. Add sample holdings (so risk and concentration can be measured).</li>
              <li>3. Run two scenarios and compare before/after mixes.</li>
            </ol>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const result = addPracticeCash(10000)
                  setPracticeMessage(result.message)
                }}
              >
                Add $10,000 practice cash
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const result = loadSamplePortfolio()
                  setPracticeMessage(result.message)
                }}
              >
                Load sample beginner portfolio
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Scenario lab
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-foreground">Model decisions before you make them.</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Describe any market or life event. Clarity AI turns it into a portfolio simulation using your saved plan.
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant={showAdvanced ? "secondary" : "default"} onClick={() => setShowAdvanced(false)}>
            Beginner view
          </Button>
          <Button type="button" variant={showAdvanced ? "default" : "secondary"} onClick={() => setShowAdvanced(true)}>
            Advanced view
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
            Your plan assumptions
          </CardTitle>
          <CardDescription>
            Adjust these to see the projection and AI simulations update against your current portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <AssumptionField label="Investor profile">
            <AssumptionSelect
              value={profile}
              onChange={(event) =>
                updateProfileSettings({
                  profile: event.target.value as InvestorProfile,
                  timeline,
                  monthlyContribution,
                })
              }
            >
              <option value="Conservative">Conservative</option>
              <option value="Balanced">Balanced</option>
              <option value="Growth">Growth</option>
              <option value="Aggressive">Aggressive</option>
            </AssumptionSelect>
          </AssumptionField>
          <AssumptionField label="Timeline">
            <AssumptionSelect
              value={timeline}
              onChange={(event) =>
                updateProfileSettings({
                  profile,
                  timeline: event.target.value as InvestmentTimeline,
                  monthlyContribution,
                })
              }
            >
              <option value="1-3 years">1-3 years</option>
              <option value="3-5 years">3-5 years</option>
              <option value="5-10 years">5-10 years</option>
              <option value="10+ years">10+ years</option>
            </AssumptionSelect>
          </AssumptionField>
          <AssumptionField label="Monthly contribution">
            <AssumptionTextInput
              inputMode="numeric"
              value={monthlyContribution === 0 ? "" : String(monthlyContribution)}
              onChange={(event) =>
                updateProfileSettings({
                  profile,
                  timeline,
                  monthlyContribution: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
          </AssumptionField>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal text-foreground">Scenario-driven rebalance</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Pick a common beginner stress moment. Clarity uses deterministic rules first, then optional AI for extra explanation.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {scenarioPlans.map(({ definition, plan }) => (
            <ActionPlanCard
              key={definition.id}
              active={definition.id === selectedScenarioId}
              plan={plan}
              scenarioTitle={definition.title}
              onSelect={() => {
                setSelectedScenarioId(definition.id)
                setPracticeMessage("")
                setReviewPanelOpen(false)
                setReviewedScenarioId(null)
              }}
            />
          ))}
        </div>

        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{selectedPlan.title}</CardTitle>
                <CardDescription className="mt-2">{selectedScenario.definition.description}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
                  {selectedPlan.transparency.confidence} confidence
                </span>
                <span className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
                  Data: saved portfolio + curated fund profiles
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-5">
              <RecommendedMoveCard plan={selectedPlan} />

              <div className="grid gap-3 sm:grid-cols-3">
                <AllocationCompare label="Stocks" before={selectedPlan.before.stocks} after={selectedPlan.after.stocks} />
                <AllocationCompare label="Mutual funds" before={selectedPlan.before.funds} after={selectedPlan.after.funds} />
                <AllocationCompare label="Cash" before={selectedPlan.before.cash} after={selectedPlan.after.cash} />
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Why this is recommended</p>
                <p className="mt-3 text-sm leading-6 text-foreground">{selectedScenario.suggestion.rationale}</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {selectedScenario.suggestion.bullets.slice(1, 4).map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Radical transparency</p>
                <div className="mt-3 grid gap-3">
                  <div className="rounded-md bg-muted/45 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Estimated trading cost</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatCurrency(selectedPlan.transparency.estimatedTradingCostUsd)} in this practice model
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/45 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Estimated tax impact (if taxable)</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatCurrency(selectedPlan.transparency.estimatedTaxImpactUsd)} estimated
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/45 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Fund fee note</p>
                    <p className="mt-1 text-sm leading-6 text-foreground">{selectedPlan.transparency.fundFeeNote}</p>
                  </div>
                  <div className="rounded-md bg-muted/45 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Tax awareness</p>
                    <p className="mt-1 text-sm leading-6 text-foreground">{selectedPlan.transparency.taxNote}</p>
                  </div>
                  <div className="rounded-md bg-muted/45 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Assumption note</p>
                    <p className="mt-1 text-sm leading-6 text-foreground">{selectedPlan.transparency.accountAssumptionNote}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">What could go wrong?</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {selectedPlan.transparency.whatCouldGoWrong.map((risk) => (
                    <li key={risk} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Confidence scale</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  High means this scenario strongly matches your saved plan and has fewer uncertain assumptions.
                  Medium means useful guidance with moderate uncertainty. Low means the model has limited inputs.
                </p>
              </div>

              <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase text-primary">Review before practice rebalance</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                  {selectedPlan.reviewChecklist.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    type="button"
                    variant={reviewedScenarioId === selectedScenarioId ? "secondary" : "default"}
                    onClick={() => {
                      setReviewedScenarioId(selectedScenarioId)
                      setReviewPanelOpen(true)
                      setPracticeMessage("")
                    }}
                  >
                    {reviewedScenarioId === selectedScenarioId ? "Plan reviewed" : "Review plan"}
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!canApplyPracticePlan}
                    type="button"
                    onClick={() => setReviewPanelOpen(true)}
                  >
                    Execute practice rebalance
                  </Button>
                </div>
                {reviewPanelOpen ? (
                  <ReviewPlanPanel
                    plan={selectedPlan}
                    onCancel={() => setReviewPanelOpen(false)}
                    onConfirm={() => {
                      applyPracticePlan()
                      setReviewPanelOpen(false)
                    }}
                  />
                ) : null}
                {practiceMessage ? (
                  <p
                    aria-live="polite"
                    className="mt-3 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground"
                    role="status"
                  >
                    {practiceMessage}
                  </p>
                ) : null}
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Educational simulation only. This is not investment, tax, or legal advice, and it does not place real trades.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {showAdvanced ? (
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calculation breakdown</CardTitle>
              <CardDescription>Exactly how this scenario recommendation was computed.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Inputs</p>
                <ul className="mt-2 space-y-2 text-sm text-foreground">
                  {selectedPlan.calculation.inputs.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Formulas</p>
                <ul className="mt-2 space-y-2 text-sm text-foreground">
                  {selectedPlan.calculation.formulas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Output</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{selectedPlan.calculation.output}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scenario comparison</CardTitle>
              <CardDescription>Compare two scenario plans side by side before choosing a practice rebalance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Compare against</span>
                <select
                  className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-ring/20"
                  value={effectiveCompareScenarioId}
                  onChange={(event) => setCompareScenarioId(event.target.value as ScenarioId)}
                >
                  {compareCandidates.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  { label: "Primary", title: selectedScenario.definition.title, plan: selectedPlan },
                  { label: "Comparison", title: compareScenario.definition.title, plan: comparePlan },
                ].map((panel) => (
                  <div key={panel.label} className="rounded-md border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{panel.label}</p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">{panel.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      After mix: {panel.plan.after.stocks}% stocks / {panel.plan.after.funds}% funds / {panel.plan.after.cash}% cash
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cost: {formatCurrency(panel.plan.transparency.estimatedTradingCostUsd)} · Tax: {formatCurrency(panel.plan.transparency.estimatedTaxImpactUsd)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">Confidence: {panel.plan.transparency.confidence}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Projected paths</CardTitle>
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            {chartSeries
              .filter((series) => series.key !== "aiScenario" || simulation)
              .map((series) => (
                <div
                  key={series.key}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/55 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  {series.label}
                </div>
              ))}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="optimized" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="baseline" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aiScenario" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#b45309" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis axisLine={false} dataKey="year" tick={{ fill: "#6d7d99", fontSize: 12, fontWeight: 700 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: "#6d7d99", fontSize: 12, fontWeight: 700 }} tickFormatter={(value) => `$${Number(value) / 1000}k`} tickLine={false} width={42} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value, name) => [
                    `$${Number(value).toLocaleString()}`,
                    name === "optimized"
                      ? "Optimized path"
                      : name === "aiScenario"
                        ? "AI scenario"
                        : "Current path",
                  ]}
                />
                <Area dataKey="baseline" fill="url(#baseline)" stroke="#2563eb" strokeWidth={2} type="monotone" />
                <Area dataKey="optimized" fill="url(#optimized)" stroke="#0f766e" strokeWidth={2} type="monotone" />
                {simulation ? (
                  <Area dataKey="aiScenario" fill="url(#aiScenario)" stroke="#b45309" strokeWidth={2} type="monotone" />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {summaryCards.map((scenario) => (
          <Card key={scenario.title} className="transition-transform hover:-translate-y-0.5">
            <CardContent className="flex items-center justify-between gap-5 p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">{scenario.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{scenario.copy}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-primary">{scenario.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div ref={whatIfRef} className="scroll-mt-8 space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">AI market simulation</h2>
          <p className="text-sm text-muted-foreground">
            Type your own scenario. Clarity AI translates it into assumptions, projected impact, and next steps.
          </p>
        </div>

        <Card className="border-accent/25">
          <CardContent className="space-y-4 p-5">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Scenario</span>
              <textarea
                className="min-h-28 w-full resize-y rounded-md border border-input bg-card px-3 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/20"
                placeholder="Example: What if the market drops 20%, rent goes up, and I need cash in 18 months?"
                value={scenarioPrompt}
                onChange={(event) => {
                  setScenarioPrompt(event.target.value)
                  setSimulationError("")
                }}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-md border border-border bg-muted/45 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                  type="button"
                  onClick={() => {
                    setScenarioPrompt(prompt)
                    setSimulationError("")
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {simulationError ? (
              <p
                aria-live="assertive"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
                role="alert"
              >
                {simulationError}
              </p>
            ) : null}

            <Button type="button" onClick={runSimulation} disabled={simulationLoading}>
              {simulationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              Generate AI simulation
            </Button>
          </CardContent>
        </Card>

        {simulation ? (
          <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BrainCircuit className="h-5 w-5 text-accent" aria-hidden="true" />
                    {simulation.title}
                  </CardTitle>
                  <CardDescription className="mt-2">{simulation.summary}</CardDescription>
                </div>
                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border text-center sm:min-w-[320px]">
                  <div className="bg-card p-3">
                    <p className="text-[0.65rem] font-semibold uppercase text-muted-foreground">Return shift</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatSignedPercent(simulation.estimatedReturnAdjustmentPp)}
                    </p>
                  </div>
                  <div className="bg-card p-3">
                    <p className="text-[0.65rem] font-semibold uppercase text-muted-foreground">Impact</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatSignedPercent(simulation.estimatedPortfolioImpactPct)}
                    </p>
                  </div>
                  <div className="bg-card p-3">
                    <p className="text-[0.65rem] font-semibold uppercase text-muted-foreground">Confidence</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{simulation.confidence}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <SimulationList title="Assumptions" items={simulation.assumptions} />
              <SimulationList title="Moves to review" items={simulation.recommendedMoves} />
              <SimulationList title="Risks" items={simulation.riskNotes} />
              <p className="text-xs leading-relaxed text-muted-foreground lg:col-span-3">
                Educational simulation only. This is not investment, tax, or legal advice, and it is not a prediction.
              </p>
            </CardContent>
          </Card>

          <SuggestedTradesCard snapshot={snapshot} holdings={holdings} profile={profile} />
          </>
        ) : null}
      </div>

      <Button className="w-full" size="lg" type="button" onClick={scrollToWhatIf}>
        Build an AI scenario
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
