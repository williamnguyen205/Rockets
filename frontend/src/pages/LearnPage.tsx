import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  GraduationCap,
  Send,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { askLearnQuestion, type LearnAnswer } from "@/lib/api"
import { cn } from "@/lib/utils"

const PROGRESS_STORAGE_KEY = "clarity:learn-progress"

type Lesson = {
  id: string
  title: string
  explanation: string
  takeaway: string
  example: string
}

type Module = {
  id: string
  title: string
  lessons: Lesson[]
}

const curriculum: Module[] = [
  {
    id: "money-shrink",
    title: "Why Does Money Shrink?",
    lessons: [
      {
        id: "inflation",
        title: "What is inflation?",
        explanation:
          "Inflation means prices rise over time, so each dollar buys a little less than it used to.",
        takeaway: "Cash can feel safe, but inflation quietly reduces its buying power.",
        example:
          "If groceries cost $100 today and inflation is 3%, similar groceries may cost about $103 next year.",
      },
      {
        id: "investing",
        title: "What is investing?",
        explanation:
          "Investing means putting money into assets that may grow, pay income, or both over time.",
        takeaway: "Investing is about giving money a chance to outpace inflation.",
        example:
          "Buying a diversified fund gives you a small slice of many companies instead of leaving everything in cash.",
      },
      {
        id: "start-now",
        title: "Why start now?",
        explanation:
          "Starting earlier gives your money more time to grow and recover from market ups and downs.",
        takeaway: "Time can matter more than starting with a large amount.",
        example:
          "A small monthly contribution in your 20s can have decades to compound before retirement.",
      },
    ],
  },
  {
    id: "what-can-i-buy",
    title: "What Can I Actually Buy?",
    lessons: [
      {
        id: "stock",
        title: "What is a stock?",
        explanation:
          "A stock is a small ownership share in a company. Its price can move as the company and market expectations change.",
        takeaway: "Stocks can offer growth, but they can also swing sharply in value.",
        example: "Owning Apple stock means owning a tiny piece of Apple as a business.",
      },
      {
        id: "bond",
        title: "What is a bond?",
        explanation:
          "A bond is like lending money to a company or government in exchange for interest payments.",
        takeaway: "Bonds are often used to add stability, though they still have risk.",
        example:
          "A government bond may pay interest over time and return principal when it matures.",
      },
      {
        id: "mutual-fund",
        title: "What is a mutual fund?",
        explanation:
          "A mutual fund pools money from many investors to buy a basket of stocks, bonds, or other assets.",
        takeaway: "Mutual funds make diversification easier with one purchase.",
        example:
          "A target-date mutual fund may hold stocks and bonds in a mix that changes over time.",
      },
      {
        id: "etf",
        title: "What is an ETF?",
        explanation:
          "An ETF is a basket of investments that trades on an exchange like a stock.",
        takeaway: "ETFs can be low-cost, diversified, and easy to buy or sell during market hours.",
        example:
          "An S&P 500 ETF gives exposure to hundreds of large U.S. companies in one holding.",
      },
    ],
  },
  {
    id: "risk",
    title: "How Much Risk Can You Handle?",
    lessons: [
      {
        id: "what-is-risk",
        title: "What is risk?",
        explanation:
          "Risk is the chance your investment outcome is different from what you expected, especially in the short term.",
        takeaway: "Risk is not always bad, but you need enough patience and comfort to handle it.",
        example:
          "A stock fund might drop during a bad market, even if its long-term trend has been positive.",
      },
      {
        id: "time-superpower",
        title: "Time is your superpower",
        explanation:
          "The longer your timeline, the more room you may have to ride through market volatility.",
        takeaway: "Longer timelines can make growth assets easier to tolerate.",
        example:
          "Money needed next year may belong in safer assets than money intended for retirement decades away.",
      },
      {
        id: "sleep-test",
        title: "The sleep test",
        explanation:
          "The sleep test asks whether your portfolio risk would keep you anxious during a market drop.",
        takeaway: "A good portfolio is one you can stick with when markets get noisy.",
        example:
          "If a 20% drop would make you panic sell, your portfolio may be too aggressive.",
      },
    ],
  },
  {
    id: "diversification",
    title: "Don't Put It All In One Place",
    lessons: [
      {
        id: "what-is-diversification",
        title: "What is diversification?",
        explanation:
          "Diversification means spreading money across many investments so one bad outcome has less power.",
        takeaway: "Diversification helps reduce dependence on a single company, sector, or asset type.",
        example:
          "Owning a broad fund is usually more diversified than owning one tech stock.",
      },
      {
        id: "asset-allocation",
        title: "What is asset allocation?",
        explanation:
          "Asset allocation is how you divide money across asset types like stocks, bonds, and cash.",
        takeaway: "Allocation is one of the biggest drivers of portfolio risk and return.",
        example:
          "A 70/20/10 mix means 70% stocks, 20% bonds, and 10% cash.",
      },
      {
        id: "rebalancing",
        title: "What is rebalancing?",
        explanation:
          "Rebalancing means adjusting your portfolio back to its target mix after markets move.",
        takeaway: "Rebalancing keeps risk from drifting too far away from your plan.",
        example:
          "If stocks grow from 60% to 75% of your portfolio, rebalancing may bring them back toward 60%.",
      },
    ],
  },
  {
    id: "start",
    title: "How Do I Actually Start?",
    lessons: [
      {
        id: "start-small",
        title: "Start small",
        explanation:
          "Starting small means building the habit before worrying about having the perfect amount.",
        takeaway: "Consistency beats waiting for the perfect moment.",
        example:
          "Investing $25 a week can help you learn the process while keeping stakes manageable.",
      },
      {
        id: "dca",
        title: "Dollar cost averaging",
        explanation:
          "Dollar cost averaging means investing a fixed amount on a regular schedule.",
        takeaway: "It reduces the pressure to guess the perfect time to invest.",
        example:
          "Putting $100 into a fund every month buys more shares when prices are lower and fewer when prices are higher.",
      },
      {
        id: "account-type",
        title: "Picking an account type",
        explanation:
          "The account you use affects taxes, access, and what the money is best suited for.",
        takeaway: "The right account depends on your goal, timeline, and flexibility needs.",
        example:
          "A retirement account may offer tax advantages, while a taxable brokerage account is more flexible.",
      },
    ],
  },
  {
    id: "looking-at",
    title: "Understanding What You're Looking At",
    lessons: [
      {
        id: "stock-price",
        title: "What is a stock price?",
        explanation:
          "A stock price is what buyers and sellers currently agree one share is worth in the market.",
        takeaway: "Price alone does not tell you whether a company is cheap or expensive.",
        example:
          "A $20 stock is not automatically cheaper than a $200 stock without comparing business size and earnings.",
      },
      {
        id: "percent-change",
        title: "What is % change?",
        explanation:
          "Percent change shows how much something moved relative to where it started.",
        takeaway: "Percent change makes moves easier to compare across different prices.",
        example:
          "A $2 move on a $20 stock is 10%, but a $2 move on a $200 stock is only 1%.",
      },
      {
        id: "market-cap",
        title: "What is market cap?",
        explanation:
          "Market cap is the total market value of a company, calculated as share price times shares outstanding.",
        takeaway: "Market cap helps compare company size better than stock price alone.",
        example:
          "A company with 1 billion shares at $50 per share has a $50 billion market cap.",
      },
    ],
  },
]

