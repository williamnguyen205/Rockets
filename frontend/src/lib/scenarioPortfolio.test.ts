import { describe, expect, it } from "vitest"
import { buildScenarioActionPlan, buildScenarioPortfolioSnapshot } from "@/lib/scenarioPortfolio"
import type { Holding } from "@/store/portfolio"

function buildTestSnapshot(overrides?: { holdings?: Holding[]; cash?: number }) {
  const holdings: Holding[] = overrides?.holdings ?? [
    {
      symbol: "NVDA",
      name: "NVIDIA",
      shares: 20,
      averageCost: 700,
      lastPrice: 900,
      change: -2.4,
      risk: "High",
      category: "stock",
    },
    {
      symbol: "AAPL",
      name: "Apple",
      shares: 20,
      averageCost: 160,
      lastPrice: 190,
      change: -1.1,
      risk: "Medium",
      category: "stock",
    },
    {
      symbol: "VTI",
      name: "Vanguard Total Stock Market ETF",
      shares: 4,
      averageCost: 240,
      lastPrice: 255,
      change: -0.3,
      risk: "Low",
      category: "fund",
      expenseRatio: 0.03,
    },
  ]
  return buildScenarioPortfolioSnapshot(
    holdings,
    overrides?.cash ?? 600,
    "Balanced",
    "3-5 years",
    "Buying a home",
    300,
  )
}

describe("scenarioPortfolio transparency math", () => {
  it("produces non-zero trading cost and tax estimate when plan includes sells", () => {
    const snapshot = buildTestSnapshot()
    const plan = buildScenarioActionPlan("market_drop_20", snapshot)
    expect(plan.trades[0]?.amountUsd ?? 0).toBeGreaterThan(0)
    expect(plan.transparency.estimatedTradingCostUsd).toBeGreaterThan(0)
    expect(plan.transparency.estimatedTaxImpactUsd).toBeGreaterThan(0)
  })

  it("returns a detailed calculation breakdown for each plan", () => {
    const snapshot = buildTestSnapshot()
    const plan = buildScenarioActionPlan("rates_stay_high_2y", snapshot)
    expect(plan.calculation.inputs.length).toBeGreaterThan(0)
    expect(plan.calculation.formulas.length).toBeGreaterThan(0)
    expect(plan.calculation.output.length).toBeGreaterThan(0)
  })
})
