import { Navigate, Outlet, useLocation } from "react-router-dom"
import { usePortfolioStore } from "@/store/portfolio"

export function OnboardingGate() {
  const onboarded = usePortfolioStore((state) => state.onboarded)
  const { pathname } = useLocation()
  const onWizard = pathname === "/onboarding"

  if (!onboarded && !onWizard) return <Navigate replace to="/onboarding" />
  if (onboarded && onWizard) return <Navigate replace to="/dashboard" />
  return <Outlet />
}
