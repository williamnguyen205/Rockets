import { useEffect, type ReactNode } from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { ClarityIcon } from "@/components/ClarityLogo"
import { cn } from "@/lib/utils"
import { usePortfolioStore } from "@/store/portfolio"

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/stocks", label: "Stocks" },
  { to: "/scenarios", label: "Scenarios" },
  { to: "/learn", label: "Learn" },
]

function shouldUseDarkTheme() {
  if (typeof window === "undefined") return false

  const savedTheme = window.localStorage.getItem("clarity-theme")
  if (savedTheme === "dark") return true
  if (savedTheme === "light") return false

  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function OnboardingGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const onboardingComplete = usePortfolioStore((state) => state.onboardingComplete)

  useEffect(() => {
    if (!onboardingComplete) {
      navigate("/onboarding", { replace: true, state: { from: location.pathname } })
    }
  }, [onboardingComplete, navigate, location.pathname])

  if (!onboardingComplete) return null

  return children
}

export function AppShell() {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", shouldUseDarkTheme())
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <nav className="mx-auto grid h-full max-w-[980px] grid-cols-[1fr_auto_1fr] items-center px-5">
          <Link
            className="inline-flex items-center gap-3 text-primary transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/35"
            to="/dashboard"
            aria-label="Clarity dashboard"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-card text-primary shadow-sm">
              <ClarityIcon className="h-8 w-8" />
            </span>
            <span className="text-xl font-bold tracking-normal text-primary">Clarity</span>
          </Link>

          <div className="flex items-center gap-1 rounded-full border border-border/80 bg-card p-1 shadow-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors duration-200 hover:text-foreground sm:px-4 sm:text-sm",
                    isActive && "bg-primary text-primary-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2">
            <NavLink
              aria-label="Account settings"
              className={({ isActive }) =>
                cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-card text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-secondary/40",
                  isActive && "border-primary bg-secondary/60",
                )
              }
              to="/account"
            >
              CL
            </NavLink>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border/80 bg-card px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/35"
              to="/"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[820px] px-5 pb-20 pt-[112px]">
        <OnboardingGate>
          <Outlet />
        </OnboardingGate>
      </main>
    </div>
  )
}
