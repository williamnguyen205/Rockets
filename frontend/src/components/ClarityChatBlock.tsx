import { type FormEvent } from "react"
import { Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LearnAnswer } from "@/lib/api"

export type ClarityChatBlockProps = {
  moduleTitle: string
  lessonTitle: string
  question: string
  onQuestionChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  loading: boolean
  error: string
  answer: LearnAnswer | null
}

export function ClarityChatBlock({
  moduleTitle,
  lessonTitle,
  question,
  onQuestionChange,
  onSubmit,
  loading,
  error,
  answer,
}: ClarityChatBlockProps) {
  const placeholderLesson = lessonTitle.toLowerCase()

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Ask Clarity</h3>
            <p className="text-xs leading-5 text-muted-foreground">
              Get a plain-English answer for this lesson.
            </p>
          </div>
        </div>
        <p className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {moduleTitle}
        </p>
      </div>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <textarea
          className="min-h-24 w-full resize-none rounded-md border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
          placeholder={
            placeholderLesson
              ? `Ask about ${placeholderLesson}...`
              : "Ask a question in plain English..."
          }
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">Using context from "{lessonTitle}".</p>
          <Button disabled={loading} type="submit">
            {loading ? "Thinking..." : "Ask"}
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-4">
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
            <div key={label} className="rounded-md border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-primary">{label}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
