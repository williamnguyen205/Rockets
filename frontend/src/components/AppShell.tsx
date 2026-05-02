import { NavLink, Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/stocks", label: "Stocks" },
  { to: "/scenarios", label: "Scenarios" },
  { to: "/learn", label: "Learn" },
]

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 h-[60px] border-b border-border bg-card/90 backdrop-blur-2xl">
        <nav className="mx-auto grid h-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-5">
          <div className="text-lg font-semibold tracking-normal text-primary">Clarity</div>

          <div className="flex items-center gap-4 sm:gap-7">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-[60px] items-center text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground",
                    isActive && "text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    <span
                      className={cn(
                        "absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-primary transition-all duration-300",
                        isActive && "w-6",
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-white shadow-glow">
              CL
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-5 pb-20 pt-[104px]">
        <Outlet />
      </main>
    </div>
  )
}
