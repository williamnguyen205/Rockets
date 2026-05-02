import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react"
import { ClarityIcon } from "@/components/ClarityLogo"
import { ClarityTutorProvider } from "@/components/ClarityTutor"
import { GettingStartedGuide } from "@/components/GettingStartedGuide"
import { shouldShowGettingStartedGuide } from "@/lib/gettingStartedGuide"
import { endSession } from "@/lib/session"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stocks", label: "Stocks", icon: Search },
  { to: "/scenarios", label: "Scenarios", icon: FlaskConical },
  { to: "/learn", label: "Learn", icon: BookOpen },
]

function shouldUseDarkTheme() {
  if (typeof window === "undefined") return false

  const savedTheme = window.localStorage.getItem("clarity-theme")
  if (savedTheme === "dark") return true
  if (savedTheme === "light") return false

  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function AppShell() {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(shouldShowGettingStartedGuide)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  function handleLogout() {
    setAccountMenuOpen(false)
    endSession()
    navigate("/login", { replace: true })
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", shouldUseDarkTheme())
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false)
        setMobileNavOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <ClarityTutorProvider>
      <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r border-border bg-card/86 px-4 py-5 backdrop-blur-xl lg:flex lg:flex-col">
          <Link
            className="flex items-center gap-3 rounded-md px-2 py-1 text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
            to="/dashboard"
            aria-label="Clarity dashboard"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-primary shadow-sm">
              <ClarityIcon className="h-7 w-7" />
            </span>
            <span>
              <span className="block text-lg font-semibold leading-none text-foreground">Clarity</span>
              <span className="mt-1 block text-xs font-medium text-muted-foreground">Investing workspace</span>
            </span>
          </Link>

          <nav className="mt-8 space-y-1" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
            <button
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              type="button"
              onClick={() => setGuideOpen(true)}
            >
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              Getting started
            </button>
          </nav>

          <div className="mt-auto rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                CL
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">Clarity User</p>
                <p className="truncate text-xs text-muted-foreground">Demo portfolio</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                to="/account"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                Settings
              </Link>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                type="button"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-50 border-b border-border bg-background/92 backdrop-blur-xl lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <Link className="flex items-center gap-2 text-primary" to="/dashboard" aria-label="Clarity dashboard">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card">
                  <ClarityIcon className="h-6 w-6" />
                </span>
                <span className="text-base font-semibold text-foreground">Clarity</span>
              </Link>
              <button
                aria-expanded={mobileNavOpen}
                aria-label="Toggle navigation"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-foreground"
                type="button"
                onClick={() => setMobileNavOpen((open) => !open)}
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
            {mobileNavOpen ? (
              <nav className="grid gap-1 border-t border-border bg-card p-3" aria-label="Mobile navigation">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground",
                        isActive && "bg-primary text-primary-foreground",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                ))}
                <NavLink
                  to="/account"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Account
                </NavLink>
                <button
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground"
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false)
                    setGuideOpen(true)
                  }}
                >
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  Getting started
                </button>
                <button
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground"
                  type="button"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Logout
                </button>
              </nav>
            ) : null}
          </header>

          <header className="sticky top-0 z-40 hidden h-16 items-center justify-between border-b border-border bg-background/88 px-8 backdrop-blur-xl lg:flex">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-accent" aria-hidden="true" />
              Practice portfolio
            </div>

            <div ref={accountMenuRef} className="relative">
              <button
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
                  accountMenuOpen && "border-primary",
                )}
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[0.65rem] text-primary-foreground">
                  CL
                </span>
                Account
              </button>

              {accountMenuOpen ? (
                <div
                  className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-lg border border-border bg-card p-1 shadow-panel"
                  role="menu"
                >
                  <Link
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                    role="menuitem"
                    to="/account"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-accent" aria-hidden="true" />
                    Settings
                  </Link>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                    role="menuitem"
                    type="button"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 text-accent" aria-hidden="true" />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <div className="flex items-center justify-center gap-1.5 border-b border-amber-200/60 bg-amber-50/80 px-6 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Practice simulation only — not financial or legal advice. Prices sourced from Yahoo Finance and may be delayed.
          </div>

          <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
      <GettingStartedGuide open={guideOpen} onOpenChange={setGuideOpen} />
    </ClarityTutorProvider>
  )
}
