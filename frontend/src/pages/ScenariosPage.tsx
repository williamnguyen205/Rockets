import { useMemo, useRef, useState } from "react"
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
import { cn } from "@/lib/utils"
import { explainScenarioAdjustment, type ScenarioExplainAnswer } from "@/lib/api"
import {
  buildScenarioPortfolioSnapshot,
  formatSuggestedTradeForApi,
  SCENARIO_DEFINITIONS,
  scenarioSnapshotToApiPayload,
  suggestRebalancingStrategy,
  type ScenarioId,
} from "@/lib/scenarioPortfolio"
import {
  getPortfolioValue,
  type InvestmentTimeline,
  type InvestorProfile,
  usePortfolioStore,
} from "@/store/portfolio"

const chartSeries = [
  { key: "baseline", label: "Current path", color: "#4682b4" },
  { key: "optimized", label: "Optimized path", color: "#34a85a" },
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

function projectValue(startingValue: number, monthlyContribution: number, annualReturn: number, years: number) {
  let value = startingValue
  const monthlyReturn = annualReturn / 12

  for (let month = 0; month < years * 12; month += 1) {
    value = value * (1 + monthlyReturn) + monthlyContribution
  }

  return Math.round(value)
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
  children: React.ReactNode
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
        "h-11 w-full rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30",
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
        "h-11 w-full rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30",
        props.className,
      )}
    />
  )
}

function TutorSection({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{body}</p>
    </div>
  )
}

