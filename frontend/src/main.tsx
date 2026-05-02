import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import {
  deriveProfile,
  displayGoal,
  horizonToTimeline,
  readOnboarding,
} from "./lib/onboarding"
import { usePortfolioStore } from "./store/portfolio"
import "./index.css"
import App from "./App.tsx"

const savedOnboarding = readOnboarding()
if (savedOnboarding) {
  const goal = displayGoal(savedOnboarding.goal, savedOnboarding.goalOther ?? "")
  const timeline = horizonToTimeline(savedOnboarding.horizon)
  const profile = deriveProfile(savedOnboarding.horizon, savedOnboarding.dipReaction)
  usePortfolioStore.getState().applyOnboardingResult({ goal, profile, timeline })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
