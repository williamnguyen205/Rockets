import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { MessageCircle, X } from "lucide-react"
import { ClarityChatBlock } from "@/components/ClarityChatBlock"
import {
  ClarityTutorContext,
  useClarityTutor,
  type LearnContextPayload,
} from "@/components/ClarityTutorContext"
import { Button } from "@/components/ui/button"
import { askLearnQuestion, type LearnAnswer } from "@/lib/api"
import { cn } from "@/lib/utils"

const CHATBOT_INTRO_STORAGE_KEY = "clarity:chatbot-intro"

function readChatbotIntroDismissed() {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(CHATBOT_INTRO_STORAGE_KEY) === "1"
}

const GENERAL_MODULE = "Clarity app"
const GENERAL_LESSON = "General help"

export function ClarityTutorProvider({ children }: { children: ReactNode }) {
  const [learnContext, setLearnContextState] = useState<LearnContextPayload | null>(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<LearnAnswer | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const setLearnContext = useCallback((ctx: LearnContextPayload) => {
    setLearnContextState(ctx)
  }, [])

  const clearLearnContext = useCallback(() => {
    setLearnContextState(null)
  }, [])

  const submitAsk = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
        const response = await askLearnQuestion(
          trimmedQuestion,
          learnContext ?? undefined,
        )
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
    },
    [question, learnContext],
  )

  const value = useMemo(
    () => ({
      learnContext,
      setLearnContext,
      clearLearnContext,
      question,
      setQuestion,
      answer,
      error,
      loading,
      submitAsk,
    }),
    [
      learnContext,
      setLearnContext,
      clearLearnContext,
      question,
      answer,
      error,
      loading,
      submitAsk,
    ],
  )

  return (
    <ClarityTutorContext.Provider value={value}>
      {children}
      <ClarityTutorChrome />
    </ClarityTutorContext.Provider>
  )
}

function ClarityTutorChrome() {
  const {
    learnContext,
    question,
    setQuestion,
    answer,
    error,
    loading,
    submitAsk,
  } = useClarityTutor()

  const [chatPanelOpen, setChatPanelOpen] = useState(false)
  const [chatbotIntroDismissed, setChatbotIntroDismissed] = useState(readChatbotIntroDismissed)

  const moduleTitle = learnContext?.moduleTitle ?? GENERAL_MODULE
  const lessonTitle = learnContext?.lessonTitle ?? GENERAL_LESSON

  useEffect(() => {
    if (!chatPanelOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setChatPanelOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [chatPanelOpen])

  function acknowledgeChatbotIntro() {
    if (chatbotIntroDismissed) return
    window.localStorage.setItem(CHATBOT_INTRO_STORAGE_KEY, "1")
    setChatbotIntroDismissed(true)
  }

  return (
    <>
      {chatPanelOpen ? (
        <>
          <button
            aria-label="Close tutor overlay"
            className="fixed inset-0 z-[90] border-0 bg-background/65 backdrop-blur-[2px]"
            type="button"
            onClick={() => setChatPanelOpen(false)}
          />

          <div
            aria-labelledby="clarity-tutor-panel-title"
            aria-modal="true"
            className="fixed bottom-[5.5rem] right-6 z-[100] flex max-h-[min(32rem,calc(100vh-7rem))] w-[min(100vw-3rem,24rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:bottom-24 sm:right-6 sm:max-h-[min(36rem,calc(100vh-6rem))]"
            role="dialog"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
              <span
                className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold text-foreground"
                id="clarity-tutor-panel-title"
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Clarity tutor
              </span>
              <Button
                aria-label="Close tutor"
                className="h-9 w-9 shrink-0 rounded-lg"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setChatPanelOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <ClarityChatBlock
                answer={answer}
                error={error}
                lessonTitle={lessonTitle}
                loading={loading}
                moduleTitle={moduleTitle}
                question={question}
                onQuestionChange={setQuestion}
                onSubmit={submitAsk}
              />
            </div>
          </div>
        </>
      ) : null}

      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex max-w-[min(18rem,calc(100vw-3rem))] flex-col items-end gap-3">
        {!chatbotIntroDismissed ? (
          <div className="pointer-events-auto rounded-xl border border-primary/35 bg-card px-4 py-3 text-xs leading-5 text-muted-foreground shadow-lg">
            <p className="font-medium text-foreground">
              Tip: Tap the{" "}
              <span className="text-primary">tutor</span> button below anytime for plain-English
              help with investing and using Clarity—from any page.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                className="h-8 text-xs font-semibold"
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  acknowledgeChatbotIntro()
                }}
              >
                Got it
              </Button>
              <Button
                className="h-8 text-xs font-semibold"
                size="sm"
                type="button"
                onClick={() => {
                  acknowledgeChatbotIntro()
                  setChatPanelOpen(true)
                }}
              >
                Open tutor
              </Button>
            </div>
          </div>
        ) : null}

        <Button
          aria-expanded={chatPanelOpen}
          aria-label={chatPanelOpen ? "Close Clarity tutor" : "Open Clarity tutor"}
          className={cn(
            "pointer-events-auto h-14 w-14 shrink-0 rounded-full border-primary bg-primary p-0 text-primary-foreground shadow-lg hover:bg-primary/95",
          )}
          type="button"
          onClick={() => {
            if (chatPanelOpen) {
              setChatPanelOpen(false)
            } else {
              acknowledgeChatbotIntro()
              setChatPanelOpen(true)
            }
          }}
        >
          {chatPanelOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
          )}
        </Button>
      </div>
    </>
  )
}
