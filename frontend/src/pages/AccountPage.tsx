import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  Bell,
  Check,
  CreditCard,
  Lock,
  Mail,
  Moon,
  Shield,
  SlidersHorizontal,
  Target,
  UserRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClarityIcon } from "@/components/ClarityLogo"
import { cn } from "@/lib/utils"
import {
  type InvestmentTimeline,
  type InvestorProfile,
  usePortfolioStore,
} from "@/store/portfolio"

type AccountForm = {
  fullName: string
  email: string
  investorType: InvestorProfile
  timeline: InvestmentTimeline
  monthlyContribution: string
}

const preferenceDefaults = {
  emailAlerts: true,
  weeklyDigest: true,
  riskWarnings: true,
  marketing: false,
}

function getInitialTheme() {
  if (typeof window === "undefined") return false

  const savedTheme = window.localStorage.getItem("clarity-theme")
  if (savedTheme === "dark") return true
  if (savedTheme === "light") return false

  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30",
        props.className,
      )}
    />
  )
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30",
        props.className,
      )}
    />
  )
}

function Toggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  onChange: () => void
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
      type="button"
      onClick={onChange}
    >
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-primary bg-primary" : "border-border bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-card transition-transform",
            checked ? "translate-x-5" : "translate-x-1",
          )}
        />
      </span>
    </button>
  )
}

export function AccountPage() {
  const navigate = useNavigate()
  const { profile, timeline, monthlyContribution, updateProfileSettings, markOnboardingIncomplete } =
    usePortfolioStore()
  const initialForm: AccountForm = {
    fullName: "Clarity User",
    email: "clarity@example.com",
    investorType: profile,
    timeline,
    monthlyContribution: String(monthlyContribution),
  }
  const [form, setForm] = useState<AccountForm>(initialForm)
  const [savedForm, setSavedForm] = useState<AccountForm>(initialForm)
  const [preferences, setPreferences] = useState(preferenceDefaults)
  const [darkMode, setDarkMode] = useState(getInitialTheme)
  const [saved, setSaved] = useState(false)

  const hasChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  )

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
    window.localStorage.setItem("clarity-theme", darkMode ? "dark" : "light")
  }, [darkMode])

  function updateForm(field: keyof AccountForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }) as AccountForm)
    setSaved(false)
  }

  function togglePreference(field: keyof typeof preferenceDefaults) {
    setPreferences((current) => ({ ...current, [field]: !current[field] }))
    setSaved(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateProfileSettings({
      profile: form.investorType,
      timeline: form.timeline,
      monthlyContribution: Number(form.monthlyContribution) || 0,
    })
    setSavedForm(form)
    setSaved(true)
  }

  function resetForm() {
    setForm(savedForm)
    setSaved(false)
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          Account settings
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-foreground">Manage your Clarity account.</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Keep your profile, investing preferences, security, and notifications in one clean place.
        </p>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm">
            <ClarityIcon className="h-11 w-11" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{form.fullName}</h2>
              <Badge variant="low">Active</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{form.email}</p>
          </div>
          <Badge variant="outline">Free plan</Badge>
        </CardContent>
      </Card>

      <form className="space-y-8" onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
            Investing posture
          </CardTitle>
          <CardDescription>
            Revisit the short questionnaire if your goal, timeline, or comfort with volatility has changed. Your answers
            tune the dashboard and future scenario suggestions—no jargon required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              markOnboardingIncomplete()
              navigate("/onboarding", { state: { retake: true } })
            }}
          >
            Retake questionnaire
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
            Profile
          </CardTitle>
            <CardDescription>These details personalize recommendations throughout Clarity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <TextInput
                value={form.fullName}
                onChange={(event) => updateForm("fullName", event.target.value)}
              />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
              />
            </Field>
            <Field label="Investor profile">
              <SelectInput
                value={form.investorType}
                onChange={(event) => updateForm("investorType", event.target.value)}
              >
                <option>Conservative</option>
                <option>Balanced</option>
                <option>Growth</option>
                <option>Aggressive</option>
              </SelectInput>
            </Field>
            <Field label="Timeline">
              <SelectInput
                value={form.timeline}
                onChange={(event) => updateForm("timeline", event.target.value)}
              >
                <option>1-3 years</option>
                <option>3-5 years</option>
                <option>5-10 years</option>
                <option>10+ years</option>
              </SelectInput>
            </Field>
            <Field label="Monthly contribution">
              <TextInput
                inputMode="numeric"
                value={form.monthlyContribution}
                onChange={(event) => updateForm("monthlyContribution", event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" aria-hidden="true" />
              Appearance
            </CardTitle>
            <CardDescription>Choose how Clarity looks on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <Toggle
              checked={darkMode}
              description="Use a darker interface for lower-light environments."
              label="Dark mode"
              onChange={() => setDarkMode((current) => !current)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
              Notifications
            </CardTitle>
            <CardDescription>Choose which account and portfolio updates you want to receive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Toggle
              checked={preferences.emailAlerts}
              description="Important account, security, and portfolio movement alerts."
              label="Email alerts"
              onChange={() => togglePreference("emailAlerts")}
            />
            <Toggle
              checked={preferences.weeklyDigest}
              description="A weekly summary of holdings, allocation drift, and learning suggestions."
              label="Weekly digest"
              onChange={() => togglePreference("weeklyDigest")}
            />
            <Toggle
              checked={preferences.riskWarnings}
              description="A heads-up when a holding or allocation starts moving outside your comfort zone."
              label="Risk warnings"
              onChange={() => togglePreference("riskWarnings")}
            />
            <Toggle
              checked={preferences.marketing}
              description="Product updates and occasional Clarity announcements."
              label="Product updates"
              onChange={() => togglePreference("marketing")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
              Security and billing
            </CardTitle>
            <CardDescription>Common account actions you will likely connect to auth and billing later.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              {
                icon: Lock,
                label: "Password",
                description: "Last changed 28 days ago",
                action: "Change",
              },
              {
                icon: Mail,
                label: "Login email",
                description: form.email,
                action: "Verify",
              },
              {
                icon: CreditCard,
                label: "Billing",
                description: "Free plan, no card on file",
                action: "Manage",
              },
              {
                icon: SlidersHorizontal,
                label: "Data export",
                description: "Download account and portfolio data",
                action: "Export",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/55 text-primary">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Button size="sm" type="button" variant="ghost">
                  {item.action}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="sticky bottom-4 z-10 rounded-xl border border-border bg-card p-3 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {saved ? (
                <span className="inline-flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Settings saved locally
                </span>
              ) : hasChanges ? (
                "You have unsaved profile changes."
              ) : (
                "No unsaved profile changes."
              )}
            </p>
            <div className="flex gap-2">
              <Button disabled={!hasChanges} type="button" variant="ghost" onClick={resetForm}>
                Reset
              </Button>
              <Button disabled={!hasChanges} type="submit">
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
