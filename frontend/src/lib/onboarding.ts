import type { InvestmentTimeline, InvestorProfile } from "@/store/portfolio"

export type GoalOption = "Retirement" | "House" | "Emergency Fund" | "Wealth Growth" | "Other"
export type HorizonOption = "1-3 years" | "2-5 years" | "5-10 years" | "10+ years"
export type DipReactionOption = "calm" | "worried" | "out"

const STORAGE_KEY = "clarity-onboarding"

export type OnboardingAnswers = {
  goal: GoalOption
  goalOther?: string
  horizon: HorizonOption
  dipReaction: DipReactionOption
  completedAt: string
}

export const goalChoices: { value: GoalOption; label: string }[] = [
  { value: "Retirement", label: "Retirement" },
  { value: "House", label: "House" },
  { value: "Emergency Fund", label: "Emergency Fund" },
  { value: "Wealth Growth", label: "Wealth Growth" },
  { value: "Other", label: "Other" },
]

export const horizonChoices: { value: HorizonOption; label: string }[] = [
  { value: "1-3 years", label: "1-3 years" },
  { value: "2-5 years", label: "2-5 years" },
  { value: "5-10 years", label: "5-10 years" },
  { value: "10+ years", label: "10+ years" },
]

export const dipChoices: { value: DipReactionOption; label: string }[] = [
  {
    value: "calm",
    label: "Mostly calm - I know dips happen; I'd likely wait it out.",
  },
  {
    value: "worried",
    label: "Pretty worried - I'd feel uneasy and watch things closely.",
  },
  {
    value: "out",
    label: "I'd want out - A big drop would make me want to sell and protect what's left.",
  },
]

export function horizonToTimeline(horizon: HorizonOption): InvestmentTimeline {
  const map: Record<HorizonOption, InvestmentTimeline> = {
    "1-3 years": "1-3 years",
    "2-5 years": "3-5 years",
    "5-10 years": "5-10 years",
    "10+ years": "10+ years",
  }
  return map[horizon]
}

export function deriveProfile(horizon: HorizonOption, dip: DipReactionOption): InvestorProfile {
  if (dip === "out") return "Conservative"
  if (dip === "worried") return "Balanced"
  if (horizon === "10+ years" || horizon === "5-10 years") return "Growth"
  return "Balanced"
}

export function displayGoal(goal: GoalOption, goalOther: string) {
  if (goal === "Other" && goalOther.trim()) return goalOther.trim()
  if (goal === "Other") return "Other"
  return goal
}

export function readOnboarding(): OnboardingAnswers | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      goal?: GoalOption
      goalOther?: string
      horizon?: string
      dipReaction?: DipReactionOption
      completedAt?: string
    }
    if (!parsed?.horizon || !parsed?.dipReaction || !parsed?.goal) return null
    const horizon: HorizonOption =
      parsed.horizon === "Less than 2 years" ? "1-3 years" : (parsed.horizon as HorizonOption)
    const validHorizons: HorizonOption[] = ["1-3 years", "2-5 years", "5-10 years", "10+ years"]
    if (!validHorizons.includes(horizon)) return null
    return {
      goal: parsed.goal,
      goalOther: parsed.goalOther,
      horizon,
      dipReaction: parsed.dipReaction,
      completedAt: parsed.completedAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function writeOnboarding(answers: OnboardingAnswers) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
}

export function isOnboardingComplete() {
  return readOnboarding() !== null
}

export function clearOnboarding() {
  window.localStorage.removeItem(STORAGE_KEY)
}
