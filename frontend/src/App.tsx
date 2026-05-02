import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { AccountPage } from "@/pages/AccountPage"
import { AuthPage } from "@/pages/AuthPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { LearnPage } from "@/pages/LearnPage"
import { ScenariosPage } from "@/pages/ScenariosPage"
import { StocksPage } from "@/pages/StocksPage"

function App() {
  return (
    <Routes>
      <Route index element={<AuthPage />} />
      <Route path="auth" element={<AuthPage />} />
      <Route path="create" element={<AuthPage />} />
      <Route path="login" element={<AuthPage />} />
      <Route element={<AppShell />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="stocks" element={<StocksPage />} />
        <Route path="scenarios" element={<ScenariosPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Route>
    </Routes>
  )
}

export default App
