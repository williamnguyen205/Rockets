import { create } from "zustand"
import { persist } from "zustand/middleware"

export type RiskLevel = "Low" | "Medium" | "High"
export type HoldingCategory = "stock" | "fund"
export type InvestorProfile = "Conservative" | "Balanced" | "Growth" | "Aggressive"
export type InvestmentTimeline = "1-3 years" | "3-5 years" | "5-10 years" | "10+ years"

export type Holding = {
  symbol: string
  name: string
  shares: number
  averageCost: number
  lastPrice: number
  change: number
  risk: RiskLevel
  category: HoldingCategory
}

export type TradeResult = {
  ok: boolean
  message: string
}

export type AllocationItem = { name: string; value: number; color: string }

export type AllocationTarget = { stocks: number; funds: number; cash: number }

export const TARGET_ALLOCATION_BY_PROFILE: Record<InvestorProfile, AllocationTarget> = {
  Conservative: { stocks: 30, funds: 50, cash: 20 },
  Balanced: { stocks: 50, funds: 40, cash: 10 },
  Growth: { stocks: 65, funds: 30, cash: 5 },
  Aggressive: { stocks: 80, funds: 18, cash: 2 },
}

export type AllocationDrift = {
  stocks: number
  funds: number
  cash: number
  totalAbs: number
}

export function getAllocationDrift(
  current: AllocationItem[],
  target: AllocationTarget,
): AllocationDrift {
  const cur = (name: string) => current.find((item) => item.name === name)?.value ?? 0
  const stocks = cur("Stocks") - target.stocks
  const funds = cur("Mutual Funds") - target.funds
  const cash = cur("Cash") - target.cash
  return {
    stocks,
    funds,
    cash,
    totalAbs: Math.abs(stocks) + Math.abs(funds) + Math.abs(cash),
  }
}

type PortfolioState = {
  onboarded: boolean
  healthScore: number
  profile: InvestorProfile
  timeline: InvestmentTimeline
  goal: string
  monthlyContribution: number
  cashBalance: number
  allocation: AllocationItem[]
  holdings: Holding[]
  updateProfileSettings: (settings: {
    profile: InvestorProfile
    timeline: InvestmentTimeline
    monthlyContribution: number
  }) => void
  completeOnboarding: (input: {
    profile: InvestorProfile
    timeline: InvestmentTimeline
    goal: string
    monthlyContribution: number
  }) => void
  resetOnboarding: () => void
  buyStock: (trade: {
    symbol: string
    name: string
    shares: number
    price: number
    change: number
  }) => TradeResult
  sellStock: (trade: {
    symbol: string
    shares: number
    price: number
  }) => TradeResult
}

function getHoldingValue(holding: Holding) {
  return holding.shares * holding.lastPrice
}

function getPortfolioValue(holdings: Holding[], cashBalance: number) {
  return holdings.reduce((total, holding) => total + getHoldingValue(holding), cashBalance)
}

function getHealthScore({
  profile,
  timeline,
  monthlyContribution,
}: {
  profile: InvestorProfile
  timeline: InvestmentTimeline
  monthlyContribution: number
}) {
  const profileScore: Record<InvestorProfile, number> = {
    Conservative: 76,
    Balanced: 80,
    Growth: 74,
    Aggressive: 66,
  }
  const timelineAdjustment: Record<InvestmentTimeline, number> = {
    "1-3 years": -8,
    "3-5 years": -2,
    "5-10 years": 4,
    "10+ years": 7,
  }
  const contributionAdjustment = Math.min(Math.floor(monthlyContribution / 250), 8)

  return Math.max(
    35,
    Math.min(95, profileScore[profile] + timelineAdjustment[timeline] + contributionAdjustment),
  )
}

function getAllocation(holdings: Holding[], cashBalance: number): AllocationItem[] {
  const stocks = holdings
    .filter((holding) => holding.category === "stock")
    .reduce((total, holding) => total + getHoldingValue(holding), 0)
  const funds = holdings
    .filter((holding) => holding.category === "fund")
    .reduce((total, holding) => total + getHoldingValue(holding), 0)
  const total = stocks + funds + cashBalance

  if (!total) {
    return [
      { name: "Stocks", value: 0, color: "#0f766e" },
      { name: "Mutual Funds", value: 0, color: "#2563eb" },
      { name: "Cash", value: 0, color: "#64748b" },
    ]
  }

  return [
    { name: "Stocks", value: Math.round((stocks / total) * 100), color: "#0f766e" },
    { name: "Mutual Funds", value: Math.round((funds / total) * 100), color: "#2563eb" },
    { name: "Cash", value: Math.round((cashBalance / total) * 100), color: "#64748b" },
  ]
}

