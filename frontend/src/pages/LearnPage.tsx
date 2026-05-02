import { BookOpen, CheckCircle2, Clock, GraduationCap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const lessons = [
  {
    title: "Why allocation matters more than stock picking",
    tag: "Foundations",
    time: "7 min",
    done: true,
  },
  {
    title: "How mutual funds can reduce decision fatigue",
    tag: "Mutual funds",
    time: "5 min",
    done: false,
  },
  {
    title: "Cash reserves without slowing growth too much",
    tag: "Risk",
    time: "6 min",
    done: false,
  },
]

export function LearnPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-primary">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          Beginner investor mode
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-white">Learn just enough to decide.</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Short lessons mapped to the choices inside your portfolio, so investing starts feeling less mysterious.
        </p>
      </section>

      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-0">
          <div className="border-b border-white/[0.08] bg-primary/[0.08] p-6">
            <BookOpen className="h-8 w-8 text-primary" aria-hidden="true" />
            <h2 className="mt-8 text-2xl font-semibold tracking-normal text-white">Today&apos;s concept</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Diversification means spreading your money across different companies and assets, so one disappointing result does not control the entire plan.
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/[0.08]">
            {["Risk", "Fees", "Time"].map((item) => (
              <div key={item} className="p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">Focus</p>
                <p className="mt-1 text-sm font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended lessons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.title}
              className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4 transition-colors hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                    {lesson.done ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{lesson.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline">{lesson.tag}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {lesson.time}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
