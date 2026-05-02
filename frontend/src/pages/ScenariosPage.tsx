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

const projection = [
  { year: "2026", baseline: 11600, optimized: 11600 },
  { year: "2027", baseline: 14800, optimized: 16200 },
  { year: "2028", baseline: 18300, optimized: 21400 },
  { year: "2029", baseline: 22500, optimized: 27600 },
  { year: "2030", baseline: 27100, optimized: 34900 },
  { year: "2031", baseline: 32600, optimized: 43100 },
]

const scenarios = [
  { title: "Add $300 monthly", value: "+$18.6k", copy: "Expected lift over five years" },
  { title: "Trim high-risk names", value: "-12%", copy: "Estimated volatility reduction" },
  { title: "Shift cash into funds", value: "+1.4%", copy: "Projected annual return change" },
]

export function ScenariosPage() {
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
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
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
