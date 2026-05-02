import { useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import { ClarityLogo } from "@/components/ClarityLogo"
import { Button } from "@/components/ui/button"
import { endSession, getAuthEntry } from "@/lib/session"
import { cn } from "@/lib/utils"
import {
  type InvestmentTimeline,
  type InvestorProfile,
  usePortfolioStore,
} from "@/store/portfolio"

type TimelineOption = {
  label: string
  value: InvestmentTimeline
}

type ProfileOption = {
  label: string
  blurb: string
  value: InvestorProfile
}

type GoalOption = {
  label: string
  value: string
}

type ContributionChip = {
  label: string
  value: number
}

type OnboardingLocationState = {
  retake?: boolean
}

const timelineOptions: TimelineOption[] = [
  { label: "Within the next 1-3 years", value: "1-3 years" },
  { label: "About 3-5 years", value: "3-5 years" },
  { label: "5-10 years", value: "5-10 years" },
  { label: "More than 10 years", value: "10+ years" },
]

const profileOptions: ProfileOption[] = [
  {
    label: "I'd panic and want to sell",
    blurb: "We'll lean toward steadier mixes that move less day to day.",
    value: "Conservative",
  },
  {
    label: "I'd be uncomfortable but ride it out",
    blurb: "A balanced mix of growth and stability fits this comfort level.",
    value: "Balanced",
  },
  {
    label: "I'd see it as a normal bump",
    blurb: "More growth assets, with the patience to ride out volatility.",
    value: "Growth",
  },
  {
    label: "I'd consider buying more",
    blurb: "An aggressive mix that leans into long-term opportunity.",
    value: "Aggressive",
  },
]

const goalOptions: GoalOption[] = [
  { label: "Buying a home", value: "Buying a home" },
  { label: "Retirement", value: "Retirement" },
  { label: "Wealth growth", value: "Wealth Growth" },
  { label: "A big purchase, like a car, wedding, or education", value: "Big purchase" },
  { label: "Other or not sure yet", value: "Exploring" },
]

const contributionChips: ContributionChip[] = [
  { label: "$0", value: 0 },
  { label: "$50", value: 50 },
  { label: "$200", value: 200 },
  { label: "$500", value: 500 },
  { label: "$1,000", value: 1000 },
]

const stepTitles = [
  "When do you think you'll need this money?",
  "How would you react to a sharp market drop?",
  "What are you mainly investing for?",
  "How much can you set aside each month?",
  "Here is the plan we'll start with.",
]

const stepHints = [
  "There are no wrong answers. This shapes how cautious or growth-leaning your default plan is.",
  "Be honest with yourself. Your gut reaction tells us how much price movement you can sit through.",
  "We use this to give your dashboard, scenarios, and tutor the right context.",
  "Even small amounts add up. Pick what feels comfortable; you can change it any time.",
  "You can tweak any of this later from Account or Scenarios.",
]

function StepShell({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string
  title: string
  copy: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-panel sm:p-6">
      <p className="text-xs font-semibold uppercase text-accent">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{copy}</p>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function ChoiceButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        "flex w-full items-start justify-between gap-4 rounded-md border px-4 py-3 text-left transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-accent hover:bg-muted/45",
      )}
      type="button"
      onClick={onClick}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {active ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const completeOnboarding = usePortfolioStore((state) => state.completeOnboarding)
  const storedProfile = usePortfolioStore((state) => state.profile)
  const storedTimeline = usePortfolioStore((state) => state.timeline)
  const storedGoal = usePortfolioStore((state) => state.goal)
  const storedMonthly = usePortfolioStore((state) => state.monthlyContribution)

  const [step, setStep] = useState(0)
  const [timeline, setTimeline] = useState<InvestmentTimeline>(storedTimeline)
  const [profile, setProfile] = useState<InvestorProfile>(storedProfile)
  const [goal, setGoal] = useState<string>(storedGoal)
  const [monthlyContribution, setMonthlyContribution] = useState<number>(storedMonthly)
  const [contributionInput, setContributionInput] = useState<string>(() =>
    String(storedMonthly ?? 0),
  )

  const totalSteps = 5
  const progress = ((step + 1) / totalSteps) * 100
  const isRetake = (location.state as OnboardingLocationState | null)?.retake === true

  function goNext() {
    setStep((current) => Math.min(current + 1, totalSteps - 1))
  }

  function goBack() {
    if (step > 0) {
      setStep((current) => current - 1)
      return
    }

    if (isRetake) {
      navigate("/account", { replace: true })
      return
    }

    const entry = getAuthEntry()
    endSession()
    navigate(entry === "login" ? "/login" : "/create", { replace: true })
  }

  function pickContribution(value: number) {
    setMonthlyContribution(value)
    setContributionInput(value ? String(value) : "0")
  }

  function handleContributionInput(raw: string) {
    setContributionInput(raw)
    const parsed = Math.max(0, Math.floor(Number(raw) || 0))
    setMonthlyContribution(parsed)
  }

  function finish() {
    completeOnboarding({ profile, timeline, goal, monthlyContribution })
    navigate("/dashboard")
  }

  const goalLabel = goalOptions.find((option) => option.value === goal)?.label ?? "Wealth growth"
  const profileBlurb = profileOptions.find((option) => option.value === profile)?.blurb ?? ""
  const backLabel =
    step > 0
      ? "Back"
      : isRetake
        ? "Back to settings"
        : getAuthEntry() === "login"
          ? "Back to sign in"
          : "Back to create account"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-[920px] items-center justify-between px-4 sm:px-6">
        <Link className="text-primary" to="/" aria-label="Clarity home">
          <ClarityLogo compact />
        </Link>
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Step {step + 1} of {totalSteps}
        </span>
      </header>

      <main className="mx-auto grid max-w-[920px] gap-5 px-4 pb-10 pt-4 sm:px-6">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>

        <StepShell eyebrow="Guided setup" title={stepTitles[step]} copy={stepHints[step]}>
          {step === 0 ? (
            <div className="grid gap-3">
              {timelineOptions.map((option) => (
                <ChoiceButton
                  key={option.value}
                  active={timeline === option.value}
                  onClick={() => setTimeline(option.value)}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                </ChoiceButton>
              ))}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3">
              {profileOptions.map((option) => (
                <ChoiceButton
                  key={option.value}
                  active={profile === option.value}
                  onClick={() => setProfile(option.value)}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className={cn("mt-1 block text-sm", profile === option.value ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {option.blurb}
                  </span>
                </ChoiceButton>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3">
              {goalOptions.map((option) => (
                <ChoiceButton
                  key={option.value}
                  active={goal === option.value}
                  onClick={() => setGoal(option.value)}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                </ChoiceButton>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {contributionChips.map((chip) => (
                  <button
                    key={chip.value}
                    className={cn(
                      "rounded-md border px-4 py-2 text-sm font-semibold transition-colors",
                      monthlyContribution === chip.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-accent hover:bg-muted/45",
                    )}
                    type="button"
                    onClick={() => pickContribution(chip.value)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Or enter a custom monthly amount
                </span>
                <span className="mt-2 flex h-11 items-center gap-3 rounded-md border border-input bg-card px-3 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-ring/20">
                  <span className="text-sm font-semibold text-muted-foreground">$</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                    inputMode="numeric"
                    min={0}
                    placeholder="0"
                    type="number"
                    value={contributionInput}
                    onChange={(event) => handleContributionInput(event.target.value)}
                  />
                  <span className="text-xs font-semibold uppercase text-muted-foreground">/ month</span>
                </span>
              </label>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-muted/45 p-5">
                <p className="text-sm font-medium leading-7 text-muted-foreground">
                  We'll set up a <span className="font-semibold text-foreground">{profile}</span> plan aimed at{" "}
                  <span className="font-semibold text-foreground">{goalLabel.toLowerCase()}</span> over a{" "}
                  <span className="font-semibold text-foreground">{timeline.toLowerCase()}</span> timeline, with about{" "}
                  <span className="font-semibold text-foreground">
                    ${monthlyContribution.toLocaleString()}/month
                  </span>{" "}
                  in contributions.
                </p>
                {profileBlurb ? (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{profileBlurb}</p>
                ) : null}
              </div>

              <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                {[
                  ["Profile", profile],
                  ["Timeline", timeline],
                  ["Goal", goalLabel],
                  ["Monthly", `$${monthlyContribution.toLocaleString()}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-card p-4">
                    <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
                    <dd className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {backLabel}
            </Button>
            {step < totalSteps - 1 ? (
              <Button type="button" onClick={goNext}>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" onClick={finish}>
                Start using Clarity
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </StepShell>
      </main>
    </div>
  )
}
