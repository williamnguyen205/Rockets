import {
  getHoldingValue,
  getPortfolioValue,
  type Holding,
  type InvestmentTimeline,
  type InvestorProfile,
} from "@/store/portfolio"

export type ScenarioId = "market_drop_20" | "inflation_high" | "withdraw_20pct_next_year"

export type ScenarioDefinition = {
  id: ScenarioId
  title: string
  description: string
}

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: "market_drop_20",
    title: "What if the market drops about 20%?",
    description: "Stress-test your plan when prices fall sharply—without panic moves.",
  },
  {
    id: "inflation_high",
    title: "What if inflation stays high for a while?",
    description: "See how rising prices might affect cash versus invested money.",
  },
  {
    id: "withdraw_20pct_next_year",
    title: "What if I need to withdraw about 20% of my portfolio next year?",
    description: "Build a simple path to cash you can use when you need it.",
  },
]

export type TopHoldingSummary = {
  symbol: string
  name: string
  pctRounded: number
}

export type ScenarioPortfolioSnapshot = {
  totalValueUsd: number
  cashPct: number
  stocksPct: number
  fundsPct: number
  profile: InvestorProfile
  timeline: InvestmentTimeline
  goal: string
  monthlyContribution: number
  topHoldings: TopHoldingSummary[]
}

