import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { DashboardPage } from "@/pages/DashboardPage"
import { LearnPage } from "@/pages/LearnPage"
import { ScenariosPage } from "@/pages/ScenariosPage"

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="scenarios" element={<ScenariosPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  )
}

export default App