const allLessons = curriculum.flatMap((module) =>
  module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id, moduleTitle: module.title })),
)

function readSavedProgress() {
  if (typeof window === "undefined") return new Set<string>()

  try {
    const saved = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
    const parsed = saved ? (JSON.parse(saved) as string[]) : []
    return new Set(parsed)
  } catch {
    return new Set<string>()
  }
}

export function LearnPage() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<LearnAnswer | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => readSavedProgress())
  const [openModuleId, setOpenModuleId] = useState(curriculum[0].id)
  const [selectedLessonId, setSelectedLessonId] = useState(allLessons[0].id)

  const nextLesson = useMemo(
    () => allLessons.find((lesson) => !completedLessons.has(lesson.id)) ?? allLessons[0],
    [completedLessons],
  )

  const selectedLesson =
    allLessons.find((lesson) => lesson.id === selectedLessonId) ?? nextLesson

  const completedCount = completedLessons.size
  const progressPercent = Math.round((completedCount / allLessons.length) * 100)

  useEffect(() => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify(Array.from(completedLessons)),
    )
  }, [completedLessons])

  async function handleAskClarity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      setError("Ask a question first, even a short one.")
      setAnswer(null)
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await askLearnQuestion(trimmedQuestion, {
        moduleTitle: selectedLesson.moduleTitle,
        lessonTitle: selectedLesson.title,
      })
      setAnswer(response)
    } catch (err) {
      setAnswer(null)
      setError(
        err instanceof Error
          ? err.message
          : "Clarity AI is unavailable right now. Make sure the backend and Ollama are running.",
      )
    } finally {
      setLoading(false)
    }
  }

  function toggleLessonComplete(lessonId: string) {
    setCompletedLessons((current) => {
      const next = new Set(current)
      if (next.has(lessonId)) {
        next.delete(lessonId)
      } else {
        next.add(lessonId)
      }
      return next
    })
  }

  function selectLesson(moduleId: string, lessonId: string) {
    setOpenModuleId(moduleId)
    setSelectedLessonId(lessonId)
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-primary">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          Beginner investor course
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-white">Learn in the right order.</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          A guided path through the basics, with every lesson open whenever curiosity pulls you somewhere else.
        </p>
      </section>

      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Course progress</p>
              <p className="mt-2 text-4xl font-semibold tracking-normal text-white">{progressPercent}%</p>
            </div>
            <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              Next: {nextLesson.title}
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {completedCount} of {allLessons.length} lessons completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current lesson</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{selectedLesson.moduleTitle}</Badge>
            {selectedLesson.id === nextLesson.id ? <Badge>Recommended next</Badge> : null}
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-normal text-white">{selectedLesson.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedLesson.explanation}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-primary">Takeaway</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedLesson.takeaway}</p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-primary">Example</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedLesson.example}</p>
            </div>
          </div>
          <Button type="button" onClick={() => toggleLessonComplete(selectedLesson.id)}>
            {completedLessons.has(selectedLesson.id) ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Completed
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" aria-hidden="true" />
                Mark complete
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            Ask Clarity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/[0.08] p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary">Asking about</p>
            <p className="mt-1 text-sm font-semibold text-white">{selectedLesson.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedLesson.moduleTitle}</p>
          </div>
          <form className="space-y-3" onSubmit={handleAskClarity}>
            <textarea
              className="min-h-28 w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder={`Ask about ${selectedLesson.title.toLowerCase()}...`}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-muted-foreground">
                Educational answers only. Clarity will avoid personalized buy or sell advice.
              </p>
              <Button disabled={loading} type="submit">
                {loading ? "Thinking..." : "Ask"}
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </form>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-white">Clarity AI is unavailable</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{error}</p>
            </div>
          ) : null}

          {answer ? (
            <div className="grid gap-3">
              {[
                ["Answer", answer.answer],
                ["Key takeaway", answer.takeaway],
                ["Example", answer.example],
              ].map(([label, copy]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-normal text-primary">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal text-white">Learning plan</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Follow the highlighted next lesson, or open any module when you want to jump around.
          </p>
        </div>

        {curriculum.map((module, moduleIndex) => {
          const isOpen = openModuleId === module.id
          const moduleCompleted = module.lessons.filter((lesson) => completedLessons.has(lesson.id)).length

          return (
            <Card key={module.id}>
              <button
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
                type="button"
                onClick={() => setOpenModuleId(isOpen ? "" : module.id)}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-primary">
                    Module {moduleIndex + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{module.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {moduleCompleted} of {module.lessons.length} lessons completed
                  </p>
                </div>
                <ChevronDown
                  className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>

              {isOpen ? (
                <CardContent className="space-y-3">
                  {module.lessons.map((lesson) => {
                    const completed = completedLessons.has(lesson.id)
                    const selected = selectedLesson.id === lesson.id
                    const recommended = nextLesson.id === lesson.id

                    return (
                      <div
                        key={lesson.id}
                        className={cn(
                          "rounded-lg border bg-white/[0.035] p-4 transition-colors",
                          selected ? "border-primary/50" : "border-white/[0.08]",
                          recommended && "bg-primary/[0.08]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <button
                            className="flex flex-1 gap-3 text-left"
                            type="button"
                            onClick={() => selectLesson(module.id, lesson.id)}
                          >
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                              {completed ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                              ) : (
                                <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                              )}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-white">{lesson.title}</p>
                                {recommended ? <Badge>Next</Badge> : null}
                              </div>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{lesson.takeaway}</p>
                            </div>
                          </button>
                          <Button
                            size="sm"
                            type="button"
                            variant={completed ? "secondary" : "ghost"}
                            onClick={() => toggleLessonComplete(lesson.id)}
                          >
                            {completed ? "Done" : "Mark"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              ) : null}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
