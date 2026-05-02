import { useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Compass,
  HeartPulse,
  Sparkles,
  Wallet,
} from "lucide-react"
import { ClarityLogo } from "@/components/ClarityLogo"
import {
  usePortfolioStore,
  type InvestmentTimeline,
  type InvestorProfile,
} from "@/store/portfolio"
import { endSession, getAuthEntry } from "@/lib/session"
import { cn } from "@/lib/utils"

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
  { label: "A big purchase (car, wedding, education)", value: "Big purchase" },
  { label: "Other / not sure yet", value: "Exploring" },
]

const contributionChips: ContributionChip[] = [
  { label: "$0", value: 0 },
  { label: "$50", value: 50 },
  { label: "$200", value: 200 },
  { label: "$500", value: 500 },
  { label: "$1,000", value: 1000 },
]

const stepIcons = [CalendarClock, HeartPulse, Compass, Wallet, Sparkles] as const

const stepTitles = [
  "When do you think you'll need this money?",
  "How would you feel if your investments dropped 20% in a single month?",
  "What are you mainly investing for?",
  "How much can you set aside each month?",
  "Here's the plan we'll start with.",
]

const stepHints = [
  "There are no wrong answers - this just shapes how cautious or growth-leaning your default plan is.",
  "Be honest with yourself. Your gut reaction tells us how much price drama you can sit through.",
  "We use this to give your dashboard, scenarios, and tutor the right context.",
  "Even small amounts add up. Pick what feels comfortable - you can change it any time.",
  "You can tweak any of this later from the Account or Scenarios pages.",
]

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-2.5 rounded-full border-2 border-[#080d21] transition-all",
            index === step ? "w-8 bg-[#080d21]" : "w-2.5 bg-white",
            index < step && "bg-[#9cff48]",
          )}
        />
      ))}
    </div>
  )
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      className={cn(
        "group flex w-full items-start gap-3 rounded-[16px] border-2 border-[#080d21] bg-white px-4 py-3 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#96ff4c]",
        selected && "bg-[#080d21] text-white",
      )}
      type="button"
      onClick={onClick}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#080d21] bg-white transition-colors",
          selected && "bg-[#9cff48]",
        )}
      >
        {selected ? <Check className="h-3 w-3 text-[#080d21]" aria-hidden="true" /> : null}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  )
}

