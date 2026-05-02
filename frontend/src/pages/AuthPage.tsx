import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, LockKeyhole, Mail } from "lucide-react"
import { ClarityLogo } from "@/components/ClarityLogo"
import { startSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import { usePortfolioStore } from "@/store/portfolio"

type AuthMode = "create" | "login"

const insightRows = [
  ["Lesson", "Volatility is movement, not failure."],
  ["Move", "Practice portfolio rebalanced."],
  ["Next", "Compare index funds."],
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Pre-filled when judges tap "Use demo login" on the login tab. */
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
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  icon: typeof Mail
  label: string
  placeholder: string
  type?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  invalid?: boolean
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-[#080d21]">{label}</span>
      <span
        className={cn(
          "mt-2 flex h-12 items-center gap-3 rounded-[14px] border-2 bg-white px-4 transition-colors focus-within:border-[#080d21] focus-within:ring-4 focus-within:ring-[#96ff4c]/30",
          invalid ? "border-[#c44]" : "border-[#d5deea]",
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-[#6a7891]" aria-hidden="true" />
        <input
          autoComplete={autoComplete}
          aria-invalid={invalid}
          className="min-w-0 flex-1 bg-transparent text-base font-extrabold text-[#080d21] outline-none placeholder:text-[#9aa9be]"
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  )
}

function MarketPreview() {
  return (
    <section className="relative">
      <div className="absolute left-4 top-5 h-full w-full rounded-[26px] bg-[#0a1329]" />
      <div className="relative rounded-[26px] border-2 border-[#080d21] bg-[#fbf6ec] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-[#6d7d99]">Today</p>
            <p className="mt-1 text-3xl font-black tracking-normal text-[#080d21] sm:text-4xl">
              $12,840
            </p>
          </div>
          <div className="rounded-full border-2 border-[#080d21] bg-[#9cff48] px-4 py-1.5 text-base font-black text-[#080d21]">
            +8.4%
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[18px] border-2 border-[#080d21] bg-[#fbf6ec]">
          <svg className="h-[170px] w-full" role="img" aria-label="Portfolio value rising chart" viewBox="0 0 680 230">
            <defs>
              <pattern id="auth-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#ded6c8" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="680" height="230" fill="url(#auth-grid)" />
            <path
              d="M95 162 C140 143 174 178 215 150 C252 126 286 136 320 116 C357 95 373 96 405 75 C436 55 463 62 497 47 C532 32 550 24 585 19"
              fill="none"
              stroke="#080d21"
              strokeLinecap="round"
              strokeWidth="8"
            />
            <path
              d="M95 162 C140 143 174 178 215 150 C252 126 286 136 320 116 C357 95 373 96 405 75 C436 55 463 62 497 47 C532 32 550 24 585 19"
              fill="none"
              stroke="#16a9e6"
              strokeLinecap="round"
              strokeWidth="4"
            />
            <circle cx="340" cy="104" r="10" fill="#ff7a1a" stroke="#080d21" strokeWidth="4" />
          </svg>
        </div>

        <div className="mt-5 grid gap-3">
          {insightRows.map(([label, text]) => (
            <div
              className="grid gap-2 rounded-[14px] border-2 border-[#dfe7f0] bg-white px-4 py-3 sm:grid-cols-[92px_1fr] sm:items-center"
              key={label}
            >
              <span className="text-xs font-black uppercase text-[#6d7d99]">{label}</span>
              <span className="text-base font-black text-[#243149] sm:text-right">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
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
    <div className="min-h-screen bg-[#f4eddf] px-5 py-4 text-[#080d21] sm:px-8">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between border-b-2 border-[#080d21] pb-4">
        <Link className="w-[200px] sm:w-[280px]" to="/" aria-label="Clarity home">
          <ClarityLogo showTagline />
        </Link>

        <div className="flex rounded-full border-2 border-[#080d21] bg-white p-1">
          {(["create", "login"] as const).map((item) => (
            <button
              className={cn(
                "h-10 rounded-full px-4 text-sm font-bold capitalize text-[#43506a] transition-colors sm:px-6 sm:text-base",
                mode === item && "bg-[#080d21] text-white",
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

      <main className="mx-auto grid max-w-[1280px] gap-10 py-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:py-10">
        <section>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-[#687792]">
            {mode === "create" ? "Create your account" : "Welcome back"}
          </p>
          <h1 className="mt-5 max-w-[540px] text-[clamp(3.25rem,7vw,5.75rem)] font-black leading-[0.9] tracking-normal">
            Make the market less weird.
          </h1>
          <p className="mt-5 max-w-[540px] text-xl font-extrabold leading-relaxed text-[#34435c] sm:text-2xl">
            Practice investing, understand what moved, and learn before real money is involved.
          </p>

          <form className="relative mt-7 max-w-[480px]" onSubmit={handleSubmit} noValidate>
            <div className="absolute left-3 top-4 h-full w-full rounded-[22px] bg-[#0a1329]" />
            <div className="relative rounded-[22px] border-2 border-[#080d21] bg-white p-5 sm:p-6">
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
                <p
                  className="mt-4 rounded-[12px] border-2 border-[#ffb7b7] bg-[#fff0f0] px-3 py-2 text-sm font-bold text-[#a13030]"
                  role="alert"
                >
                  {formError}
                </p>
              ) : null}

              {mode === "login" ? (
                <button
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-[14px] border-2 border-[#080d21] bg-[#fbf6ec] px-5 text-sm font-black text-[#080d21] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#96ff4c]"
                  type="button"
                  onClick={() => {
                    setEmail(DEMO_LOGIN_EMAIL)
                    setPassword(DEMO_LOGIN_PASSWORD)
                    setFormError("")
                  }}
                >
                  Use demo login
                </button>
              ) : null}

              <button
                className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-[14px] bg-[#080d21] px-5 text-base font-black uppercase text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#96ff4c] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!email.trim() || !password}
                type="submit"
              >
                {mode === "create" ? "Create account & continue" : "Sign in"}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>

        <MarketPreview />
      </main>
    </div>
  )
}
