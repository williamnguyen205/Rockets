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
import { usePortfolioStore } from "@/store/portfolio"

type AccountForm = {
  fullName: string
  email: string
}

type SecurityPanel = "password" | "billing" | null

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

  return false
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
      className="flex w-full items-center justify-between gap-4 rounded-md border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
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
  const {
    profile,
    timeline,
    goal,
    monthlyContribution,
    healthScore,
    allocation,
    cashBalance,
    holdings,
    resetOnboarding,
  } = usePortfolioStore()
  const initialForm: AccountForm = {
    fullName: "Clarity User",
    email: "clarity@example.com",
  }
  const [form, setForm] = useState<AccountForm>(initialForm)
  const [savedForm, setSavedForm] = useState<AccountForm>(initialForm)
  const [preferences, setPreferences] = useState(preferenceDefaults)
  const [darkMode, setDarkMode] = useState(getInitialTheme)
  const [saved, setSaved] = useState(false)
  const [activeSecurityPanel, setActiveSecurityPanel] = useState<SecurityPanel>(null)
  const [passwordFields, setPasswordFields] = useState({
    current: "",
    next: "",
    confirm: "",
  })
  const [passwordStatus, setPasswordStatus] = useState("Last changed 28 days ago")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [emailVerified, setEmailVerified] = useState(false)
  const [billingPlan, setBillingPlan] = useState<"Free" | "Plus">("Free")
  const [cardLast4, setCardLast4] = useState("")
  const [cardInput, setCardInput] = useState("")
  const [securityMessage, setSecurityMessage] = useState("")

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
    setSavedForm(form)
    setSaved(true)
  }

  function resetForm() {
    setForm(savedForm)
    setSaved(false)
  }

  function updatePasswordField(field: keyof typeof passwordFields, value: string) {
    setPasswordFields((current) => ({ ...current, [field]: value }))
    setPasswordMessage("")
    setSecurityMessage("")
  }

  function savePasswordChange() {
    if (!passwordFields.current || !passwordFields.next || !passwordFields.confirm) {
      setPasswordMessage("Fill out all password fields.")
      return
    }

    if (passwordFields.next.length < 8) {
      setPasswordMessage("Use at least 8 characters for the new password.")
      return
    }

    if (passwordFields.next !== passwordFields.confirm) {
      setPasswordMessage("New password and confirmation do not match.")
      return
    }

    setPasswordFields({ current: "", next: "", confirm: "" })
    setPasswordStatus("Changed just now")
    setPasswordMessage("")
    setSecurityMessage("Password updated locally.")
    setActiveSecurityPanel(null)
  }

  function verifyEmail() {
    setEmailVerified(true)
    setSecurityMessage(`Verification marked complete for ${form.email}.`)
  }

  function saveBillingDetails() {
    const digits = cardInput.replace(/\D/g, "")

    if (billingPlan === "Plus" && digits.length < 4) {
      setSecurityMessage("Enter at least the last 4 card digits for Plus billing.")
      return
    }

    setCardLast4(digits ? digits.slice(-4) : "")
    setCardInput("")
    setSecurityMessage("Billing settings saved locally.")
    setActiveSecurityPanel(null)
  }

  function exportAccountData() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      account: {
        fullName: form.fullName,
        email: form.email,
        emailVerified,
        billingPlan,
        cardLast4: cardLast4 || null,
      },
      profile: {
        investorType: profile,
        timeline,
        goal,
        monthlyContribution,
        healthScore,
      },
      preferences,
      portfolio: {
        cashBalance,
        allocation,
        holdings,
      },
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = "clarity-account-export.json"
    link.click()
    URL.revokeObjectURL(url)
    setSecurityMessage("Account and portfolio export downloaded.")
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          Account settings
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-foreground">Account controls and preferences.</h1>
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
              <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
              Profile
            </CardTitle>
            <CardDescription>
              Name and email for your account. Investor profile, timeline, and monthly contribution live on the
              Scenarios tab where they drive your models.
            </CardDescription>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" aria-hidden="true" />
              Investing posture
            </CardTitle>
            <CardDescription>
              Revisit the short questionnaire if your goal, timeline, or comfort with volatility has changed. Your
              answers tune the dashboard and future scenario suggestions—no jargon required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full sm:w-auto"
              type="button"
              variant="secondary"
              onClick={() => {
                resetOnboarding()
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
              description="A weekly summary of holdings, how your mix compares with your plan, and learning suggestions."
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
            <CardDescription>Manage local account security, billing preferences, and exports.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              {
                icon: Lock,
                label: "Password",
                description: passwordStatus,
                action: activeSecurityPanel === "password" ? "Close" : "Change",
                onClick: () =>
                  setActiveSecurityPanel((current) => (current === "password" ? null : "password")),
              },
              {
                icon: Mail,
                label: "Login email",
                description: emailVerified ? `${form.email} verified` : form.email,
                action: emailVerified ? "Verified" : "Verify",
                onClick: verifyEmail,
              },
              {
                icon: CreditCard,
                label: "Billing",
                description:
                  billingPlan === "Free"
                    ? "Free plan, no card required"
                    : `Plus plan${cardLast4 ? `, card ending ${cardLast4}` : ", card needed"}`,
                action: activeSecurityPanel === "billing" ? "Close" : "Manage",
                onClick: () =>
                  setActiveSecurityPanel((current) => (current === "billing" ? null : "billing")),
              },
              {
                icon: SlidersHorizontal,
                label: "Data export",
                description: "Download account and portfolio data",
                action: "Export",
                onClick: exportAccountData,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-md border border-border bg-card p-4"
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
                <Button
                  disabled={item.label === "Login email" && emailVerified}
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={item.onClick}
                >
                  {item.action}
                </Button>
              </div>
            ))}
            {activeSecurityPanel === "password" ? (
              <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-4 sm:grid-cols-3">
                <Field label="Current password">
                  <TextInput
                    type="password"
                    value={passwordFields.current}
                    onChange={(event) => updatePasswordField("current", event.target.value)}
                  />
                </Field>
                <Field label="New password">
                  <TextInput
                    type="password"
                    value={passwordFields.next}
                    onChange={(event) => updatePasswordField("next", event.target.value)}
                  />
                </Field>
                <Field label="Confirm password">
                  <TextInput
                    type="password"
                    value={passwordFields.confirm}
                    onChange={(event) => updatePasswordField("confirm", event.target.value)}
                  />
                </Field>
                <div className="flex flex-col gap-2 sm:col-span-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {passwordMessage || "Password changes are simulated locally for this prototype."}
                  </p>
                  <Button type="button" onClick={savePasswordChange}>
                    Save password
                  </Button>
                </div>
              </div>
            ) : null}
            {activeSecurityPanel === "billing" ? (
              <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-4 sm:grid-cols-2">
                <Field label="Plan">
                  <SelectInput
                    value={billingPlan}
                    onChange={(event) => setBillingPlan(event.target.value as "Free" | "Plus")}
                  >
                    <option>Free</option>
                    <option>Plus</option>
                  </SelectInput>
                </Field>
                <Field label="Card last 4">
                  <TextInput
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={cardLast4 || "Optional for Free"}
                    value={cardInput}
                    onChange={(event) => {
                      setCardInput(event.target.value)
                      setSecurityMessage("")
                    }}
                  />
                </Field>
                <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {billingPlan === "Free"
                      ? "Free keeps all current dashboard, stocks, and learning features."
                      : "Plus billing is simulated locally until payments are connected."}
                  </p>
                  <Button type="button" onClick={saveBillingDetails}>
                    Save billing
                  </Button>
                </div>
              </div>
            ) : null}
            {securityMessage ? (
              <p className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                {securityMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="sticky bottom-4 z-10 rounded-lg border border-border bg-card p-3 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {saved ? (
                <span className="inline-flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Settings saved locally
                </span>
              ) : hasChanges ? (
                "You have unsaved account details."
              ) : (
                "No unsaved account details."
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
