import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { ClarityLogo } from "@/components/ClarityLogo"
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
  if (option === "calm") return "Mostly calm — likely to wait it out"
  if (option === "worried") return "Pretty worried — uneasy, watching closely"
  return "Would want out — sell to protect what's left"
}

function postureDescription(profile: InvestorProfile) {
  const rest =
    "We combine your timeline, goal, and comfort with volatility—no secret formulas, just sensible defaults you'll see on your dashboard. Scenarios and rebalancing tips will use this as a starting point."
  return { label: profile, rest }
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
  const progressIndex = step

  return (
    <div className="min-h-screen bg-[#f4eddf] px-5 py-4 text-[#080d21] sm:px-8">
      <header className="mx-auto flex max-w-[720px] items-center justify-between border-b-2 border-[#080d21] pb-4">
        <Link className="w-[200px] sm:w-[280px]" to="/" aria-label="Clarity home">
          <ClarityLogo showTagline />
        </Link>
        <span className="text-xs font-black uppercase text-[#687792]">
          Step {Math.min(progressIndex + 1, totalSteps)} of {totalSteps}
        </span>
      </header>

      <main className="mx-auto flex max-w-[720px] flex-col gap-8 py-10">
        {step === 0 ? (
          <section className="space-y-5">
            <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-black leading-tight tracking-normal">
              Let&apos;s learn how you think about money
            </h1>
            <p className="text-lg font-extrabold leading-relaxed text-[#34435c]">
              A few questions help Clarity tune your dashboard. No finance exam, no jargon. You can revisit this anytime
              from account settings later.
            </p>
            <button
              className="mt-2 flex h-12 w-full max-w-md items-center justify-center gap-3 rounded-[14px] bg-[#080d21] px-5 text-base font-black uppercase text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#96ff4c] sm:w-auto"
              type="button"
              onClick={() => setStep(1)}
            >
              Continue
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-6">
            <div>
              <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight">What are you investing for?</h1>
              <p className="mt-3 text-base font-extrabold leading-relaxed text-[#34435c]">
                Choose the goal that fits best right now. There&apos;s no wrong answer.
              </p>
            </div>
            <div className="grid gap-3">
              {goalChoices.map((choice) => (
                <button
                  key={choice.value}
                  className={cn(
                    "rounded-[14px] border-2 px-4 py-4 text-left text-base font-black transition-colors",
                    goal !== null && goal === choice.value
                      ? "border-[#080d21] bg-[#9cff48] text-[#080d21] shadow-[4px_4px_0_#080d21]"
                      : "border-[#d5deea] bg-white/80 hover:border-[#080d21]/60",
                  )}
                  type="button"
                  onClick={() => setGoal(choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            {goal === "Other" ? (
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase text-[#080d21]">Your goal</span>
                <input
                  className="h-12 w-full rounded-[14px] border-2 border-[#d5deea] bg-white px-4 text-base font-extrabold text-[#080d21] outline-none transition-colors focus:border-[#080d21] focus:ring-4 focus:ring-[#96ff4c]/30"
                  placeholder="Describe your goal in plain words"
                  value={goalOther}
                  onChange={(event) => setGoalOther(event.target.value)}
                />
              </label>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                className="h-12 rounded-[14px] border-2 border-[#080d21] bg-transparent px-6 text-sm font-black uppercase text-[#080d21]"
                type="button"
                onClick={() => setStep(0)}
              >
                Back
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#080d21] px-6 text-sm font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canAdvanceFromGoal()}
                type="button"
                onClick={() => setStep(2)}
              >
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-6">
            <div>
              <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight">When will you need this money?</h1>
              <p className="mt-3 text-base font-extrabold leading-relaxed text-[#34435c]">
                Approximate timing is enough. It helps us suggest more assured paths for short horizons and growth ideas
                for longer ones.
              </p>
            </div>
            <div className="grid gap-3">
              {horizonChoices.map((choice) => (
                <button
                  key={choice.value}
                  className={cn(
                    "rounded-[14px] border-2 px-4 py-4 text-left text-base font-black transition-colors",
                    horizon !== null && horizon === choice.value
                      ? "border-[#080d21] bg-[#9cff48] text-[#080d21] shadow-[4px_4px_0_#080d21]"
                      : "border-[#d5deea] bg-white/80 hover:border-[#080d21]/60",
                  )}
                  type="button"
                  onClick={() => setHorizon(choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="h-12 rounded-[14px] border-2 border-[#080d21] bg-transparent px-6 text-sm font-black uppercase text-[#080d21]"
                type="button"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#080d21] px-6 text-sm font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={horizon === null}
                type="button"
                onClick={() => setStep(3)}
              >
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-6">
            <div>
              <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight">
                How would you feel if your investments dropped about 15%?
              </h1>
              <p className="mt-3 text-base font-extrabold leading-relaxed text-[#34435c]">
                Markets move. Your honest gut reaction helps us avoid strategies that would keep you up at night.
              </p>
            </div>
            <div className="grid gap-3">
              {dipChoices.map((choice) => (
                <button
                  key={choice.value}
                  className={cn(
                    "rounded-[14px] border-2 px-4 py-4 text-left text-sm font-extrabold leading-snug transition-colors sm:text-base",
                    dipReaction !== null && dipReaction === choice.value
                      ? "border-[#080d21] bg-[#9cff48] text-[#080d21] shadow-[4px_4px_0_#080d21]"
                      : "border-[#d5deea] bg-white/80 hover:border-[#080d21]/60",
                  )}
                  type="button"
                  onClick={() => setDipReaction(choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="h-12 rounded-[14px] border-2 border-[#080d21] bg-transparent px-6 text-sm font-black uppercase text-[#080d21]"
                type="button"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#080d21] px-6 text-sm font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={dipReaction === null}
                type="button"
                onClick={() => setStep(4)}
              >
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 && goal !== null && horizon !== null && dipReaction !== null && profile !== null ? (
          <section className="space-y-6">
            <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight">Here&apos;s how we&apos;ll start with you</h1>
            <div className="rounded-[18px] border-2 border-[#080d21] bg-white p-6 shadow-[6px_6px_0_#080d21]">
              <dl className="grid gap-4 text-base font-extrabold text-[#34435c]">
                <div>
                  <dt className="text-xs font-black uppercase text-[#687792]">Goal</dt>
                  <dd className="mt-1 text-[#080d21]">{displayGoal(goal, goalOther)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase text-[#687792]">Time horizon</dt>
                  <dd className="mt-1 text-[#080d21]">{horizon}</dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase text-[#687792]">If markets dipped ~15%</dt>
                  <dd className="mt-1 text-[#080d21]">{dipSummaryLabel(dipReaction)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase text-[#687792]">Starting posture</dt>
                  <dd className="mt-1 text-[#080d21]">
                    <span className="font-black">{postureDescription(profile).label}.</span>{" "}
                    {postureDescription(profile).rest}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="h-12 rounded-[14px] border-2 border-[#080d21] bg-transparent px-6 text-sm font-black uppercase text-[#080d21]"
                type="button"
                onClick={() => setStep(3)}
              >
                Back
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#080d21] px-6 text-sm font-black uppercase text-white"
                type="button"
                onClick={finish}
              >
                Go to dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
