import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowRight, SlidersHorizontal, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export function ScenariosPage() {
  const { holdings, cashBalance, monthlyContribution, profile, timeline } = usePortfolioStore()
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
  const scenarios = [
    {
      title:
        monthlyContribution > 0
          ? `Add ${formatCurrency(monthlyContribution)} monthly`
          : "No monthly contribution",
      value: `+${formatCompactCurrency(
        projectValue(startingValue, monthlyContribution, optimizedReturn, years) -
          projectValue(startingValue, 0, optimizedReturn, years),
      )}`,
      copy: `Uses the contribution saved on your profile`,
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

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-primary">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Scenario lab
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-white">Preview smarter moves.</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Model how contributions, cash drag, and risk adjustments could change the shape of your portfolio.
        </p>
      </section>

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
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-muted-foreground"
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
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis axisLine={false} dataKey="year" tick={{ fill: "#a3a3a3", fontSize: 12 }} tickLine={false} />
                <YAxis axisLine={false} tick={{ fill: "#a3a3a3", fontSize: 12 }} tickFormatter={(value) => `$${Number(value) / 1000}k`} tickLine={false} width={42} />
                <Tooltip
                  contentStyle={{
                    background: "#2f3436",
                    border: "1px solid #444444",
                    borderRadius: 8,
                    color: "#fff",
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
        {scenarios.map((scenario) => (
          <Card key={scenario.title} className="transition-colors hover:border-primary/30">
            <CardContent className="flex items-center justify-between gap-5 p-5">
              <div>
                <p className="text-sm font-semibold text-white">{scenario.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{scenario.copy}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-primary">{scenario.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="w-full" size="lg">
        Run custom scenario
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
