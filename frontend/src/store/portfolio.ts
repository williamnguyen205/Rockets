import { create } from "zustand"

export type RiskLevel = "Low" | "Medium" | "High"
export type HoldingCategory = "stock" | "fund"
export type InvestorProfile = "Conservative" | "Balanced" | "Growth" | "Aggressive"
export type InvestmentTimeline = "1-3 years" | "3-5 years" | "5-10 years" | "10+ years"

export type OnboardingGoalPreset = "retirement" | "house" | "emergency" | "wealth" | "other"
export type OnboardingTimeHorizon =
  | "Less than 2 years"
  | "2-5 years"
  | "5-10 years"
  | "10+ years"
export type DipReactionId = "calm" | "worried" | "panic"

const ONBOARDING_STORAGE_KEY = "clarity-onboarding-v1"

export const GOAL_PRESET_LABELS: Record<OnboardingGoalPreset, string> = {
  retirement: "Retirement",
  house: "House",
  emergency: "Emergency Fund",
  wealth: "Wealth Growth",
  other: "Other",
}

export const DIP_REACTION_CHOICES: Array<{ id: DipReactionId; label: string }> = [
  {
    id: "calm",
    label: "Mostly calm - I know dips happen; I'd likely wait it out.",
  },
  {
    id: "worried",
    label: "Pretty worried - I'd feel uneasy and watch things closely.",
  },
  {
    id: "panic",
    label: "I'd want out - A big drop would make me want to sell and protect what's left.",
  },
]

type StoredOnboarding = {
  complete: boolean
  goalPreset: OnboardingGoalPreset
  customGoalText: string
  timeHorizon: OnboardingTimeHorizon
  dipReaction: DipReactionId
}

function loadStoredOnboarding(): StoredOnboarding | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredOnboarding
    if (typeof parsed?.complete !== "boolean") return null
    return parsed
  } catch {
    return null
  }
}

function saveStoredOnboarding(data: StoredOnboarding) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data))
}

export function mapOnboardingHorizonToTimeline(horizon: OnboardingTimeHorizon): InvestmentTimeline {
  const table: Record<OnboardingTimeHorizon, InvestmentTimeline> = {
    "Less than 2 years": "1-3 years",
    "2-5 years": "3-5 years",
    "5-10 years": "5-10 years",
    "10+ years": "10+ years",
  }
  return table[horizon]
}

export function deriveProfileFromOnboarding({
  goalPreset,
  timeHorizon,
  dipReaction,
}: {
  goalPreset: OnboardingGoalPreset
  timeHorizon: OnboardingTimeHorizon
  dipReaction: DipReactionId
}): InvestorProfile {
  if (dipReaction === "panic") return "Conservative"
  if (goalPreset === "emergency") {
    return timeHorizon === "Less than 2 years" || timeHorizon === "2-5 years" ? "Conservative" : "Balanced"
  }
  if (dipReaction === "worried") {
    if (timeHorizon === "Less than 2 years" || timeHorizon === "2-5 years") return "Conservative"
    return "Balanced"
  }
  if (timeHorizon === "Less than 2 years") return "Conservative"
  if (timeHorizon === "2-5 years") {
    return goalPreset === "wealth" ? "Growth" : "Balanced"
  }
  if (timeHorizon === "5-10 years") {
    if (goalPreset === "wealth" || goalPreset === "retirement") return "Growth"
    return "Balanced"
  }
  if (goalPreset === "wealth") return "Aggressive"
  if (goalPreset === "retirement") return "Growth"
  return "Growth"
}

