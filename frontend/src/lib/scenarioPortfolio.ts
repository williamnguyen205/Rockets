import {
  getAllocationDrift,
  getHoldingValue,
  getPortfolioValue,
  TARGET_ALLOCATION_BY_PROFILE,
  type AllocationItem,
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

export type ScenarioTradeStep = {
  label: string
  amountUsd: number
  from: string
  to: string
  because: string
}

export type ScenarioTransparency = {
  confidence: "High" | "Medium" | "Low"
  estimatedTradingCostUsd: number
  fundFeeNote: string
  taxNote: string
  whatCouldGoWrong: string[]
}

export type ScenarioActionPlan = {
  title: string
  calmingCopy: string
  before: { stocks: number; funds: number; cash: number }
  after: { stocks: number; funds: number; cash: number }
  trades: ScenarioTradeStep[]
  transparency: ScenarioTransparency
  reviewChecklist: string[]
}

function isShortHorizon(timeline: InvestmentTimeline) {
  return timeline === "1-3 years" || timeline === "3-5 years"
}

function snapshotToAllocationItems(s: ScenarioPortfolioSnapshot): AllocationItem[] {
  return [
    { name: "Stocks", value: s.stocksPct, color: "#0f766e" },
    { name: "Mutual Funds", value: s.fundsPct, color: "#2563eb" },
    { name: "Cash", value: s.cashPct, color: "#64748b" },
  ]
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
  const target = TARGET_ALLOCATION_BY_PROFILE[profile]
  const drift = getAllocationDrift(snapshotToAllocationItems(s), target)

  const shortHorizon = isShortHorizon(timeline)
  const stockAboveTarget = drift.stocks > 8
  const cashAboveTarget = drift.cash > 5
  const fundAboveTarget = drift.funds > 8
  const fundBelowTarget = drift.funds < -8

  const targetVsActualIntro = `For your ${profile} plan, targets are ${target.stocks}% stocks, ${target.funds}% mutual funds, and ${target.cash}% cash. Right now you're at ${stocksPct}% / ${fundsPct}% / ${cashPct}%.`

  const comparisonRationale = `Compared with your saved ${profile} target (${target.stocks}/${target.funds}/${target.cash} stocks/funds/cash), today you sit at ${stocksPct}/${fundsPct}/${cashPct}.`

  if (scenarioId === "market_drop_20") {
    const bullets: string[] = [targetVsActualIntro]
    if (stockAboveTarget) {
      bullets.push(
        `You're allocated more to stocks than your ${target.stocks}% target—after a ~20% drop, that difference is worth revisiting before you need the money.`,
      )
    }
    if (shortHorizon && stockAboveTarget) {
      bullets.push(
        "Take a breath before changing anything large—big drops feel scary, but rushing to sell everything often locks in losses.",
        "Consider gradually moving a modest slice of stock money into your steadier mutual fund slice so your near-term needs feel less tied to daily price swings.",
        "Keep enough cash on hand for upcoming expenses so you are not forced to sell at a bad time.",
      )
    } else if (!shortHorizon && stockAboveTarget) {
      bullets.push(
        "With more years ahead, many people stay mostly invested through a 20% dip and rely on time for recovery—check that your mix still matches how much drama you can stomach.",
        "If one stock is a huge slice of your total, think about spreading that risk across more holdings over time (without trying to time the exact bottom).",
        "Keep an emergency cushion in cash so a market dip does not turn into a personal cash crunch.",
      )
    } else {
      bullets.push(
        "Relative to your targets, your stock slice is close to plan—focus on not making sudden, all-or-nothing moves.",
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
        shortHorizon && stockAboveTarget
          ? `${comparisonRationale} Closer to when you may need the money, and you're above target on stocks, we favor dialing back volatile equity toward your steadier fund slice after a big drop.`
          : `${comparisonRationale} We weighed your timeline and how far each bucket sits from that guide—not a prediction of the future.`,
    }
  }

  if (scenarioId === "inflation_high") {
    const bullets: string[] = [targetVsActualIntro]
    if (cashAboveTarget) {
      bullets.push(
        `You have more cash than your ${profile} target (${target.cash}%)—when prices keep rising, idle cash can slowly lose buying power.`,
        "Cash feels safe, but consider whether some of the extra belongs in a diversified fund mix for longer-term goals.",
        "Keep enough cash for near-term bills; only rethink the extra that sits idle for years.",
      )
    } else {
      bullets.push(
        "Your cash slice is at or below your target—staying invested in a broad mix can help money keep working when everyday prices climb—but nothing is guaranteed year to year.",
      )
    }
    bullets.push(
      "Funds that hold many companies or bonds can spread risk better than betting on one or two names.",
      "Inflation is a good moment to revisit your timeline: money you need soon should stay easier to access; money for later can stay growth-oriented.",
    )
    return {
      bullets,
      rationale:
        cashAboveTarget && !fundAboveTarget
          ? `${comparisonRationale} You're above target on cash and funds are close to plan, so we focus on the tradeoff between safety today and keeping up with rising prices.`
          : `${comparisonRationale} We balanced your current split with how long you can leave money invested and how each bucket compares to your ${profile} guide.`,
    }
  }

  const stockTrimLine = stockAboveTarget
    ? `You're more concentrated in stocks than your ${profile} target (${target.stocks}%)—trimming from that slice before core mutual funds is usually the gentler first lever.`
    : "In general, trim from stock slices first if they sit above your plan, before touching core mutual fund positions."

  const bullets: string[] = [
    targetVsActualIntro,
    "Picture needing about one-fifth of your portfolio within the next year—build that amount in places you can reach without drama.",
    stockTrimLine,
    "Pause or lower optional new stock buys temporarily if you need to raise cash without selling everything at once.",
    "Keep a clear dollar amount in cash or very stable fund shares so the withdrawal does not force surprise sales.",
  ]
  if (topHoldings.length > 0 && topHoldings[0].pctRounded >= 25) {
    bullets.splice(
      3,
      0,
      `Your largest position (${topHoldings[0].symbol}) is a big part of the pie—when raising cash, consider trimming that holding first so one company is not carrying so much of your future.`,
    )
  }
  if (fundBelowTarget) {
    bullets.push(
      `You're below your mutual fund target (${target.funds}%)—before selling funds for cash, check whether you can raise some from the stock slice instead.`,
    )
  }
  return {
    bullets,
    rationale: `${comparisonRationale} We assumed a meaningful withdrawal soon, so the priority is cash you can use on your timeline while keeping the rest aligned with your goal (${s.goal}).`,
  }
}

function clampPct(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function normalizeMix(stocks: number, funds: number, cash: number) {
  const roundedStocks = clampPct(stocks)
  const roundedFunds = clampPct(funds)
  const roundedCash = clampPct(cash)
  const total = roundedStocks + roundedFunds + roundedCash
  return {
    stocks: roundedStocks,
    funds: roundedFunds,
    cash: Math.min(100, Math.max(0, roundedCash + (100 - total))),
  }
}

function dollarsFromPct(totalValueUsd: number, pct: number) {
  return Math.max(0, Math.round(totalValueUsd * (pct / 100)))
}

export function buildScenarioActionPlan(
  scenarioId: ScenarioId,
  s: ScenarioPortfolioSnapshot,
): ScenarioActionPlan {
  const target = TARGET_ALLOCATION_BY_PROFILE[s.profile]
  const before = { stocks: s.stocksPct, funds: s.fundsPct, cash: s.cashPct }
  const drift = getAllocationDrift(snapshotToAllocationItems(s), target)
  const total = s.totalValueUsd
  const topHolding = s.topHoldings[0]

  if (total <= 0) {
    return {
      title: "Start with a practice portfolio",
      calmingCopy: "No judgment here. The first calm move is adding sample cash or holdings so Clarity has something real to explain.",
      before,
      after: before,
      trades: [],
      transparency: {
        confidence: "Low",
        estimatedTradingCostUsd: 0,
        fundFeeNote: "Fund fees depend on the fund selected. Beginner funds often publish a yearly expense ratio.",
        taxNote: "No tax impact is estimated because there is no simulated sale yet.",
        whatCouldGoWrong: [
          "A blank portfolio cannot show concentration risk.",
          "Real accounts may have fees, taxes, or restrictions this prototype does not know.",
        ],
      },
      reviewChecklist: [
        "Add practice cash or positions from the Stocks tab.",
        "Run this scenario again once the dashboard shows holdings.",
      ],
    }
  }

  if (scenarioId === "market_drop_20") {
    const trimPct = Math.min(Math.max(drift.stocks, 0), 12)
    const cashBoost = isShortHorizon(s.timeline) ? 5 : 2
    const moveToFunds = Math.max(0, trimPct - cashBoost)
    const after = normalizeMix(s.stocksPct - trimPct, s.fundsPct + moveToFunds, s.cashPct + Math.min(trimPct, cashBoost))
    const trimAmount = dollarsFromPct(total, trimPct)

    return {
      title: "Review a calmer market-drop plan",
      calmingCopy: "This plan avoids panic-selling. It trims only the part that sits above plan and protects money that may be needed sooner.",
      before,
      after,
      trades:
        trimAmount > 0
          ? [
              {
                label: topHolding
                  ? `Trim about ${topHolding.symbol} or other above-plan stocks`
                  : "Trim above-plan stock exposure",
                amountUsd: trimAmount,
                from: "Stocks",
                to: moveToFunds > 0 ? "Mutual funds and cash" : "Cash",
                because: `Because stocks are ${Math.max(0, Math.round(drift.stocks))} percentage points above the ${s.profile} guide, a partial trim can reduce stress without abandoning the plan.`,
              },
            ]
          : [
              {
                label: "Keep the current mix and avoid sudden selling",
                amountUsd: 0,
                from: "No sale",
                to: "Review only",
                because: "Because your stock slice is close to target, the calmer action is checking your cash cushion before reacting.",
              },
            ],
      transparency: {
        confidence: trimAmount > 0 ? "Medium" : "High",
        estimatedTradingCostUsd: 0,
        fundFeeNote: "If money moves into a diversified ETF, the ongoing fund fee may be around 0.03%-0.10% per year for many broad index ETFs.",
        taxNote: "Selling investments in a regular brokerage account may create taxes if there are gains. Confirm with a tax professional before making real trades.",
        whatCouldGoWrong: [
          "Markets could recover quickly after a sale, so the plan uses a modest trim instead of an all-or-nothing move.",
          "If the money is needed sooner than expected, even diversified funds can still fall in value.",
        ],
      },
      reviewChecklist: [
        "Confirm the goal timeline still feels right.",
        "Check whether any sale would create taxes in a real brokerage account.",
        "Review the after mix before applying this as a practice-only rebalance.",
      ],
    }
  }

  if (scenarioId === "inflation_high") {
    const excessCashPct = Math.min(Math.max(drift.cash, 0), 15)
    const after = normalizeMix(s.stocksPct, s.fundsPct + excessCashPct, s.cashPct - excessCashPct)

    return {
      title: "Review an inflation-resilience plan",
      calmingCopy: "Cash is useful, but too much idle cash can quietly lose buying power when prices keep rising.",
      before,
      after,
      trades: [
        {
          label:
            excessCashPct > 0
              ? "Shift extra idle cash toward diversified funds"
              : "Keep cash cushion, review fund fees",
          amountUsd: dollarsFromPct(total, excessCashPct),
          from: excessCashPct > 0 ? "Cash" : "No sale",
          to: excessCashPct > 0 ? "Mutual funds" : "Review only",
          because:
            excessCashPct > 0
              ? `Because cash is ${Math.round(drift.cash)} percentage points above target, only the extra cash is considered for longer-term growth.`
              : "Because cash is not above target, the better move is staying diversified and watching fund costs.",
        },
      ],
      transparency: {
        confidence: "Medium",
        estimatedTradingCostUsd: 0,
        fundFeeNote: "Broad beginner funds often charge a small yearly expense ratio; Clarity shows it before a simulated buy.",
        taxNote: "Moving cash into a fund usually has no sale tax event, but later selling that fund can create taxes in a regular brokerage account.",
        whatCouldGoWrong: [
          "Inflation could cool faster than expected, making extra cash feel less costly.",
          "Funds can still lose value over shorter windows, even if they are diversified.",
        ],
      },
      reviewChecklist: [
        "Keep enough cash for bills and emergencies first.",
        "Compare the selected fund's yearly fee.",
        "Use only money that is not needed soon.",
      ],
    }
  }

  const withdrawPct = 20
  const stockTrimPct = Math.min(Math.max(s.stocksPct - target.stocks, 0) + 6, withdrawPct)
  const fundTrimPct = Math.max(0, withdrawPct - stockTrimPct)
  const after = normalizeMix(s.stocksPct - stockTrimPct, s.fundsPct - fundTrimPct, s.cashPct + withdrawPct)

  return {
    title: "Review a one-year cash plan",
    calmingCopy: "The goal is not maximum return. It is making the needed money reachable before the user is forced to sell during a bad week.",
    before,
    after,
    trades: [
      {
        label: "Build next-year cash in stages",
        amountUsd: dollarsFromPct(total, withdrawPct),
        from: stockTrimPct >= fundTrimPct ? "Stocks first" : "Stocks and funds",
        to: "Cash",
        because: `Because about 20% may be needed next year, this sets aside roughly ${dollarsFromPct(total, withdrawPct).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} before market timing becomes stressful.`,
      },
    ],
    transparency: {
      confidence: "High",
      estimatedTradingCostUsd: 0,
      fundFeeNote: "Keeping money in cash avoids fund market swings but may earn less than invested money.",
      taxNote: "Raising cash by selling winners may create taxable gains in a regular brokerage account. Real users should confirm before selling.",
      whatCouldGoWrong: [
        "Holding more cash may reduce upside if markets rise.",
        "The needed withdrawal could be larger than expected, so the plan should be revisited monthly.",
      ],
    },
    reviewChecklist: [
      "Confirm the withdrawal amount and date.",
      "Raise cash gradually instead of waiting until the last week.",
      "Check taxes before selling any large winning position.",
    ],
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