const initialHoldings: Holding[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc",
    shares: 15,
    averageCost: 255,
    lastPrice: 280,
    change: 2.4,
    risk: "Low",
    category: "stock",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc",
    shares: 12,
    averageCost: 250,
    lastPrice: 258,
    change: -0.8,
    risk: "Medium",
    category: "stock",
  },
  {
    symbol: "HDFC",
    name: "HDFC Mutual Fund",
    shares: 56,
    averageCost: 50,
    lastPrice: 50,
    change: 1.1,
    risk: "Low",
    category: "fund",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc",
    shares: 4,
    averageCost: 330,
    lastPrice: 350,
    change: -3.2,
    risk: "High",
    category: "stock",
  },
]

const initialCashBalance = 2500
const initialProfile: InvestorProfile = "Conservative"
const initialTimeline: InvestmentTimeline = "5-10 years"
const initialMonthlyContribution = 650

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      healthScore: getHealthScore({
        profile: initialProfile,
        timeline: initialTimeline,
        monthlyContribution: initialMonthlyContribution,
      }),
      profile: initialProfile,
      timeline: initialTimeline,
      goal: "Wealth Growth",
      monthlyContribution: initialMonthlyContribution,
      cashBalance: initialCashBalance,
      allocation: getAllocation(initialHoldings, initialCashBalance),
      holdings: initialHoldings,
      updateProfileSettings: ({ profile, timeline, monthlyContribution }) => {
        const normalizedContribution = Math.max(0, monthlyContribution)

        set({
          profile,
          timeline,
          monthlyContribution: normalizedContribution,
          healthScore: getHealthScore({
            profile,
            timeline,
            monthlyContribution: normalizedContribution,
          }),
        })
      },
      completeOnboarding: ({ profile, timeline, goal, monthlyContribution }) => {
        const normalizedContribution = Math.max(0, monthlyContribution)

        set({
          onboarded: true,
          profile,
          timeline,
          goal,
          monthlyContribution: normalizedContribution,
          healthScore: getHealthScore({
            profile,
            timeline,
            monthlyContribution: normalizedContribution,
          }),
        })
      },
      resetOnboarding: () => {
        set({ onboarded: false })
      },
      buyStock: ({ symbol, name, shares, price, change }) => {
        const normalizedSymbol = symbol.trim().toUpperCase()
        const tradeValue = shares * price

        if (!normalizedSymbol || shares <= 0 || price <= 0) {
          return { ok: false, message: "Enter a valid share amount." }
        }

        if (tradeValue > get().cashBalance) {
          return { ok: false, message: "Not enough cash available for that purchase." }
        }

        set((state) => {
          const existing = state.holdings.find((holding) => holding.symbol === normalizedSymbol)
          const holdings = existing
            ? state.holdings.map((holding) => {
                if (holding.symbol !== normalizedSymbol) return holding

                const totalShares = holding.shares + shares
                const totalCost = holding.averageCost * holding.shares + tradeValue

                return {
                  ...holding,
                  name,
                  shares: totalShares,
                  averageCost: totalCost / totalShares,
                  lastPrice: price,
                  change,
                  category: "stock" as const,
                }
              })
            : [
                ...state.holdings,
                {
                  symbol: normalizedSymbol,
                  name,
                  shares,
                  averageCost: price,
                  lastPrice: price,
                  change,
                  risk: "Medium" as const,
                  category: "stock" as const,
                },
              ]

          const cashBalance = state.cashBalance - tradeValue

          return {
            cashBalance,
            holdings,
            allocation: getAllocation(holdings, cashBalance),
          }
        })

        return {
          ok: true,
          message: `Bought ${shares.toFixed(2)} shares of ${normalizedSymbol}.`,
        }
      },
      sellStock: ({ symbol, shares, price }) => {
        const normalizedSymbol = symbol.trim().toUpperCase()
        const holding = get().holdings.find((item) => item.symbol === normalizedSymbol)

        if (!holding || shares <= 0 || price <= 0) {
          return { ok: false, message: "Enter a valid share amount." }
        }

        if (shares > holding.shares) {
          return { ok: false, message: `You only own ${holding.shares.toFixed(2)} shares.` }
        }

        set((state) => {
          const cashBalance = state.cashBalance + shares * price
          const holdings = state.holdings
            .map((item) => {
              if (item.symbol !== normalizedSymbol) return item

              return {
                ...item,
                shares: item.shares - shares,
                lastPrice: price,
              }
            })
            .filter((item) => item.shares > 0.0001)

          return {
            cashBalance,
            holdings,
            allocation: getAllocation(holdings, cashBalance),
          }
        })

        return {
          ok: true,
          message: `Sold ${shares.toFixed(2)} shares of ${normalizedSymbol}.`,
        }
      },
    }),
    {
      name: "clarity-portfolio",
      partialize: (state) => ({
        onboarded: state.onboarded,
        profile: state.profile,
        timeline: state.timeline,
        goal: state.goal,
        monthlyContribution: state.monthlyContribution,
        holdings: state.holdings,
        cashBalance: state.cashBalance,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.healthScore = getHealthScore(state)
        state.allocation = getAllocation(state.holdings, state.cashBalance)
      },
    },
  ),
)

export { getAllocation, getHoldingValue, getPortfolioValue }
