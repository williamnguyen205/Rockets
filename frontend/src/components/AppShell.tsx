import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet } from "react-router-dom"
import { LogOut, Settings } from "lucide-react"
import { ClarityIcon } from "@/components/ClarityLogo"
import { cn } from "@/lib/utils"

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

export function AppShell() {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

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

          <div ref={accountMenuRef} className="relative flex items-center justify-end">
            <button
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              aria-label="Open account menu"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-card text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/35",
                accountMenuOpen && "border-primary bg-secondary/60",
              )}
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              CL
            </button>

            {accountMenuOpen ? (
              <div
                className="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-panel"
                role="menu"
              >
                <Link
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                  role="menuitem"
                  to="/account"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 text-primary" aria-hidden="true" />
                  Settings
                </Link>
                <Link
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                  role="menuitem"
                  to="/"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <LogOut className="h-4 w-4 text-primary" aria-hidden="true" />
                  Logout
                </Link>
              </div>
            ) : null}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[820px] px-5 pb-20 pt-[112px]">
        <Outlet />
      </main>
    </div>
  )
}
