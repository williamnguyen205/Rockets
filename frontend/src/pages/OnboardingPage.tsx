import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, ChevronLeft } from "lucide-react"
import { ClarityLogo } from "@/components/ClarityLogo"
import { cn } from "@/lib/utils"
import {
  DIP_REACTION_CHOICES,
  GOAL_PRESET_LABELS,
  type DipReactionId,
  type OnboardingGoalPreset,
  type OnboardingTimeHorizon,
  deriveProfileFromOnboarding,
  getGoalDisplayLabel,
  usePortfolioStore,
} from "@/store/portfolio"

const GOAL_OPTIONS: OnboardingGoalPreset[] = ["retirement", "house", "emergency", "wealth", "other"]

const HORIZON_OPTIONS: OnboardingTimeHorizon[] = [
  "Less than 2 years",
  "2-5 years",
  "5-10 years",
  "10+ years",
]

const STEP_COUNT = 5

function ChoiceButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        "w-full rounded-[14px] border-2 px-4 py-4 text-left text-base font-extrabold leading-snug text-[#080d21] transition-colors",
        selected
          ? "border-[#080d21] bg-[#9cff48]/35 shadow-[4px_4px_0_#080d21]"
          : "border-[#d5deea] bg-white hover:border-[#080d21]/40",
      )}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const retake = location.state?.retake === true

  const { onboardingComplete, completeOnboarding } = usePortfolioStore()

  const [step, setStep] = useState(0)
  const [goalPreset, setGoalPreset] = useState<OnboardingGoalPreset | null>(null)
  const [customGoalText, setCustomGoalText] = useState("")
  const [timeHorizon, setTimeHorizon] = useState<OnboardingTimeHorizon | null>(null)
  const [dipReaction, setDipReaction] = useState<DipReactionId | null>(null)

  useEffect(() => {
    if (onboardingComplete && !retake) {
      navigate("/dashboard", { replace: true })
    }
  }, [onboardingComplete, retake, navigate])

  const derivedProfile = useMemo(() => {
    if (!goalPreset || !timeHorizon || !dipReaction) return null
    return deriveProfileFromOnboarding({ goalPreset, timeHorizon, dipReaction })
  }, [goalPreset, timeHorizon, dipReaction])

  const goalLine = goalPreset ? getGoalDisplayLabel(goalPreset, customGoalText) : ""
  const dipLine = dipReaction ? (DIP_REACTION_CHOICES.find((d) => d.id === dipReaction)?.label ?? "") : ""

  function canContinue(): boolean {
    if (step === 1) {
      if (!goalPreset) return false
      if (goalPreset === "other") return customGoalText.trim().length > 0
      return true
    }
    if (step === 2) return timeHorizon !== null
    if (step === 3) return dipReaction !== null
    return true
  }

  function goNext() {
    if (step < STEP_COUNT - 1 && canContinue()) setStep((s) => s + 1)
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  function handleFinish() {
    if (!goalPreset || !timeHorizon || !dipReaction) return
    completeOnboarding({ goalPreset, customGoalText, timeHorizon, dipReaction })
    navigate("/dashboard", { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f4eddf] px-5 py-4 text-[#080d21] sm:px-8">
      <header className="mx-auto flex max-w-[720px] flex-col gap-4 border-b-2 border-[#080d21] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <Link className="w-[200px] sm:w-[280px]" to="/" aria-label="Clarity home">
          <ClarityLogo showTagline />
        </Link>
        <p className="text-xs font-black uppercase text-[#687792]">
          Step {Math.min(step + 1, STEP_COUNT)} of {STEP_COUNT}
        </p>
      </header>

      <main className="mx-auto max-w-[720px] py-8 sm:py-10">
        {step === 0 && (
          <section className="space-y-6">
            <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-black leading-tight tracking-normal">
              Let&apos;s learn how you think about money
            </h1>
            <p className="text-lg font-extrabold leading-relaxed text-[#34435c] sm:text-xl">
              A few questions help Clarity tune your dashboard. No finance exam, no jargon. You can revisit this
              anytime from account settings later.
            </p>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#080d21] px-6 text-base font-black uppercase text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#96ff4c]"
              type="button"
              onClick={goNext}
            >
              Continue
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-6">
            <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight">What are you investing for?</h1>
            <p className="text-base font-extrabold leading-relaxed text-[#34435c] sm:text-lg">
              Choose the goal that fits best right now. There&apos;s no wrong answer.
            </p>
            <div className="grid gap-3">
              {GOAL_OPTIONS.map((preset) => (
                <ChoiceButton key={preset} selected={goalPreset === preset} onClick={() => setGoalPreset(preset)}>
                  {GOAL_PRESET_LABELS[preset]}
                </ChoiceButton>
              ))}
            </div>
            {goalPreset === "other" && (
              <label className="block">
                <span className="text-xs font-black uppercase text-[#080d21]">Your goal</span>
                <input
                  className="mt-2 h-12 w-full rounded-[14px] border-2 border-[#d5deea] bg-white px-4 text-base font-extrabold text-[#080d21] outline-none transition-colors focus:border-[#080d21] focus:ring-4 focus:ring-[#96ff4c]/30"
                  placeholder="Describe your goal in plain words"
                  value={customGoalText}
                  onChange={(e) => setCustomGoalText(e.target.value)}
                />
              </label>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight">When will you need this money?</h1>
            <p className="text-base font-extrabold leading-relaxed text-[#34435c] sm:text-lg">
              Approximate timing is enough. It helps us suggest more assured paths for short horizons and growth ideas
              for longer ones.
            </p>
            <div className="grid gap-3">
              {HORIZON_OPTIONS.map((h) => (
                <ChoiceButton key={h} selected={timeHorizon === h} onClick={() => setTimeHorizon(h)}>
                  {h}
                </ChoiceButton>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight">
              How would you feel if your investments dropped about 15%?
            </h1>
            <p className="text-base font-extrabold leading-relaxed text-[#34435c] sm:text-lg">
              Markets move. Your honest gut reaction helps us avoid strategies that would keep you up at night.
            </p>
            <div className="grid gap-3">
              {DIP_REACTION_CHOICES.map(({ id, label }) => (
                <ChoiceButton key={id} selected={dipReaction === id} onClick={() => setDipReaction(id)}>
                  {label}
                </ChoiceButton>
              ))}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-6">
            <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight">
              Here&apos;s how we&apos;ll start with you
            </h1>
            <div className="relative">
              <div className="absolute left-2 top-3 h-full w-full rounded-[22px] bg-[#0a1329]" />
              <div className="relative space-y-5 rounded-[22px] border-2 border-[#080d21] bg-white p-6 sm:p-8">
                <div>
                  <p className="text-xs font-black uppercase text-[#6d7d99]">Goal</p>
                  <p className="mt-1 text-lg font-black text-[#080d21]">{goalLine}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-[#6d7d99]">Time horizon</p>
                  <p className="mt-1 text-lg font-black text-[#080d21]">{timeHorizon ?? ""}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-[#6d7d99]">If markets dipped ~15%</p>
                  <p className="mt-1 text-base font-extrabold leading-snug text-[#243149]">{dipLine}</p>
                </div>
                <div className="border-t-2 border-dashed border-[#dfe7f0] pt-5">
                  <p className="text-xs font-black uppercase text-[#6d7d99]">Starting posture</p>
                  <p className="mt-2 text-base font-extrabold leading-relaxed text-[#243149]">
                    <span className="font-black text-[#080d21]">
                      {derivedProfile != null ? `${derivedProfile}.` : ""}
                    </span>{" "}
                    We combine your timeline, goal,
                    and comfort with volatility—no secret formulas, just sensible defaults you&apos;ll see on your
                    dashboard. Scenarios and rebalancing tips will use this as a starting point.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-[#080d21] bg-white px-5 text-sm font-black text-[#080d21] transition-colors hover:bg-[#fbf6ec]"
                type="button"
                onClick={goBack}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
              <button
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#080d21] px-6 text-base font-black uppercase text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#96ff4c] disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
                disabled={!goalPreset || !timeHorizon || !dipReaction}
                type="button"
                onClick={handleFinish}
              >
                Go to dashboard
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {step > 0 && step < 4 && (
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-[#080d21] bg-white px-4 text-sm font-black text-[#080d21] transition-colors hover:bg-[#fbf6ec]"
              type="button"
              onClick={goBack}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#080d21] px-6 text-sm font-black uppercase text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canContinue()}
              type="button"
              onClick={goNext}
            >
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
