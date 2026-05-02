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
  expenseRatio?: number
  diversification?: string
  plainLanguageRisk?: string
  dataSource?: string
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
    profile?: InvestorProfile
    timeline?: InvestmentTimeline
    monthlyContribution?: number
    goal?: string
  }) => void
  completeOnboarding: (input: {
    profile: InvestorProfile
    timeline: InvestmentTimeline
    goal: string
    monthlyContribution: number
  }) => void
  resetOnboarding: () => void
  /** Empty holdings/cash and reset profile defaults for a brand-new account (create flow). */
  prepareNewAccount: () => void
  setCashBalance: (amount: number) => void
  buyStock: (trade: {
    symbol: string
    name: string
    shares: number
    price: number
    change: number
    category?: HoldingCategory
    risk?: RiskLevel
    expenseRatio?: number
    diversification?: string
    plainLanguageRisk?: string
    dataSource?: string
  }) => TradeResult
  sellStock: (trade: {
    symbol: string
    shares: number
    price: number
  }) => TradeResult
  addPracticeCash: (amount: number) => TradeResult
  loadSamplePortfolio: () => TradeResult
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
  const stocksVal = holdings
    .filter((holding) => holding.category === "stock")
    .reduce((total, holding) => total + getHoldingValue(holding), 0)
  const fundsVal = holdings
    .filter((holding) => holding.category === "fund")
    .reduce((total, holding) => total + getHoldingValue(holding), 0)
  const total = stocksVal + fundsVal + cashBalance

  // Nothing invested yet: show 100% cash so charts match "all dry powder / uninvested" reality.
  if (total <= 0) {
    return [
      { name: "Stocks", value: 0, color: "#34a85a" },
      { name: "Mutual Funds", value: 0, color: "#4682b4" },
      { name: "Cash", value: 100, color: "#6495ed" },
    ]
  }

  const stocksPct = parseFloat(((stocksVal / total) * 100).toFixed(1))
  const fundsPct = parseFloat(((fundsVal / total) * 100).toFixed(1))
  const cashPct = parseFloat(Math.max(0, 100 - stocksPct - fundsPct).toFixed(1))

  return [
    { name: "Stocks", value: stocksPct, color: "#34a85a" },
    { name: "Mutual Funds", value: fundsPct, color: "#4682b4" },
    { name: "Cash", value: cashPct, color: "#6495ed" },
  ]
}

const initialHoldings: Holding[] = []
const initialCashBalance = 0
const initialProfile: InvestorProfile = "Conservative"
const initialTimeline: InvestmentTimeline = "5-10 years"
const initialMonthlyContribution = 0

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
      updateProfileSettings: (settings) => {
        const state = get()
        const profile = settings.profile ?? state.profile
        const timeline = settings.timeline ?? state.timeline
        const monthlyContribution =
          settings.monthlyContribution !== undefined
            ? Math.max(0, settings.monthlyContribution)
            : state.monthlyContribution
        const goal = settings.goal !== undefined ? settings.goal : state.goal

        set({
          profile,
          timeline,
          monthlyContribution,
          goal,
          healthScore: getHealthScore({
            profile,
            timeline,
            monthlyContribution,
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
      prepareNewAccount: () => {
        const holdings: Holding[] = []
        const cashBalance = 0
        set({
          onboarded: false,
          holdings,
          cashBalance,
          allocation: getAllocation(holdings, cashBalance),
          profile: initialProfile,
          timeline: initialTimeline,
          goal: "Wealth Growth",
          monthlyContribution: initialMonthlyContribution,
          healthScore: getHealthScore({
            profile: initialProfile,
            timeline: initialTimeline,
            monthlyContribution: initialMonthlyContribution,
          }),
        })
      },
      setCashBalance: (amount) => {
        const cashBalance = Math.max(0, amount)
        set((state) => ({
          cashBalance,
          allocation: getAllocation(state.holdings, cashBalance),
        }))
      },
      buyStock: ({
        symbol,
        name,
        shares,
        price,
        change,
        category = "stock",
        risk = "Medium",
        expenseRatio,
        diversification,
        plainLanguageRisk,
        dataSource,
      }) => {
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
                  category,
                  risk,
                  expenseRatio,
                  diversification,
                  plainLanguageRisk,
                  dataSource,
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
                  risk,
                  category,
                  expenseRatio,
                  diversification,
                  plainLanguageRisk,
                  dataSource,
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
      addPracticeCash: (amount) => {
        const normalizedAmount = Math.max(0, Math.floor(amount))
        if (normalizedAmount <= 0) {
          return { ok: false, message: "Enter a cash amount above $0." }
        }

        set((state) => {
          const cashBalance = state.cashBalance + normalizedAmount
          return {
            cashBalance,
            allocation: getAllocation(state.holdings, cashBalance),
          }
        })

        return {
          ok: true,
          message: `Added ${normalizedAmount.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })} in practice cash.`,
        }
      },
      loadSamplePortfolio: () => {
        const holdings: Holding[] = [
          {
            symbol: "AAPL",
            name: "Apple Inc.",
            shares: 14,
            averageCost: 170,
            lastPrice: 188,
            change: -1.2,
            risk: "Medium",
            category: "stock",
            dataSource: "Demo holding with live-style quote assumptions",
          },
          {
            symbol: "NVDA",
            name: "NVIDIA Corporation",
            shares: 7,
            averageCost: 780,
            lastPrice: 910,
            change: -2.6,
            risk: "High",
            category: "stock",
            dataSource: "Demo holding with live-style quote assumptions",
          },
          {
            symbol: "VTI",
            name: "Vanguard Total Stock Market ETF",
            shares: 18,
            averageCost: 238,
            lastPrice: 252,
            change: -0.4,
            risk: "Medium",
            category: "fund",
            expenseRatio: 0.03,
            diversification: "Thousands of U.S. companies in one fund",
            plainLanguageRisk: "Still moves with the stock market, but less tied to one company.",
            dataSource: "Curated beginner ETF profile; prices are demo values.",
          },
        ]
        const cashBalance = 2400

        set({
          onboarded: true,
          profile: "Balanced",
          timeline: "3-5 years",
          goal: "Buying a home",
          monthlyContribution: 500,
          cashBalance,
          holdings,
          allocation: getAllocation(holdings, cashBalance),
          healthScore: getHealthScore({
            profile: "Balanced",
            timeline: "3-5 years",
            monthlyContribution: 500,
          }),
        })

        return {
          ok: true,
          message: "Loaded the sample beginner portfolio.",
        }
      },
    }),
    {
      name: "clarity-portfolio-v2",
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