export function ScenariosPage() {
  const whatIfRef = useRef<HTMLDivElement>(null)
  const { holdings, cashBalance, monthlyContribution, profile, timeline, goal, updateProfileSettings } =
    usePortfolioStore()
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | null>(null)
  const [tutorResult, setTutorResult] = useState<ScenarioExplainAnswer | null>(null)
  const [tutorError, setTutorError] = useState<string | null>(null)
  const [tutorLoading, setTutorLoading] = useState(false)

  const snapshot = useMemo(
    () =>
      buildScenarioPortfolioSnapshot(holdings, cashBalance, profile, timeline, goal, monthlyContribution),
    [holdings, cashBalance, profile, timeline, goal, monthlyContribution],
  )

  const selectedDefinition = selectedScenarioId
    ? SCENARIO_DEFINITIONS.find((s) => s.id === selectedScenarioId)
    : undefined

  const suggestion = useMemo(() => {
    if (!selectedScenarioId) return null
    return suggestRebalancingStrategy(selectedScenarioId, snapshot)
  }, [selectedScenarioId, snapshot])

  const startingValue = getPortfolioValue(holdings, cashBalance)
  const years = timelineYears[timeline]
  const baselineReturn = annualReturnByProfile[profile]
  const optimizedReturn = baselineReturn + 0.012
  const projection = useMemo(
    () =>
      Array.from({ length: years + 1 }, (_, index) => ({
        year: String(2026 + index),
        baseline:
          index === 0
            ? Math.round(startingValue)
            : projectValue(startingValue, 0, baselineReturn, index),
        optimized:
          index === 0
            ? Math.round(startingValue)
            : projectValue(startingValue, monthlyContribution, optimizedReturn, index),
      })),
    [baselineReturn, monthlyContribution, optimizedReturn, startingValue, years],
  )
  const finalBaseline = projection[projection.length - 1].baseline
  const finalOptimized = projection[projection.length - 1].optimized
  const summaryCards = [
    {
      title:
        monthlyContribution > 0
          ? `Add ${formatCurrency(monthlyContribution)} monthly`
          : "No monthly contribution",
      value: `+${formatCompactCurrency(
        projectValue(startingValue, monthlyContribution, optimizedReturn, years) -
          projectValue(startingValue, 0, optimizedReturn, years),
      )}`,
      copy: "Uses the contribution and settings above",
    },
    {
      title: `${profile} profile`,
      value: `${(baselineReturn * 100).toFixed(1)}%`,
      copy: "Annual return assumption used in this model",
    },
    {
      title: `${timeline} timeline`,
      value: `+${formatCompactCurrency(finalOptimized - finalBaseline)}`,
      copy: "Estimated optimized upside for your saved settings",
    },
  ]

  const scrollToWhatIf = () => {
    whatIfRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const selectScenario = (id: ScenarioId) => {
    setSelectedScenarioId(id)
    setTutorResult(null)
    setTutorError(null)
  }

  const runTutor = async () => {
    if (!selectedScenarioId || !selectedDefinition || !suggestion) return
    setTutorLoading(true)
    setTutorError(null)
    setTutorResult(null)
    try {
      const result = await explainScenarioAdjustment({
        scenarioId: selectedScenarioId,
        scenarioTitle: selectedDefinition.title,
        portfolioSummary: scenarioSnapshotToApiPayload(snapshot),
        suggestedTrade: formatSuggestedTradeForApi(suggestion),
      })
      setTutorResult(result)
    } catch (e) {
      setTutorError(e instanceof Error ? e.message : "Could not reach the tutor.")
    } finally {
      setTutorLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Scenario lab
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-foreground">Preview smarter moves.</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Model how contributions, cash drag, and risk adjustments could change the shape of your portfolio.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
            Your plan assumptions
          </CardTitle>
          <CardDescription>
            Adjust these to see the projection and what-if ideas update in real time. They also match your dashboard
            health score.
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
          <CardTitle>Five-year projection</CardTitle>
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            {chartSeries.map((series) => (
              <div
                key={series.key}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/55 px-3 py-1.5 text-xs font-medium text-muted-foreground"
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
                    <stop offset="5%" stopColor="#34a85a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34a85a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="baseline" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#4682b4" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#4682b4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(8,13,33,0.1)" vertical={false} />
                <XAxis axisLine={false} dataKey="year" tick={{ fill: "#6d7d99", fontSize: 12, fontWeight: 800 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: "#6d7d99", fontSize: 12, fontWeight: 800 }} tickFormatter={(value) => `$${Number(value) / 1000}k`} tickLine={false} width={42} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "2px solid #080d21",
                    borderRadius: 16,
                    color: "#080d21",
                  }}
                  formatter={(value, name) => [
                    `$${Number(value).toLocaleString()}`,
                    name === "optimized" ? "Optimized path" : "Current path",
                  ]}
                />
                <Area dataKey="baseline" fill="url(#baseline)" stroke="#4682b4" strokeWidth={2} type="monotone" />
                <Area dataKey="optimized" fill="url(#optimized)" stroke="#34a85a" strokeWidth={2} type="monotone" />
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
          <h2 className="text-xl font-semibold text-foreground">What-if rebalancing</h2>
          <p className="text-sm text-muted-foreground">
            Pick a real-life worry. Clarity suggests a simple plan you could discuss with a professional—then the tutor explains it in plain English.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {SCENARIO_DEFINITIONS.map((def) => {
            const active = selectedScenarioId === def.id
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => selectScenario(def.id)}
                className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <p className="text-sm font-semibold leading-snug text-foreground">{def.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{def.description}</p>
              </button>
            )
          })}
        </div>

        {selectedScenarioId && suggestion && selectedDefinition ? (
          <Card className="border-primary/25">
            <CardHeader>
              <CardTitle className="text-lg">Recommended plan</CardTitle>
              <p className="text-sm text-muted-foreground">
                Based on your saved goal ({goal}), timeline ({timeline}), and today&apos;s mix—not a prediction of the future.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
                {suggestion.bullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">How we decided: </span>
                {suggestion.rationale}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button type="button" onClick={runTutor} disabled={tutorLoading} className="gap-2">
                  {tutorLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  )}
                  Explain with Clarity Tutor
                </Button>
                <p className="text-xs text-muted-foreground">Requires the Clarity API and Ollama running locally.</p>
              </div>
              {tutorError ? (
                <p className="text-sm text-destructive" role="alert">
                  {tutorError}
                </p>
              ) : null}
              {tutorResult ? (
                <div className="space-y-3 pt-2">
                  <TutorSection title="The why" body={tutorResult.theWhy} />
                  <TutorSection title="The risk" body={tutorResult.theRisk} />
                  <TutorSection title="The move" body={tutorResult.theMove} />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Educational only—not tax, legal, or personal investment advice. Talk to a qualified professional before you trade.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Button className="w-full" size="lg" type="button" onClick={scrollToWhatIf}>
        Try a what-if scenario
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
