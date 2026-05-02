import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  const [selectedLessonId, setSelectedLessonId] = useState(allLessons[0].id)

  const nextLesson = useMemo(
    () => allLessons.find((lesson) => !completedLessons.has(lesson.id)) ?? allLessons[0],
    [completedLessons],
  )

  const selectedLesson =
    allLessons.find((lesson) => lesson.id === selectedLessonId) ?? nextLesson

  const completedCount = completedLessons.size
  const progressPercent = Math.round((completedCount / allLessons.length) * 100)
  const selectedLessonIndex = allLessons.findIndex((lesson) => lesson.id === selectedLesson.id)
  const previousLesson = selectedLessonIndex > 0 ? allLessons[selectedLessonIndex - 1] : null
  const followingLesson =
    selectedLessonIndex >= 0 && selectedLessonIndex < allLessons.length - 1
      ? allLessons[selectedLessonIndex + 1]
      : null

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

  function selectLesson(lessonId: string) {
    setSelectedLessonId(lessonId)
  }

  function selectFlattenedLesson(lesson: typeof allLessons[number] | null) {
    if (!lesson) return
    selectLesson(lesson.id)
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-primary">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                Beginner investor course
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal text-foreground">Learn the basics with Clarity</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                One clear next step, short lessons, and a tutor when you want plain-English help.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/70 p-4 sm:min-w-44">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Progress</p>
              <p className="mt-2 text-4xl font-semibold tracking-normal text-foreground">{progressPercent}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {completedCount} of {allLessons.length} lessons
              </p>
            </div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full border border-border bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mt-5 rounded-xl border border-primary bg-muted/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary">Continue learning</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{nextLesson.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{nextLesson.moduleTitle}</p>
              </div>
              <Button type="button" onClick={() => selectFlattenedLesson(nextLesson)}>
                Continue
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Current lesson</CardTitle>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{selectedLesson.moduleTitle}</Badge>
              {selectedLesson.id === nextLesson.id ? <Badge>Recommended next</Badge> : null}
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
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal text-foreground">{selectedLesson.title}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{selectedLesson.explanation}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-primary">Takeaway</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedLesson.takeaway}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-primary">Example</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedLesson.example}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-foreground">Ask Clarity about this lesson</h3>
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleAskClarity}>
              <textarea
                className="min-h-20 w-full resize-none rounded-xl border border-border bg-muted/55 px-4 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
                placeholder={`Ask about ${selectedLesson.title.toLowerCase()}...`}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-muted-foreground">
                  Context: {selectedLesson.moduleTitle} / {selectedLesson.title}
                </p>
                <Button disabled={loading} type="submit">
                  {loading ? "Thinking..." : "Ask"}
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </form>

            {error ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm font-semibold text-foreground">Clarity AI is unavailable</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{error}</p>
              </div>
            ) : null}

            {answer ? (
              <div className="mt-4 grid gap-3">
                {[
                  ["Answer", answer.answer],
                  ["Key takeaway", answer.takeaway],
                  ["Example", answer.example],
                ].map(([label, copy]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-white p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-normal text-primary">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
            <Button
              disabled={!previousLesson}
              type="button"
              variant="ghost"
              onClick={() => selectFlattenedLesson(previousLesson)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              disabled={!followingLesson}
              type="button"
              variant="secondary"
              onClick={() => selectFlattenedLesson(followingLesson)}
            >
              Next lesson
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal text-foreground">Browse the course</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick any lesson, or follow the highlighted next step.
          </p>
        </div>

        <div className="space-y-3">
          {curriculum.map((module, moduleIndex) => {
            const moduleCompleted = module.lessons.filter((lesson) => completedLessons.has(lesson.id)).length

            return (
              <Card key={module.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-normal text-primary">
                        Module {moduleIndex + 1}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">{module.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {moduleCompleted} of {module.lessons.length} complete
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {module.lessons.map((lesson) => {
                      const completed = completedLessons.has(lesson.id)
                      const selected = selectedLesson.id === lesson.id
                      const recommended = nextLesson.id === lesson.id

                      return (
                        <button
                          key={lesson.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                            selected
                              ? "border-primary/60 bg-primary/[0.10]"
                              : "border-border bg-white hover:bg-muted",
                            recommended && !selected && "border-primary/30 bg-primary/[0.06]",
                          )}
                          type="button"
                          onClick={() => selectLesson(lesson.id)}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                            {completed ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{lesson.title}</span>
                              {recommended ? <Badge>Next</Badge> : null}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
