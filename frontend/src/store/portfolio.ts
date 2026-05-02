import { create } from "zustand"

export type RiskLevel = "Low" | "Medium" | "High"

export type Holding = {
  symbol: string
  name: string
  value: string
  change: number
  risk: RiskLevel
}

type PortfolioState = {
  healthScore: number
  profile: string
  timeline: string
  goal: string
  allocation: Array<{ name: string; value: number; color: string }>
  holdings: Holding[]
}

export const usePortfolioStore = create<PortfolioState>(() => ({
  healthScore: 74,
  profile: "Conservative",
  timeline: "5-10 years",
  goal: "Wealth Growth",
  allocation: [
    { name: "Stocks", value: 55, color: "#34a85a" },
    { name: "Mutual Funds", value: 30, color: "#4682b4" },
    { name: "Cash", value: 15, color: "#6495ed" },
  ],
  holdings: [
    { symbol: "AAPL", name: "Apple Inc", value: "$4,200", change: 2.4, risk: "Low" },
    { symbol: "GOOGL", name: "Alphabet Inc", value: "$3,100", change: -0.8, risk: "Medium" },
    { symbol: "HDFC", name: "HDFC Mutual Fund", value: "$2,800", change: 1.1, risk: "Low" },
    { symbol: "TSLA", name: "Tesla Inc", value: "$1,400", change: -3.2, risk: "High" },
  ],
}))
