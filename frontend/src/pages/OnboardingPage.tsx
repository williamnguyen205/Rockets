import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import { ClarityLogo } from "@/components/ClarityLogo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  type DipReactionOption,
  type GoalOption,
  type HorizonOption,
  deriveProfile,
  dipChoices,
  displayGoal,
  goalChoices,
  horizonChoices,
  horizonToTimeline,
  readOnboarding,
  writeOnboarding,
} from "@/lib/onboarding"
import { type InvestorProfile, usePortfolioStore } from "@/store/portfolio"

type Step = 0 | 1 | 2 | 3 | 4

function dipSummaryLabel(option: DipReactionOption) {
  if (option === "calm") return "Mostly calm, likely to wait it out"
  if (option === "worried") return "Pretty worried, watching closely"
  return "Would want out to protect what's left"
}

function postureDescription(profile: InvestorProfile) {
  const rest =
    "We combine your timeline, goal, and comfort with volatility. Scenarios and rebalancing tips will use this as a starting point."
  return { label: profile, rest }
}

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
        "flex w-full items-center justify-between gap-4 rounded-md border px-4 py-3 text-left text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-accent hover:bg-muted/45",
      )}
      type="button"
      onClick={onClick}
    >
      <span>{children}</span>
      {active ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const retake = Boolean((location.state as { retake?: boolean } | null)?.retake)
  const snapshot = readOnboarding()

  const applyOnboardingResult = usePortfolioStore((s) => s.applyOnboardingResult)

  const [step, setStep] = useState<Step>(0)
  const [goal, setGoal] = useState<GoalOption | null>(null)
  const [goalOther, setGoalOther] = useState("")
  const [horizon, setHorizon] = useState<HorizonOption | null>(null)
  const [dipReaction, setDipReaction] = useState<DipReactionOption | null>(null)

  useEffect(() => {
    if (snapshot && !retake) {
      navigate("/dashboard", { replace: true })
    }
  }, [snapshot, retake, navigate])

  const profile = useMemo(() => {
    if (horizon === null || dipReaction === null) return null
    return deriveProfile(horizon, dipReaction)
  }, [horizon, dipReaction])

  function finish() {
    if (goal === null || horizon === null || dipReaction === null) return
    const resolvedProfile = deriveProfile(horizon, dipReaction)
    const goalText = displayGoal(goal, goalOther)
    const timeline = horizonToTimeline(horizon)
    applyOnboardingResult({ goal: goalText, profile: resolvedProfile, timeline })
    writeOnboarding({
      goal,
      goalOther: goalOther.trim(),
      horizon,
      dipReaction,
      completedAt: new Date().toISOString(),
    })
    navigate("/dashboard", { replace: true })
  }

  function canAdvanceFromGoal() {
    if (goal === null) return false
    if (goal !== "Other") return true
    return goalOther.trim().length > 0
  }

  const totalSteps = 5
  const progress = ((step + 1) / totalSteps) * 100

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

        {step === 0 ? (
          <StepShell
            eyebrow="Investor profile"
            title="Set up a plan that matches your actual comfort level."
            copy="A short questionnaire tunes your dashboard, target allocation, and scenario suggestions. No jargon test, just practical defaults you can change later."
          >
            <Button size="lg" type="button" onClick={() => setStep(1)}>
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </StepShell>
        ) : null}

        {step === 1 ? (
          <StepShell
            eyebrow="Goal"
            title="What are you investing for?"
            copy="Choose the goal that fits best right now. This gives the app context for risk and timeline tradeoffs."
          >
            <div className="grid gap-3">
              {goalChoices.map((choice) => (
                <ChoiceButton
                  key={choice.value}
                  active={goal === choice.value}
                  onClick={() => setGoal(choice.value)}
                >
                  {choice.label}
                </ChoiceButton>
              ))}
            </div>
            {goal === "Other" ? (
              <label className="mt-4 block space-y-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Your goal</span>
                <input
                  className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/20"
                  placeholder="Describe your goal in plain words"
                  value={goalOther}
                  onChange={(event) => setGoalOther(event.target.value)}
                />
              </label>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <Button disabled={!canAdvanceFromGoal()} type="button" onClick={() => setStep(2)}>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </StepShell>
        ) : null}

        {step === 2 ? (
          <StepShell
            eyebrow="Timeline"
            title="When will you need this money?"
            copy="Approximate timing is enough. Short horizons need more stability; longer horizons can usually tolerate more movement."
          >
            <div className="grid gap-3">
              {horizonChoices.map((choice) => (
                <ChoiceButton
                  key={choice.value}
                  active={horizon === choice.value}
                  onClick={() => setHorizon(choice.value)}
                >
                  {choice.label}
                </ChoiceButton>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <Button disabled={horizon === null} type="button" onClick={() => setStep(3)}>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </StepShell>
        ) : null}

        {step === 3 ? (
          <StepShell
            eyebrow="Risk tolerance"
            title="If investments dropped about 15%, what would you do?"
            copy="Your honest reaction helps Clarity avoid a portfolio you would abandon during normal market stress."
          >
            <div className="grid gap-3">
              {dipChoices.map((choice) => (
                <ChoiceButton
                  key={choice.value}
                  active={dipReaction === choice.value}
                  onClick={() => setDipReaction(choice.value)}
                >
                  {choice.label}
                </ChoiceButton>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <Button disabled={dipReaction === null} type="button" onClick={() => setStep(4)}>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </StepShell>
        ) : null}

        {step === 4 && goal !== null && horizon !== null && dipReaction !== null && profile !== null ? (
          <StepShell
            eyebrow="Starting posture"
            title="Here is how Clarity will start with you."
            copy="This is a working profile, not a permanent label. You can retake the questionnaire from account settings."
          >
            <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
              {[
                ["Goal", displayGoal(goal, goalOther)],
                ["Time horizon", horizon],
                ["Market dip reaction", dipSummaryLabel(dipReaction)],
                [
                  "Profile",
                  `${postureDescription(profile).label}. ${postureDescription(profile).rest}`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="bg-card p-4">
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
                  <dd className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              <Button type="button" onClick={finish}>
                Go to dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </StepShell>
        ) : null}
      </main>
    </div>
  )
}
