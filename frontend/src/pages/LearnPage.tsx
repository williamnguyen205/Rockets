import { useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react"
import { ClarityChatBlock } from "@/components/ClarityChatBlock"
import { useClarityTutor } from "@/components/ClarityTutorContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

type LessonDeepDive = {
  notes: string[]
  useInClarity: string
  watchOut: string
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

const lessonDeepDives: Record<string, LessonDeepDive> = {
  inflation: {
    notes: [
      "Inflation matters because cash does not need to lose dollars to lose power. If prices rise while your cash sits still, the same balance buys less later.",
      "This does not mean all cash is bad. Cash is useful for bills, emergencies, and money you need soon. The problem is keeping long-term money idle for years without a reason.",
      "Investing is one way people try to keep up with rising prices, but it comes with ups and downs. The right balance depends on when you need the money.",
    ],
    useInClarity:
      "Run the inflation scenario and compare how much cash you hold versus your target cash amount.",
    watchOut:
      "Do not treat inflation as a reason to invest emergency money. Money needed soon should stay easier to access.",
  },
  investing: {
    notes: [
      "Investing means accepting some uncertainty today for the chance of growth over time. The reward is not guaranteed, but historically diversified portfolios have helped people build wealth.",
      "Beginners often think investing means picking the next big stock. A calmer starting point is owning broad funds, adding regularly, and keeping risk matched to your timeline.",
      "A good investment plan should answer: what is this money for, when do I need it, and how much volatility can I handle?",
    ],
    useInClarity:
      "Use onboarding to set your goal and timeline, then check whether your dashboard mix matches that plan.",
    watchOut:
      "Do not confuse investing with gambling on one exciting ticker. Concentration can make losses much sharper.",
  },
  "start-now": {
    notes: [
      "Time helps because returns can compound. Compounding means future growth can happen on both your original money and earlier gains.",
      "Starting small also teaches behavior. You learn how prices move, how emotions feel, and how to stay consistent without risking too much at once.",
      "The goal is not to perfectly time the market. For beginners, building the habit often matters more than finding the perfect entry point.",
    ],
    useInClarity:
      "Set a monthly contribution and watch how projected paths respond when you change the amount.",
    watchOut:
      "Waiting until you feel like an expert can delay the habit for years. Start with education and practice first.",
  },
  stock: {
    notes: [
      "A stock is ownership in one company. If the company does well, the stock may rise. If expectations fall, the stock may drop quickly.",
      "Single stocks can be exciting because the upside can be large, but they also carry company-specific risk: bad earnings, lawsuits, leadership changes, or sector news.",
      "For beginners, individual stocks are usually easier to understand after you already know how much of your portfolio should be diversified funds and cash.",
    ],
    useInClarity:
      "Search a stock, read its risk assessment, then compare its size in your holdings against your total portfolio.",
    watchOut:
      "A familiar brand is not automatically a safe investment. Price can still be volatile.",
  },
  bond: {
    notes: [
      "A bond is a loan. You lend money to a government or company, and they usually pay interest over time.",
      "Bonds are often used to reduce portfolio swings, but they are not risk-free. Bond prices can fall when interest rates rise or when borrowers look less reliable.",
      "Many beginners get bond exposure through bond funds instead of buying individual bonds directly.",
    ],
    useInClarity:
      "Use bond-style funds as the steadier side of a practice portfolio when your timeline is shorter.",
    watchOut:
      "Do not assume bonds always go up when stocks go down. They can still lose value.",
  },
  "mutual-fund": {
    notes: [
      "A mutual fund pools money from many investors and buys a collection of investments. That collection can include stocks, bonds, or both.",
      "Funds help beginners diversify because one purchase can spread money across many holdings. This reduces dependence on one company.",
      "Funds charge fees. Even small yearly fees matter over long periods, so beginners should learn to compare expense ratios.",
    ],
    useInClarity:
      "Use the fund suggestions in Stocks to see fee and diversification notes before adding a practice fund.",
    watchOut:
      "A fund can still be risky if it only focuses on one narrow sector or strategy.",
  },
  etf: {
    notes: [
      "An ETF is a fund that trades during the day like a stock. Many ETFs are broad, low-cost, and easy to use in a beginner portfolio.",
      "The important question is what the ETF owns. A total-market ETF is very different from a narrow technology or crypto-related ETF.",
      "For beginners, broad ETFs can be a practical way to diversify while keeping the portfolio simple.",
    ],
    useInClarity:
      "Search VTI, VXUS, or BND and compare the fee, diversification note, and risk label.",
    watchOut:
      "Do not judge an ETF by price alone. Look at what it holds and what fee it charges.",
  },
  "what-is-risk": {
    notes: [
      "Risk is not just losing money. It is the chance your outcome differs from what you expected, especially over short periods.",
      "Single stocks tend to have more company-specific risk. Diversified funds spread risk across many investments, but they can still fall during broad market drops.",
      "The right amount of risk depends on your goal and timeline. Money needed soon usually deserves less volatility.",
    ],
    useInClarity:
      "Compare risk badges in your holdings and run a market-drop scenario to see how your plan responds.",
    watchOut:
      "High risk is not automatically bad, but it is dangerous when it does not match your timeline or temperament.",
  },
  "time-superpower": {
    notes: [
      "Longer timelines give investments more room to recover from bad periods. Short timelines leave less room for mistakes.",
      "If you need money in one year, a market drop can become a real problem. If you need money in 20 years, the same drop may be easier to ride out.",
      "Your timeline should influence your mix of stocks, funds, and cash.",
    ],
    useInClarity:
      "Change your timeline in Plan Fit Score and watch how target allocation guidance changes.",
    watchOut:
      "Do not use a long-term portfolio for short-term goals unless you can handle selling during a downturn.",
  },
  "sleep-test": {
    notes: [
      "The sleep test asks whether your portfolio would make you panic during a bad market week. If it would, the plan may be too aggressive.",
      "A portfolio only works if you can stick with it. The mathematically highest-return mix is not useful if it makes you sell at the worst time.",
      "Being honest about emotions is part of risk management, not a weakness.",
    ],
    useInClarity:
      "Use the market-drop scenario and ask whether the recommended plan feels manageable.",
    watchOut:
      "Do not choose an aggressive profile just because it sounds impressive. Choose what you can actually live with.",
  },
  "what-is-diversification": {
    notes: [
      "Diversification means spreading money so one mistake does not dominate your future. It can happen across companies, sectors, countries, and asset types.",
      "Owning ten tech stocks is not as diversified as it may look if they all move on the same news.",
      "Broad funds are a beginner-friendly shortcut because they can hold hundreds or thousands of investments.",
    ],
    useInClarity:
      "Check whether one holding is a large share of your portfolio and compare stocks versus funds in allocation.",
    watchOut:
      "Diversification reduces dependence on one outcome, but it does not prevent losses during a broad market downturn.",
  },
  "asset-allocation": {
    notes: [
      "Asset allocation is your portfolio recipe. It decides how much is in stocks, funds, bonds, and cash.",
      "Allocation matters because it drives much of the portfolio's behavior. More stocks usually means more growth potential and more volatility.",
      "A beginner plan should start with allocation before individual picks.",
    ],
    useInClarity:
      "Use Current vs target to see where your actual mix has drifted away from your selected profile.",
    watchOut:
      "Do not focus only on ticker choices while ignoring the total mix.",
  },
  rebalancing: {
    notes: [
      "Rebalancing means bringing your portfolio back toward its intended mix. It is a discipline for managing risk after prices move.",
      "If stocks rise a lot, they can become too much of your portfolio. If stocks fall, your portfolio may become more conservative than intended.",
      "Rebalancing does not predict the market. It keeps your plan from drifting without you noticing.",
    ],
    useInClarity:
      "Open Scenarios, choose a what-if, then review the before/after allocation and practice rebalance preview.",
    watchOut:
      "Rebalancing too often can create unnecessary trading, costs, and taxes in real accounts.",
  },
  "start-small": {
    notes: [
      "Starting small lowers the emotional pressure. You can learn how investing works while mistakes are still inexpensive.",
      "Small amounts also help you build consistency. A repeatable habit is easier to improve than a one-time guess.",
      "The first goal is not to be perfect. It is to become familiar with the process.",
    ],
    useInClarity:
      "Use a blank account, add practice cash, and make a small simulated buy from the Stocks page.",
    watchOut:
      "Do not wait until you have a huge amount before learning the basics.",
  },
  dca: {
    notes: [
      "Dollar cost averaging means investing a fixed amount on a schedule. It removes some pressure to guess the perfect day.",
      "When prices are lower, the same dollar amount buys more shares. When prices are higher, it buys fewer shares.",
      "This is a behavior strategy, not a guarantee. It helps with consistency and emotional control.",
    ],
    useInClarity:
      "Change monthly contribution and watch how projections respond over time.",
    watchOut:
      "Dollar cost averaging does not protect you from losses if the investment itself is too risky for your timeline.",
  },
  "account-type": {
    notes: [
      "Different accounts have different rules. Retirement accounts may offer tax benefits but can limit access. Taxable accounts may be more flexible but create taxable events.",
      "The account should match the goal. Retirement money, home money, and emergency money may belong in different places.",
      "Clarity does not choose a real account for you, but it reminds you when taxes and access matter.",
    ],
    useInClarity:
      "Read tax notes in the scenario review before applying any practice rebalance.",
    watchOut:
      "Do not ignore taxes when selling investments in a real brokerage account.",
  },
  "stock-price": {
    notes: [
      "A stock price is the current price for one share. It does not tell you the full value of the company by itself.",
      "A $20 stock can be more expensive than a $200 stock if the company has many more shares or weaker business results.",
      "Beginners should pair price with context like market cap, risk, and how much of the portfolio the position represents.",
    ],
    useInClarity:
      "Use ticker lookup to compare price, market cap, day range, and risk explanation together.",
    watchOut:
      "Do not buy a stock only because the share price looks cheap.",
  },
  "percent-change": {
    notes: [
      "Percent change shows movement relative to the starting price. It makes different stocks easier to compare.",
      "A $5 move is huge for a $20 stock but small for a $500 stock. Percent change solves that comparison problem.",
      "Large percent moves can signal volatility, especially for single stocks.",
    ],
    useInClarity:
      "Look at daily move in holdings and connect larger moves to higher single-stock risk.",
    watchOut:
      "One-day percent change is useful context, but it is not a full investing thesis.",
  },
  "market-cap": {
    notes: [
      "Market cap estimates the total market value of a company. It is share price multiplied by the number of shares.",
      "Large companies are often more established, but they can still be risky. Smaller companies may grow faster but can swing more sharply.",
      "Market cap is one input in Clarity's risk explanation, alongside volatility signals.",
    ],
    useInClarity:
      "Use market cap on the Stocks page to understand company size before adding a practice position.",
    watchOut:
      "Large does not always mean safe, and small does not always mean bad. Use it as context.",
  },
}

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
  const {
    setLearnContext,
    clearLearnContext,
    question,
    setQuestion,
    answer,
    error,
    loading,
    submitAsk,
  } = useClarityTutor()
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => readSavedProgress())
  const [selectedLessonId, setSelectedLessonId] = useState(allLessons[0].id)
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(
    () => new Set([allLessons[0].moduleId]),
  )

  const nextLesson = useMemo(
    () => allLessons.find((lesson) => !completedLessons.has(lesson.id)) ?? allLessons[0],
    [completedLessons],
  )

  const selectedLesson =
    allLessons.find((lesson) => lesson.id === selectedLessonId) ?? nextLesson
  const selectedDeepDive = lessonDeepDives[selectedLesson.id]

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

  useEffect(() => {
    setLearnContext({
      moduleTitle: selectedLesson.moduleTitle,
      lessonTitle: selectedLesson.title,
    })
  }, [selectedLesson.moduleTitle, selectedLesson.title, setLearnContext])

  useEffect(() => {
    return () => clearLearnContext()
  }, [clearLearnContext])

  function selectLesson(lessonId: string) {
    setSelectedLessonId(lessonId)
    const lesson = allLessons.find((item) => item.id === lessonId)
    if (lesson) {
      setExpandedModuleIds((current) => {
        const next = new Set(current)
        next.add(lesson.moduleId)
        return next
      })
    }
  }

  function selectFlattenedLesson(lesson: typeof allLessons[number] | null) {
    if (!lesson) return
    selectLesson(lesson.id)
  }

  function markCompleteAndGoNext() {
    if (!followingLesson) return
    setCompletedLessons((current) => {
      const next = new Set(current)
      next.add(selectedLesson.id)
      return next
    })
    selectLesson(followingLesson.id)
  }

  function toggleModuleExpanded(moduleId: string) {
    setExpandedModuleIds((current) => {
      const next = new Set(current)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  return (
    <div className="space-y-7">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                Beginner investor course
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                Build investor fluency one lesson at a time.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Short plain-English lessons, a visible next step, and a tutor that stays tied to what you are learning.
              </p>
            </div>
            <div className="rounded-md border border-border bg-card/90 p-4 shadow-sm sm:min-w-48">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Progress</p>
              <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">{progressPercent}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {completedCount} of {allLessons.length} lessons
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-md border border-border bg-card/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-primary">Continue learning</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{nextLesson.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{nextLesson.moduleTitle}</p>
              </div>
              <Button className="sm:self-end" type="button" onClick={() => selectFlattenedLesson(nextLesson)}>
                Continue
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/25 p-5 sm:p-6">
              <div>
                <CardTitle>Current lesson</CardTitle>
                <CardDescription className="mt-2">
                  Learn the idea, see why it matters, then ask a follow-up in plain English.
                </CardDescription>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{selectedLesson.moduleTitle}</Badge>
                  {selectedLesson.id === nextLesson.id ? <Badge>Recommended next</Badge> : null}
                  {completedLessons.has(selectedLesson.id) ? (
                    <Badge className="gap-1 text-primary" variant="outline">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Completed
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-primary">
                  Lesson {selectedLessonIndex + 1} of {allLessons.length}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                  {selectedLesson.title}
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                  {selectedLesson.explanation}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-border bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-primary">Main idea</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{selectedLesson.takeaway}</p>
                </div>
                <div className="rounded-md border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-primary">Example</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedLesson.example}</p>
                </div>
              </div>

              {selectedDeepDive ? (
                <div className="grid gap-4">
                  <div className="rounded-md border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-normal text-primary">Lesson notes</p>
                    <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                      {selectedDeepDive.notes.map((note) => (
                        <p key={note}>{note}</p>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-normal text-primary">Use this in Clarity</p>
                      <p className="mt-2 text-sm leading-6 text-foreground">{selectedDeepDive.useInClarity}</p>
                    </div>
                    <div className="rounded-md border border-amber-500/25 bg-amber-500/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-normal text-amber-700 dark:text-amber-300">Beginner trap</p>
                      <p className="mt-2 text-sm leading-6 text-foreground">{selectedDeepDive.watchOut}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-md border border-border bg-muted/25 p-4">
                <ClarityChatBlock
                  answer={answer}
                  error={error}
                  lessonTitle={selectedLesson.title}
                  loading={loading}
                  moduleTitle={selectedLesson.moduleTitle}
                  question={question}
                  onQuestionChange={setQuestion}
                  onSubmit={submitAsk}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
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
                  variant="default"
                  onClick={markCompleteAndGoNext}
                >
                  Next lesson
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside
          className="w-full shrink-0 space-y-3 lg:sticky lg:top-[112px]"
          aria-label="Course outline"
        >
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-normal text-foreground">Course</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Pick a module or jump to the next lesson.</p>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
                {completedCount}/{allLessons.length}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {curriculum.map((module, moduleIndex) => {
              const moduleCompleted = module.lessons.filter((lesson) =>
                completedLessons.has(lesson.id),
              ).length
              const expanded = expandedModuleIds.has(module.id)

              return (
                <div
                  key={module.id}
                  className={cn(
                    "overflow-hidden rounded-md border bg-card transition-colors",
                    expanded ? "border-primary/30" : "border-border",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60"
                    aria-expanded={expanded}
                    onClick={() => toggleModuleExpanded(module.id)}
                  >
                    <ChevronDown
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        expanded && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-[0.65rem] font-semibold uppercase tracking-normal text-primary">
                        Module {moduleIndex + 1}
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold leading-snug text-foreground">
                        {module.title}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[0.65rem] font-semibold tabular-nums text-muted-foreground">
                      {moduleCompleted}/{module.lessons.length}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="space-y-1 border-t border-border bg-muted/20 p-2">
                      {module.lessons.map((lesson) => {
                        const completed = completedLessons.has(lesson.id)
                        const selected = selectedLesson.id === lesson.id
                        const recommended = nextLesson.id === lesson.id

                        return (
                          <button
                            key={lesson.id}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md border px-2.5 py-2.5 text-left transition-colors",
                              selected
                                ? "border-primary/60 bg-primary/10 shadow-sm"
                                : "border-transparent bg-card hover:bg-muted",
                              recommended && !selected && "border-primary/25 bg-primary/5",
                            )}
                            type="button"
                            onClick={() => selectLesson(lesson.id)}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                              {completed ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                              ) : (
                                <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-semibold leading-snug text-foreground">
                                  {lesson.title}
                                </span>
                                {recommended ? (
                                  <Badge className="px-1.5 py-0 text-[0.65rem]">Next</Badge>
                                ) : null}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
