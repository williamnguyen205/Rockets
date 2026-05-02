import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  LayoutDashboard,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { markGettingStartedGuideSeen } from "@/lib/gettingStartedGuide"

type GuideStep = {
  title: string
  eyebrow: string
  copy: string
  bullets: string[]
  icon: typeof LayoutDashboard
  action?: { label: string; to: string }
}

const guideSteps: GuideStep[] = [
  {
    eyebrow: "How to use Clarity",
    title: "Start with your dashboard.",
    copy:
      "The dashboard is your calm home base. It shows how much is invested, how much is cash, and whether your mix still fits your goal.",
    bullets: [
      "Plan Fit Score checks whether your setup matches your goal, timeline, and comfort with risk.",
      "Allocation shows stocks, funds, and cash in plain language.",
      "Current vs target shows what changed without making you read market jargon.",
    ],
    icon: LayoutDashboard,
    action: { label: "Open dashboard", to: "/dashboard" },
  },
  {
    eyebrow: "Quick investing lesson",
    title: "Investing is a plan, not a guess.",
    copy:
      "For beginners, the goal is usually to build a diversified habit over time instead of trying to predict tomorrow's winner.",
    bullets: [
      "Keep cash for near-term needs before taking market risk.",
      "Use diversified funds to avoid depending on one company.",
      "Invest consistently when the timeline is long enough.",
    ],
    icon: ShieldCheck,
    action: { label: "Learn basics", to: "/learn" },
  },
  {
    eyebrow: "Research safely",
    title: "Use Stocks to inspect before buying.",
    copy:
      "The Stocks tab lets you search tickers, compare movement, and add practice positions. Beginner fund cards show fees and plain-English risk.",
    bullets: [
      "A stock is one company, so it can swing more.",
      "A fund or ETF is a basket, so risk is more spread out.",
      "Fees matter because they quietly reduce returns over time.",
    ],
    icon: Search,
    action: { label: "Search tickers", to: "/stocks" },
  },
  {
    eyebrow: "Practice decisions",
    title: "Run scenarios before reacting.",
    copy:
      "To prepare for when markets get scary, the Scenarios tab turns a what-if into a reviewable plan with costs, tax awareness, and what could go wrong.",
    bullets: [
      "Review the reason before any simulated rebalance.",
      "Compare before and after allocation.",
      "Use the AI simulation for extra plain-English context.",
    ],
    icon: FlaskConical,
    action: { label: "Try scenarios", to: "/scenarios" },
  },
]

export function GettingStartedGuide({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = guideSteps[stepIndex]
  const Icon = step.icon
  const isLastStep = stepIndex === guideSteps.length - 1
  const progressLabel = useMemo(() => `${stepIndex + 1} of ${guideSteps.length}`, [stepIndex])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        markGettingStartedGuideSeen()
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  function closeGuide() {
    markGettingStartedGuideSeen()
    onOpenChange(false)
  }

  function goNext() {
    if (!isLastStep) {
      setStepIndex((current) => current + 1)
      return
    }
    closeGuide()
  }

  return (
    <>
      <button
        aria-label="Close getting started guide"
        className="fixed inset-0 z-[110] border-0 bg-background/70 backdrop-blur-[2px]"
        type="button"
        onClick={closeGuide}
      />
      <div
        aria-labelledby="getting-started-title"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[120] w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-primary">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Getting started</p>
              <p className="text-sm font-semibold text-foreground">{progressLabel}</p>
            </div>
          </div>
          <Button aria-label="Close guide" className="h-9 w-9" size="icon" type="button" variant="ghost" onClick={closeGuide}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-primary/25 bg-primary/5 text-primary">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-primary">{step.eyebrow}</p>
            <h2 id="getting-started-title" className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
              {step.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.copy}</p>
            <div className="mt-5 grid gap-2">
              {step.bullets.map((bullet) => (
                <div key={bullet} className="flex gap-2 rounded-md border border-border bg-muted/35 px-3 py-2 text-sm leading-6 text-foreground">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {guideSteps.map((item, index) => (
              <button
                key={item.title}
                aria-label={`Go to guide step ${index + 1}`}
                className={`h-2.5 rounded-full transition-all ${index === stepIndex ? "w-7 bg-primary" : "w-2.5 bg-muted"}`}
                type="button"
                onClick={() => setStepIndex(index)}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {step.action ? (
              <Button asChild type="button" variant="secondary" onClick={closeGuide}>
                <Link to={step.action.to}>{step.action.label}</Link>
              </Button>
            ) : null}
            <Button type="button" onClick={goNext}>
              {isLastStep ? "Finish guide" : "Next"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