export function getGoalDisplayLabel(goalPreset: OnboardingGoalPreset, customGoalText: string) {
  if (goalPreset === "other" && customGoalText.trim()) return customGoalText.trim()
  return GOAL_PRESET_LABELS[goalPreset]
}

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
  profile: InvestorProfile
  timeline: InvestmentTimeline
  goal: string
  monthlyContribution: number
  cashBalance: number
  allocation: AllocationItem[]
  holdings: Holding[]
  onboardingComplete: boolean
  onboardingGoalPreset: OnboardingGoalPreset
  onboardingCustomGoalText: string
  onboardingTimeHorizon: OnboardingTimeHorizon
  onboardingDipReaction: DipReactionId
  completeOnboarding: (answers: {
    goalPreset: OnboardingGoalPreset
    customGoalText: string
    timeHorizon: OnboardingTimeHorizon
    dipReaction: DipReactionId
  }) => void
  markOnboardingIncomplete: () => void
  updateProfileSettings: (settings: {
    profile: InvestorProfile
    timeline: InvestmentTimeline
    monthlyContribution: number
  }) => void
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
const initialProfile: InvestorProfile = "Conservative"
const initialTimeline: InvestmentTimeline = "5-10 years"
const initialMonthlyContribution = 650

const storedOnboarding = loadStoredOnboarding()

const baselineOnboarding: StoredOnboarding = {
  complete: false,
  goalPreset: "wealth",
  customGoalText: "",
  timeHorizon: "5-10 years",
  dipReaction: "worried",
}

const resolvedOnboarding = storedOnboarding ?? baselineOnboarding

const initialOnboardingProfile = deriveProfileFromOnboarding({
  goalPreset: resolvedOnboarding.goalPreset,
  timeHorizon: resolvedOnboarding.timeHorizon,
  dipReaction: resolvedOnboarding.dipReaction,
})

const initialProfileResolved = resolvedOnboarding.complete
  ? initialOnboardingProfile
  : initialProfile

const initialTimelineResolved = resolvedOnboarding.complete
  ? mapOnboardingHorizonToTimeline(resolvedOnboarding.timeHorizon)
  : initialTimeline

const initialGoalResolved = resolvedOnboarding.complete
  ? getGoalDisplayLabel(resolvedOnboarding.goalPreset, resolvedOnboarding.customGoalText)
  : "Wealth Growth"

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  healthScore: getHealthScore({
    profile: initialProfileResolved,
    timeline: initialTimelineResolved,
    monthlyContribution: initialMonthlyContribution,
  }),
  profile: initialProfileResolved,
  timeline: initialTimelineResolved,
  goal: initialGoalResolved,
  monthlyContribution: initialMonthlyContribution,
  cashBalance: initialCashBalance,
  allocation: getAllocation(initialHoldings, initialCashBalance),
  holdings: initialHoldings,
  onboardingComplete: resolvedOnboarding.complete,
  onboardingGoalPreset: resolvedOnboarding.goalPreset,
  onboardingCustomGoalText: resolvedOnboarding.customGoalText,
  onboardingTimeHorizon: resolvedOnboarding.timeHorizon,
  onboardingDipReaction: resolvedOnboarding.dipReaction,
  completeOnboarding: ({ goalPreset, customGoalText, timeHorizon, dipReaction }) => {
    const profile = deriveProfileFromOnboarding({ goalPreset, timeHorizon, dipReaction })
    const timeline = mapOnboardingHorizonToTimeline(timeHorizon)
    const goal = getGoalDisplayLabel(goalPreset, customGoalText)
    const monthlyContribution = get().monthlyContribution

    const payload: StoredOnboarding = {
      complete: true,
      goalPreset,
      customGoalText,
      timeHorizon,
      dipReaction,
    }
    saveStoredOnboarding(payload)

    set({
      onboardingComplete: true,
      onboardingGoalPreset: goalPreset,
      onboardingCustomGoalText: customGoalText,
      onboardingTimeHorizon: timeHorizon,
      onboardingDipReaction: dipReaction,
      profile,
      timeline,
      goal,
      healthScore: getHealthScore({ profile, timeline, monthlyContribution }),
    })
  },
  markOnboardingIncomplete: () => {
    const state = get()
    saveStoredOnboarding({
      complete: false,
      goalPreset: state.onboardingGoalPreset,
      customGoalText: state.onboardingCustomGoalText,
      timeHorizon: state.onboardingTimeHorizon,
      dipReaction: state.onboardingDipReaction,
    })
    set({ onboardingComplete: false })
  },
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

export { getAllocation, getHoldingValue, getPortfolioValue }
