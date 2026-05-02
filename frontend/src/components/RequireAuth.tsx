import { Navigate, Outlet } from "react-router-dom"
import { hasSession } from "@/lib/session"

export function RequireAuth() {
  if (!hasSession()) return <Navigate replace to="/login" />
  return <Outlet />
}