export function buildScenarioPortfolioSnapshot(
  holdings: Holding[],
  cashBalance: number,
  profile: InvestorProfile,
  timeline: InvestmentTimeline,
  goal: string,
  monthlyContribution: number,
): ScenarioPortfolioSnapshot {
  const total = getPortfolioValue(holdings, cashBalance)
  const stocksValue = holdings
    .filter((h) => h.category === "stock")
    .reduce((sum, h) => sum + getHoldingValue(h), 0)
  const fundsValue = holdings
    .filter((h) => h.category === "fund")
    .reduce((sum, h) => sum + getHoldingValue(h), 0)

  const pct = (part: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

  const topHoldings = [...holdings]
    .map((h) => ({
      symbol: h.symbol,
      name: h.name,
      pctRounded: pct(getHoldingValue(h)),
    }))
    .sort((a, b) => b.pctRounded - a.pctRounded)
    .slice(0, 4)

  return {
    totalValueUsd: total,
    cashPct: pct(cashBalance),
    stocksPct: pct(stocksValue),
    fundsPct: pct(fundsValue),
    profile,
    timeline,
    goal,
    monthlyContribution,
    topHoldings,
  }
}

export type RebalancingSuggestion = {
  bullets: string[]
  rationale: string
}

function isShortHorizon(timeline: InvestmentTimeline) {
  return timeline === "1-3 years" || timeline === "3-5 years"
}

export function suggestRebalancingStrategy(
  scenarioId: ScenarioId,
  s: ScenarioPortfolioSnapshot,
): RebalancingSuggestion {
  if (s.totalValueUsd <= 0) {
    return {
      bullets: [
        "Add your holdings and cash in the app so Clarity can tailor steps to your real numbers.",
        "Until then, keep learning and avoid all-or-nothing moves—small, steady habits matter most.",
      ],
      rationale: "There isn’t a portfolio total to analyze yet, so this is general guidance only.",
    }
  }

  const { stocksPct, fundsPct, cashPct, profile, timeline, topHoldings } = s
  const shortHorizon = isShortHorizon(timeline)
  const stockHeavy = stocksPct >= 42
  const cashHeavy = cashPct >= 28
  const fundHeavy = fundsPct >= 35

  if (scenarioId === "market_drop_20") {
    const bullets: string[] = []
    if (shortHorizon && stockHeavy) {
      bullets.push(
        "Take a breath before changing anything large—big drops feel scary, but rushing to sell everything often locks in losses.",
        "Consider gradually moving a modest slice of stock money into your steadier mutual fund slice so your near-term needs feel less tied to daily price swings.",
        "Keep enough cash on hand for upcoming expenses so you are not forced to sell at a bad time.",
      )
    } else if (!shortHorizon && stockHeavy) {
      bullets.push(
        "With more years ahead, many people stay mostly invested through a 20% dip and rely on time for recovery—check that your mix still matches how much drama you can stomach.",
        "If one stock is a huge slice of your total, think about spreading that risk across more holdings over time (without trying to time the exact bottom).",
        "Keep an emergency cushion in cash so a market dip does not turn into a personal cash crunch.",
      )
    } else {
      bullets.push(
        "Your mix already leans steadier—focus on not making sudden, all-or-nothing moves.",
        "Re-read your timeline: if you still have years, small, steady contributions often matter more than reacting to one bad month.",
        "If prices fall, use it as a reminder to check fees and whether you are diversified—not as a panic button.",
      )
    }
    if (profile === "Aggressive" && shortHorizon) {
      bullets.push(
        "Your profile is on the bolder side but your timeline is short—this scenario is a nudge to make sure that still feels right to you.",
      )
    }
    return {
      bullets,
      rationale:
        shortHorizon && stockHeavy
          ? "Closer to when you may need the money, we favor dialing back how much rides on volatile stocks after a big drop."
          : "We looked at how much of your money is in stocks versus steadier funds and cash, plus how long you said you can wait.",
    }
  }

  if (scenarioId === "inflation_high") {
    const bullets: string[] = []
    if (cashHeavy) {
      bullets.push(
        "Cash feels safe, but when prices keep rising, a large cash pile can slowly lose buying power—consider whether some of it belongs in a diversified fund mix for longer-term goals.",
        "Keep enough cash for near-term bills; only rethink the extra that sits idle for years.",
      )
    } else {
      bullets.push(
        "Staying invested in a broad mix can help money keep working when everyday prices climb—but nothing is guaranteed year to year.",
      )
    }
    bullets.push(
      "Funds that hold many companies or bonds can spread risk better than betting on one or two names.",
      "Inflation is a good moment to revisit your timeline: money you need soon should stay easier to access; money for later can stay growth-oriented.",
    )
    return {
      bullets,
      rationale:
        cashHeavy && !fundHeavy
          ? "You hold a larger cash share, so we focus on the tradeoff between safety today and keeping up with rising prices over time."
          : "We balanced your current stock, fund, and cash split with how long you can leave money invested.",
    }
  }

  const bullets: string[] = [
    "Picture needing about one-fifth of your portfolio within the next year—build that amount in places you can reach without drama.",
    "In general, trim from stock slices first if they are overweight compared to your plan, before touching core mutual fund positions.",
    "Pause or lower optional new stock buys temporarily if you need to raise cash without selling everything at once.",
    "Keep a clear dollar amount in cash or very stable fund shares so the withdrawal does not force surprise sales.",
  ]
  if (topHoldings.length > 0 && topHoldings[0].pctRounded >= 25) {
    bullets.splice(
      1,
      0,
      `Your largest position (${topHoldings[0].symbol}) is a big part of the pie—when raising cash, consider reducing that overweight first so one company is not carrying so much of your future.`,
    )
  }
  return {
    bullets,
    rationale:
      "We assumed a meaningful withdrawal soon, so the priority is cash you can use on your timeline while keeping the rest aligned with your goal.",
  }
}

export function formatSuggestedTradeForApi(suggestion: RebalancingSuggestion): string {
  return [...suggestion.bullets.map((b) => `• ${b}`), "", suggestion.rationale].join("\n")
}

export function scenarioSnapshotToApiPayload(s: ScenarioPortfolioSnapshot) {
  return {
    totalValueUsd: s.totalValueUsd,
    cashPct: s.cashPct,
    stocksPct: s.stocksPct,
    fundsPct: s.fundsPct,
    profile: s.profile,
    timeline: s.timeline,
    goal: s.goal,
    monthlyContribution: s.monthlyContribution,
    topHoldings: s.topHoldings.map((h) => ({
      symbol: h.symbol,
      name: h.name,
      pctRounded: h.pctRounded,
    })),
  }
}
