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
import { ArrowRight, BrainCircuit, Loader2, SlidersHorizontal, Sparkles, TrendingUp, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { simulateScenario, type ScenarioSimulationAnswer } from "@/lib/api"
import {
  buildScenarioPortfolioSnapshot,
  scenarioSnapshotToApiPayload,
} from "@/lib/scenarioPortfolio"
import { cn } from "@/lib/utils"
import {
  getPortfolioValue,
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

export function ScenariosPage() {
  const whatIfRef = useRef<HTMLDivElement>(null)
  const { holdings, cashBalance, monthlyContribution, profile, timeline, goal, updateProfileSettings } =
    usePortfolioStore()
  const [scenarioPrompt, setScenarioPrompt] = useState("")
  const [simulation, setSimulation] = useState<ScenarioSimulationAnswer | null>(null)
  const [simulationError, setSimulationError] = useState("")
  const [simulationLoading, setSimulationLoading] = useState(false)

  const snapshot = useMemo(
    () =>
      buildScenarioPortfolioSnapshot(holdings, cashBalance, profile, timeline, goal, monthlyContribution),
    [holdings, cashBalance, profile, timeline, goal, monthlyContribution],
  )

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
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive" role="alert">
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
        ) : null}
      </div>

      <Button className="w-full" size="lg" type="button" onClick={scrollToWhatIf}>
        Build an AI scenario
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