type OnboardingLocationState = {
  retake?: boolean
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
  const [contributionInput, setContributionInput] = useState<string>(
    storedMonthly ? String(storedMonthly) : "",
  )

  const totalSteps = 5
  const StepIcon = stepIcons[step]
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

  const goalLabel =
    goalOptions.find((option) => option.value === goal)?.label ?? "Wealth growth"
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
    <div className="min-h-screen bg-[#f4eddf] px-5 py-4 text-[#080d21] sm:px-8">
      <header className="mx-auto flex max-w-[760px] items-center justify-between border-b-2 border-[#080d21] pb-4">
        <Link className="w-[180px] sm:w-[240px]" to="/" aria-label="Clarity home">
          <ClarityLogo showTagline />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase text-[#687792]">
            Step {step + 1} of {totalSteps}
          </span>
          <ProgressDots step={step} total={totalSteps} />
        </div>
      </header>

      <main className="mx-auto max-w-[760px] pb-12 pt-8 sm:pt-12">
        <div className="relative">
          <div className="absolute left-3 top-4 h-full w-full rounded-[26px] bg-[#0a1329]" />
          <div className="relative space-y-6 rounded-[26px] border-2 border-[#080d21] bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#080d21] bg-[#9cff48] text-[#080d21]">
                <StepIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-[#687792]">
                  Guided setup
                </p>
                <h1 className="mt-1 text-2xl font-black leading-tight text-[#080d21] sm:text-3xl">
                  {stepTitles[step]}
                </h1>
              </div>
            </div>

            <p className="text-sm font-bold leading-relaxed text-[#34435c] sm:text-base">
              {stepHints[step]}
            </p>

            {step === 0 ? (
              <div className="grid gap-3">
                {timelineOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    selected={timeline === option.value}
                    onClick={() => setTimeline(option.value)}
                  >
                    <span className="text-base font-black">{option.label}</span>
                  </OptionButton>
                ))}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-3">
                {profileOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    selected={profile === option.value}
                    onClick={() => setProfile(option.value)}
                  >
                    <span className="block text-base font-black">{option.label}</span>
                    <span
                      className={cn(
                        "mt-1 block text-sm font-bold",
                        profile === option.value ? "text-white/80" : "text-[#5a6b88]",
                      )}
                    >
                      {option.blurb}
                    </span>
                  </OptionButton>
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-3">
                {goalOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    selected={goal === option.value}
                    onClick={() => setGoal(option.value)}
                  >
                    <span className="text-base font-black">{option.label}</span>
                  </OptionButton>
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
                        "rounded-full border-2 border-[#080d21] px-4 py-2 text-sm font-black transition-colors",
                        monthlyContribution === chip.value
                          ? "bg-[#080d21] text-white"
                          : "bg-white text-[#080d21] hover:bg-[#f4eddf]",
                      )}
                      type="button"
                      onClick={() => pickContribution(chip.value)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="text-xs font-black uppercase text-[#687792]">
                    Or enter a custom monthly amount
                  </span>
                  <span className="mt-2 flex h-12 items-center gap-3 rounded-[14px] border-2 border-[#d5deea] bg-white px-4 transition-colors focus-within:border-[#080d21] focus-within:ring-4 focus-within:ring-[#96ff4c]/30">
                    <span className="text-base font-black text-[#6a7891]">$</span>
                    <input
                      className="min-w-0 flex-1 bg-transparent text-base font-extrabold text-[#080d21] outline-none placeholder:text-[#9aa9be]"
                      inputMode="numeric"
                      placeholder="0"
                      type="number"
                      min={0}
                      value={contributionInput}
                      onChange={(event) => handleContributionInput(event.target.value)}
                    />
                    <span className="text-xs font-black uppercase text-[#6a7891]">/ month</span>
                  </span>
                </label>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5">
                <div className="rounded-[18px] border-2 border-[#080d21] bg-[#fbf6ec] p-5">
                  <p className="text-sm font-extrabold leading-relaxed text-[#243149]">
                    We'll set up a <span className="font-black text-[#080d21]">{profile}</span> plan
                    aimed at{" "}
                    <span className="font-black text-[#080d21]">{goalLabel.toLowerCase()}</span>{" "}
                    over a{" "}
                    <span className="font-black text-[#080d21]">{timeline.toLowerCase()}</span>{" "}
                    timeline, with about{" "}
                    <span className="font-black text-[#080d21]">
                      ${monthlyContribution.toLocaleString()}/month
                    </span>{" "}
                    in contributions.
                  </p>
                  {profileBlurb ? (
                    <p className="mt-3 text-sm font-bold leading-relaxed text-[#5a6b88]">
                      {profileBlurb}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ["Profile", profile],
                    ["Timeline", timeline],
                    ["Goal", goalLabel],
                    ["Monthly", `$${monthlyContribution.toLocaleString()}`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-[14px] border-2 border-[#dfe7f0] bg-white px-4 py-3"
                    >
                      <span className="text-xs font-black uppercase text-[#687792]">{label}</span>
                      <span className="text-sm font-black text-[#080d21]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t-2 border-[#080d21]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="flex h-11 items-center justify-center gap-2 rounded-[14px] border-2 border-[#080d21] bg-white px-5 text-sm font-black uppercase text-[#080d21] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#96ff4c]"
                type="button"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {backLabel}
              </button>
              {step < totalSteps - 1 ? (
                <button
                  className="flex h-12 items-center justify-center gap-3 rounded-[14px] bg-[#080d21] px-6 text-base font-black uppercase text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#96ff4c]"
                  type="button"
                  onClick={goNext}
                >
                  Continue
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="flex h-12 items-center justify-center gap-3 rounded-[14px] bg-[#080d21] px-6 text-base font-black uppercase text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#96ff4c]"
                  type="button"
                  onClick={finish}
                >
                  Start using Clarity
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
