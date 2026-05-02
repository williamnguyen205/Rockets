import { Navigate, Outlet } from "react-router-dom"
import { isOnboardingComplete } from "@/lib/onboarding"

export function RequireOnboardingComplete() {
  if (!isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}
