import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { ClarityLogo } from "@/components/ClarityLogo"
import { Button } from "@/components/ui/button"
import { startSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import { usePortfolioStore } from "@/store/portfolio"
import heroImage from "@/assets/hero.png"

type AuthMode = "create" | "login"

const trustSignals = [
  "Practice portfolio",
  "Scenario modeling",
  "Plain-English lessons",
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEMO_LOGIN_EMAIL = "demo@clarity.app"
const DEMO_LOGIN_PASSWORD = "claritydemo1"

function validateForm(email: string, password: string, mode: AuthMode): string | null {
  const trimmedEmail = email.trim()
  if (!trimmedEmail) return "Enter your email."
  if (!EMAIL_RE.test(trimmedEmail)) return "Enter a valid email address."
  if (!password) return "Enter your password."
  if (mode === "create" && password.length < 8) {
    return "Use at least 8 characters for your password."
  }
  if (mode === "login" && password.length < 8) {
    return "Password must be at least 8 characters."
  }
  return null
}

function Field({
  icon: Icon,
  invalid,
  label,
  placeholder,
  type = "text",
  value,
  autoComplete,
  onChange,
}: {
  icon: typeof Mail
  invalid?: boolean
  label: string
  placeholder: string
  type?: string
  value: string
  autoComplete?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      <span
        className={cn(
          "mt-2 flex h-11 items-center gap-3 rounded-md border bg-card px-3 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-ring/20",
          invalid ? "border-destructive" : "border-input",
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          autoComplete={autoComplete}
          aria-invalid={invalid}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  )
}

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("create")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [formError, setFormError] = useState("")
  const navigate = useNavigate()
  const resetOnboarding = usePortfolioStore((state) => state.resetOnboarding)

  function setModeAndClearError(next: AuthMode) {
    setMode(next)
    setFormError("")
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = validateForm(email, password, mode)
    if (message) {
      setFormError(message)
      return
    }

    setFormError("")
    if (mode === "create") {
      startSession("create")
      resetOnboarding()
      navigate("/onboarding")
      return
    }

    startSession("login")
    const onboarded = usePortfolioStore.getState().onboarded
    navigate(onboarded ? "/dashboard" : "/onboarding")
  }

  const showFieldError = Boolean(formError)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="text-primary" to="/" aria-label="Clarity home">
          <ClarityLogo compact />
        </Link>

        <div className="flex rounded-md border border-border bg-card p-1 shadow-sm">
          {(["create", "login"] as const).map((item) => (
            <button
              className={cn(
                "h-8 rounded px-3 text-sm font-semibold capitalize text-muted-foreground transition-colors sm:px-4",
                mode === item && "bg-primary text-primary-foreground",
              )}
              key={item}
              type="button"
              onClick={() => setModeAndClearError(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1180px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:px-8 lg:py-12">
        <section className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Beginner-safe investing workspace
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
            Learn the market before you risk the money.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            Clarity gives new investors a practice portfolio, live ticker lookup, and scenario feedback in one calm
            workspace.
          </p>

          <form className="mt-7 rounded-lg border border-border bg-card p-5 shadow-panel" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4">
              <Field
                autoComplete="email"
                icon={Mail}
                invalid={showFieldError}
                label="Email"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(value) => {
                  setEmail(value)
                  setFormError("")
                }}
              />
              <Field
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                icon={LockKeyhole}
                invalid={showFieldError}
                label="Password"
                placeholder={mode === "create" ? "At least 8 characters" : "Your password"}
                type="password"
                value={password}
                onChange={(value) => {
                  setPassword(value)
                  setFormError("")
                }}
              />
            </div>

            {formError ? (
              <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            {mode === "login" ? (
              <Button
                className="mt-4 w-full"
                type="button"
                variant="secondary"
                onClick={() => {
                  setEmail(DEMO_LOGIN_EMAIL)
                  setPassword(DEMO_LOGIN_PASSWORD)
                  setFormError("")
                }}
              >
                Use demo login
              </Button>
            ) : null}

            <Button className="mt-5 w-full" disabled={!email.trim() || !password} size="lg" type="submit">
              {mode === "create" ? "Create account and continue" : "Sign in"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {trustSignals.map((signal) => (
              <div key={signal} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
                {signal}
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-lift">
          <div className="grid gap-px bg-border sm:grid-cols-3">
            {[
              ["Health", "84"],
              ["Allocation drift", "6pp"],
              ["Cash ready", "$2.5k"],
            ].map(([label, value]) => (
              <div key={label} className="bg-card p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
              </div>
            ))}
          </div>
          <div className="relative aspect-[1.35] bg-muted">
            <img
              alt="Clarity investing dashboard preview"
              className="h-full w-full object-cover"
              src={heroImage}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/80 to-transparent p-5 text-primary-foreground">
              <p className="text-sm font-semibold">Portfolio decisions, translated.</p>
              <p className="mt-1 max-w-md text-sm text-primary-foreground/80">
                See what changed, why it matters, and what a reasonable next move could look like.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
