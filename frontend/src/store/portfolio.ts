import { create } from "zustand"

export type RiskLevel = "Low" | "Medium" | "High"
export type HoldingCategory = "stock" | "fund"

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

type AllocationItem = { name: string; value: number; color: string }

type PortfolioState = {
  healthScore: number
  profile: string
  timeline: string
  goal: string
  cashBalance: number
  allocation: AllocationItem[]
  holdings: Holding[]
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
      { name: "Stocks", value: 0, color: "#34a85a" },
      { name: "Mutual Funds", value: 0, color: "#4682b4" },
      { name: "Cash", value: 0, color: "#6495ed" },
    ]
  }

  return [
    { name: "Stocks", value: Math.round((stocks / total) * 100), color: "#34a85a" },
    { name: "Mutual Funds", value: Math.round((funds / total) * 100), color: "#4682b4" },
    { name: "Cash", value: Math.round((cashBalance / total) * 100), color: "#6495ed" },
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

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  healthScore: 74,
  profile: "Conservative",
  timeline: "5-10 years",
  goal: "Wealth Growth",
  cashBalance: initialCashBalance,
  allocation: getAllocation(initialHoldings, initialCashBalance),
  holdings: initialHoldings,
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
}))

export { getHoldingValue }
