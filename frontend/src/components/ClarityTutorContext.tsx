import { createContext, useContext, type FormEvent } from "react"
import type { LearnAnswer, LearnQuestionContext } from "@/lib/api"

export type LearnContextPayload = Required<Pick<LearnQuestionContext, "moduleTitle" | "lessonTitle">>

export type ClarityTutorContextValue = {
  learnContext: LearnContextPayload | null
  setLearnContext: (ctx: LearnContextPayload) => void
  clearLearnContext: () => void
  question: string
  setQuestion: (q: string) => void
  answer: LearnAnswer | null
  error: string
  loading: boolean
  submitAsk: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export const ClarityTutorContext = createContext<ClarityTutorContextValue | null>(null)

export function useClarityTutor() {
  const ctx = useContext(ClarityTutorContext)
  if (!ctx) {
    throw new Error("useClarityTutor must be used within ClarityTutorProvider")
  }
  return ctx
}
