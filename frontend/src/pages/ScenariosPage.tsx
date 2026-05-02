import { useMemo, useState, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowRight, Loader2, SlidersHorizontal, Sparkles, TrendingUp, UserRound } from "lucide-react"
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

type SelectableScenarioId = ScenarioId | "custom"

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
        "flex h-full flex-col rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/45 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
        active ? "border-primary shadow-panel" : "border-border",
      )}
      type="button"
      onClick={onSelect}
    >
      <p className="text-xs font-semibold uppercase text-muted-foreground">{scenarioTitle}</p>
      <h3 className="mt-2 text-base font-semibold text-foreground">{plan.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{plan.calmingCopy}</p>
      <div className="mt-3 flex flex-wrap gap-2">
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

function CustomScenarioCard({
  active,
  draft,
  error,
  loading,
  onDraftChange,
  onGenerate,
  onSelect,
  plan,
}: {
  active: boolean
  draft: string
  error: string
  loading: boolean
  onDraftChange: (value: string) => void
  onGenerate: () => void
  onSelect: () => void
  plan: ScenarioActionPlan | null
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border bg-card p-4 transition-colors",
        active ? "border-primary shadow-panel" : "border-border",
      )}
    >
      <button className="block w-full text-left" type="button" onClick={onSelect}>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Make your own scenario</p>
        <h3 className="mt-2 text-base font-semibold text-foreground">
          {plan ? plan.title : "Ask Clarity AI for a custom plan"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Describe a personal or market what-if. Clarity AI will turn it into a rebalance plan with the same review flow.
        </p>
      </button>
      <textarea
        className="mt-3 min-h-24 w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/20"
        placeholder="Example: What if I lose my job and tech stocks fall 15%?"
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onFocus={onSelect}
      />
      {error ? (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
      <Button className="mt-3 w-full" disabled={loading} type="button" onClick={onGenerate}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        Generate custom plan
      </Button>
      {plan ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-md border border-border bg-muted/45 px-2 py-1 text-xs font-semibold text-foreground">
            {formatCurrency(plan.trades[0]?.amountUsd ?? 0)} reviewed
          </span>
          <span className="rounded-md border border-border bg-muted/45 px-2 py-1 text-xs font-semibold text-foreground">
            {plan.transparency.confidence} confidence
          </span>
        </div>
      ) : null}
    </div>
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

function normalizeConfidence(value: string): "High" | "Medium" | "Low" {
  const normalized = value.trim().toLowerCase()
  if (normalized === "high") return "High"
  if (normalized === "medium") return "Medium"
  return "Low"
}

function buildCustomScenarioPlan({
  prompt,
  simulation,
  snapshot,
}: {
  prompt: string
  simulation: ScenarioSimulationAnswer
  snapshot: ReturnType<typeof import("@/lib/scenarioPortfolio").buildScenarioPortfolioSnapshot>
}): ScenarioActionPlan {
  const before = { stocks: snapshot.stocksPct, funds: snapshot.fundsPct, cash: snapshot.cashPct }
  const total = snapshot.totalValueUsd
  const target = TARGET_ALLOCATION_BY_PROFILE[snapshot.profile]
  const confidence = normalizeConfidence(simulation.confidence)
  const text = `${prompt} ${simulation.title} ${simulation.summary} ${simulation.recommendedMoves.join(" ")}`.toLowerCase()
  const firstMove = simulation.recommendedMoves[0] ?? simulation.summary
  const firstRisk = simulation.riskNotes[0] ?? "The situation may develop differently than the scenario describes."

  if (total <= 0) {
    return {
      title: simulation.title || "Custom scenario plan",
      calmingCopy: simulation.summary,
      before,
      after: before,
      trades: [
        {
          label: "Add holdings before rebalancing",
          amountUsd: 0,
          from: "No sale",
          to: "Review only",
          because: "Because this account has no portfolio value yet, Clarity can explain the scenario but cannot simulate a useful rebalance.",
        },
      ],
      transparency: {
        confidence,
        estimatedTradingCostUsd: 0,
        fundFeeNote: "Fund fees depend on what fund is selected after holdings are added.",
        taxNote: "No tax impact is estimated because no simulated sale is available yet.",
        whatCouldGoWrong: simulation.riskNotes.slice(0, 3),
      },
      reviewChecklist: simulation.assumptions.slice(0, 3),
    }
  }

  const needsCash =
    text.includes("withdraw") ||
    text.includes("cash") ||
    text.includes("job") ||
    text.includes("rent") ||
    text.includes("emergency") ||
    text.includes("next year")
  const inflationStress = text.includes("inflation") || text.includes("prices") || text.includes("rates")
  const marketStress =
    simulation.estimatedPortfolioImpactPct <= -8 ||
    text.includes("drop") ||
    text.includes("fall") ||
    text.includes("recession")

  if (needsCash) {
    const cashBoostPct = Math.min(20, Math.max(8, Math.round(Math.abs(simulation.estimatedPortfolioImpactPct) / 2)))
    const after = normalizeScenarioMix(before.stocks - cashBoostPct, before.funds, before.cash + cashBoostPct)
    return {
      title: simulation.title || "Custom cash-reserve plan",
      calmingCopy: simulation.summary,
      before,
      after,
      trades: [
        {
          label: "Build a cash cushion for this scenario",
          amountUsd: Math.round(total * (cashBoostPct / 100)),
          from: "Stocks and funds",
          to: "Cash",
          because: `Because your custom scenario may require spendable cash, Clarity AI recommends setting aside money before you are forced to sell during stress. ${firstMove}`,
        },
      ],
      transparency: {
        confidence,
        estimatedTradingCostUsd: 0,
        fundFeeNote: "Keeping more cash can reduce short-term market risk, but it may earn less than invested money.",
        taxNote: "Raising cash by selling investments may create taxable gains in a regular brokerage account. Confirm with a tax professional before making real trades.",
        whatCouldGoWrong: simulation.riskNotes.slice(0, 3),
      },
      reviewChecklist: [
        "Confirm how much cash you may need and when.",
        firstRisk,
        "Review the before/after allocation before applying the practice rebalance.",
      ],
    }
  }

  if (inflationStress) {
    const excessCashPct = Math.min(15, Math.max(0, before.cash - target.cash))
    const after = normalizeScenarioMix(before.stocks, before.funds + excessCashPct, before.cash - excessCashPct)
    return {
      title: simulation.title || "Custom inflation plan",
      calmingCopy: simulation.summary,
      before,
      after,
      trades: [
        {
          label: excessCashPct > 0 ? "Shift extra idle cash toward diversified funds" : "Review cash and fund fees",
          amountUsd: Math.round(total * (excessCashPct / 100)),
          from: excessCashPct > 0 ? "Cash" : "No sale",
          to: excessCashPct > 0 ? "Mutual funds" : "Review only",
          because:
            excessCashPct > 0
              ? `Because the custom scenario points to inflation pressure, Clarity AI recommends reviewing only cash above your target. ${firstMove}`
              : `Because your cash is not above target, Clarity AI recommends staying diversified and reviewing fees instead of forcing a trade. ${firstMove}`,
        },
      ],
      transparency: {
        confidence,
        estimatedTradingCostUsd: 0,
        fundFeeNote: "Broad beginner funds often charge a small yearly expense ratio; compare fees before any real purchase.",
        taxNote: "Moving cash into a fund usually has no sale tax event, but later selling that fund can create taxes in a regular brokerage account.",
        whatCouldGoWrong: simulation.riskNotes.slice(0, 3),
      },
      reviewChecklist: [
        "Keep near-term bill and emergency cash untouched.",
        firstRisk,
        "Review the selected fund's yearly fee.",
      ],
    }
  }

  if (marketStress && before.stocks > target.stocks) {
    const trimPct = Math.min(12, Math.max(5, before.stocks - target.stocks))
    const cashBoost = 3
    const after = normalizeScenarioMix(before.stocks - trimPct, before.funds + Math.max(0, trimPct - cashBoost), before.cash + Math.min(trimPct, cashBoost))
    return {
      title: simulation.title || "Custom market-stress plan",
      calmingCopy: simulation.summary,
      before,
      after,
      trades: [
        {
          label: "Trim above-plan stock exposure",
          amountUsd: Math.round(total * (trimPct / 100)),
          from: "Stocks",
          to: "Mutual funds and cash",
          because: `Because the custom scenario stresses the market and your stock slice is above target, Clarity AI recommends a modest trim rather than panic-selling. ${firstMove}`,
        },
      ],
      transparency: {
        confidence,
        estimatedTradingCostUsd: 0,
        fundFeeNote: "If money moves into a diversified ETF, the ongoing fund fee may be around 0.03%-0.10% per year for many broad index ETFs.",
        taxNote: "Selling investments in a regular brokerage account may create taxes if there are gains. Confirm with a tax professional before making real trades.",
        whatCouldGoWrong: simulation.riskNotes.slice(0, 3),
      },
      reviewChecklist: [
        "Confirm this scenario still matches your actual concern.",
        firstRisk,
        "Review the before/after allocation before applying the practice rebalance.",
      ],
    }
  }

  return {
    title: simulation.title || "Custom scenario review",
    calmingCopy: simulation.summary,
    before,
    after: before,
    trades: [
      {
        label: "No rebalance needed right now",
        amountUsd: 0,
        from: "Current mix",
        to: "Review only",
        because: `Because the AI scenario does not point to a clear allocation problem, the best move is to review the plan instead of forcing a trade. ${firstMove}`,
      },
    ],
    transparency: {
      confidence,
      estimatedTradingCostUsd: 0,
      fundFeeNote: "No new fund purchase is simulated in this custom plan.",
      taxNote: "No tax impact is estimated because no simulated sale is recommended.",
      whatCouldGoWrong: simulation.riskNotes.slice(0, 3),
    },
    reviewChecklist: [
      "Confirm the scenario is realistic enough to plan around.",
      firstRisk,
      "Re-run the scenario if your goal, timeline, or holdings change.",
    ],
  }
}

function normalizeScenarioMix(stocks: number, funds: number, cash: number) {
  const roundedStocks = Math.min(100, Math.max(0, Math.round(stocks)))
  const roundedFunds = Math.min(100, Math.max(0, Math.round(funds)))
  const roundedCash = Math.min(100, Math.max(0, Math.round(cash)))
  const total = roundedStocks + roundedFunds + roundedCash
  return {
    stocks: roundedStocks,
    funds: roundedFunds,
    cash: Math.min(100, Math.max(0, roundedCash + (100 - total))),
  }
}

export function ScenariosPage() {
  const { holdings, cashBalance, monthlyContribution, profile, timeline, goal, updateProfileSettings, buyStock, sellStock } =
    usePortfolioStore()
  const [selectedScenarioId, setSelectedScenarioId] = useState<SelectableScenarioId>("market_drop_20")
  const [reviewedScenarioId, setReviewedScenarioId] = useState<SelectableScenarioId | null>(null)
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false)
  const [practiceMessage, setPracticeMessage] = useState("")
  const [customScenarioDraft, setCustomScenarioDraft] = useState("")
  const [customScenarioError, setCustomScenarioError] = useState("")
  const [customScenarioLoading, setCustomScenarioLoading] = useState(false)
  const [customScenarioPlan, setCustomScenarioPlan] = useState<ScenarioActionPlan | null>(null)
  const [customScenarioSuggestion, setCustomScenarioSuggestion] = useState<{
    rationale: string
    bullets: string[]
  } | null>(null)
  const [customScenarioDescription, setCustomScenarioDescription] = useState("Describe a personal or market what-if to generate a tailored practice rebalance.")
  const [simulation, setSimulation] = useState<ScenarioSimulationAnswer | null>(null)

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
  const customPlaceholderPlan = useMemo<ScenarioActionPlan>(
    () => ({
      title: "Build a custom scenario plan",
      calmingCopy: "Type a what-if above and Clarity AI will create a practice rebalance with the same review flow as the preset scenarios.",
      before: { stocks: snapshot.stocksPct, funds: snapshot.fundsPct, cash: snapshot.cashPct },
      after: { stocks: snapshot.stocksPct, funds: snapshot.fundsPct, cash: snapshot.cashPct },
      trades: [
        {
          label: "Generate a custom plan first",
          amountUsd: 0,
          from: "Current mix",
          to: "Review only",
          because: "A custom scenario needs your prompt before Clarity can recommend a practice move.",
        },
      ],
      transparency: {
        confidence: "Low",
        estimatedTradingCostUsd: 0,
        fundFeeNote: "Fund fees will appear after a custom plan is generated.",
        taxNote: "Tax awareness will appear after a custom plan is generated.",
        whatCouldGoWrong: ["The custom scenario has not been generated yet."],
      },
      reviewChecklist: ["Describe a scenario.", "Generate the custom plan.", "Review the recommendation before applying it."],
    }),
    [snapshot],
  )
  const selectedScenario =
    selectedScenarioId === "custom"
      ? null
      : scenarioPlans.find((item) => item.definition.id === selectedScenarioId) ?? scenarioPlans[0]
  const selectedPlan =
    selectedScenarioId === "custom"
      ? customScenarioPlan ?? customPlaceholderPlan
      : selectedScenario?.plan ?? scenarioPlans[0].plan
  const selectedDescription =
    selectedScenarioId === "custom"
      ? customScenarioDescription
      : selectedScenario?.definition.description ?? scenarioPlans[0].definition.description
  const selectedSuggestion =
    selectedScenarioId === "custom"
      ? customScenarioSuggestion ?? {
          rationale: "Generate a custom scenario to see an AI-backed rebalancing rationale.",
          bullets: [
            "Type a what-if scenario.",
            "Clarity AI will identify assumptions, recommended moves, and risks.",
            "The result will use the same review and practice rebalance flow as preset scenarios.",
          ],
        }
      : selectedScenario?.suggestion ?? scenarioPlans[0].suggestion
  const canApplyPracticePlan =
    reviewedScenarioId === selectedScenarioId &&
    selectedPlan.trades.length > 0 &&
    (selectedScenarioId !== "custom" || customScenarioPlan !== null)

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

  async function generateCustomScenarioPlan() {
    const prompt = customScenarioDraft.trim()
    setSelectedScenarioId("custom")
    setReviewPanelOpen(false)
    setReviewedScenarioId(null)
    setPracticeMessage("")

    if (!prompt) {
      setCustomScenarioError("Describe a custom scenario first.")
      return
    }

    setCustomScenarioLoading(true)
    setCustomScenarioError("")
    try {
      const result = await simulateScenario({
        scenario: prompt,
        portfolioSummary: scenarioSnapshotToApiPayload(snapshot),
      })
      const plan = buildCustomScenarioPlan({ prompt, simulation: result, snapshot })

      setSimulation(result)
      setCustomScenarioPlan(plan)
      setCustomScenarioDescription(result.summary)
      setCustomScenarioSuggestion({
        rationale: result.summary,
        bullets: [
          `AI assumption: ${result.assumptions[0] ?? "The scenario may affect your portfolio mix."}`,
          ...result.recommendedMoves.slice(0, 3),
        ],
      })
    } catch (error) {
      setCustomScenarioPlan(null)
      setCustomScenarioSuggestion(null)
      setCustomScenarioError(
        error instanceof Error
          ? error.message
          : "Could not generate a custom plan. Make sure the Clarity API and Ollama are running.",
      )
    } finally {
      setCustomScenarioLoading(false)
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
      risk: "Low",
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

    if (selectedScenarioId === "custom") {
      if (trade.from === "Cash") {
        const purchase = buyPracticeFund(amount)
        actionMessages.push(purchase.message)
      } else if (trade.to === "Cash") {
        const sale = sellHoldingsByValue(amount, ["stock", "fund"])
        actionMessages.push(...sale.messages)
        actionMessages.push(`${formatCurrency(sale.soldUsd)} moved into practice cash for the custom scenario.`)
      } else if (trade.from.includes("Stocks")) {
        const sale = sellHoldingsByValue(amount, ["stock"])
        actionMessages.push(...sale.messages)
        const purchase = buyPracticeFund(sale.soldUsd)
        actionMessages.push(purchase.message)
      } else {
        actionMessages.push("Custom plan reviewed. No practice trade was needed for this scenario.")
      }
    } else if (selectedScenarioId === "inflation_high") {
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
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Scenario lab
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-foreground">Model decisions before you make them.</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Describe any market or life event. Clarity AI turns it into a portfolio simulation using your saved plan.
        </p>
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

        <div className="grid gap-3 lg:grid-cols-4">
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
          <CustomScenarioCard
            active={selectedScenarioId === "custom"}
            draft={customScenarioDraft}
            error={customScenarioError}
            loading={customScenarioLoading}
            plan={customScenarioPlan}
            onDraftChange={(value) => {
              setCustomScenarioDraft(value)
              setCustomScenarioError("")
            }}
            onGenerate={generateCustomScenarioPlan}
            onSelect={() => {
              setSelectedScenarioId("custom")
              setPracticeMessage("")
              setReviewPanelOpen(false)
              setReviewedScenarioId(null)
            }}
          />
        </div>

        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{selectedPlan.title}</CardTitle>
                <CardDescription className="mt-2">{selectedDescription}</CardDescription>
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
                <p className="mt-3 text-sm leading-6 text-foreground">{selectedSuggestion?.rationale}</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {selectedSuggestion?.bullets.slice(1, 4).map((bullet) => (
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
                    <p className="text-xs font-semibold text-muted-foreground">Fund fee note</p>
                    <p className="mt-1 text-sm leading-6 text-foreground">{selectedPlan.transparency.fundFeeNote}</p>
                  </div>
                  <div className="rounded-md bg-muted/45 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Tax awareness</p>
                    <p className="mt-1 text-sm leading-6 text-foreground">{selectedPlan.transparency.taxNote}</p>
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
                  <p className="mt-3 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground">
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

    </div>
  )
}
