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
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="font-semibold text-foreground">Ask Clarity</h3>
      </div>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <textarea
          className="min-h-20 w-full resize-none rounded-xl border border-border bg-muted/55 px-4 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
          placeholder={
            placeholderLesson
              ? `Ask about ${placeholderLesson}...`
              : "Ask a question in plain English..."
          }
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            Context: {moduleTitle} / {lessonTitle}
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
            <div key={label} className="rounded-xl border border-border bg-muted/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-primary">{label}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
