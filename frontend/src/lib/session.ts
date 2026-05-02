const SESSION_KEY = "clarity-session"
const AUTH_ENTRY_KEY = "clarity-auth-entry"

export type AuthEntry = "create" | "login"

export function startSession(from: AuthEntry) {
  window.localStorage.setItem(SESSION_KEY, "1")
  window.localStorage.setItem(AUTH_ENTRY_KEY, from)
}

export function endSession() {
  window.localStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem(AUTH_ENTRY_KEY)
}

export function hasSession(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(SESSION_KEY) === "1"
}

/** How the user entered the app (create vs login). Cleared with `endSession`. */
export function getAuthEntry(): AuthEntry | null {
  if (typeof window === "undefined") return null
  const value = window.localStorage.getItem(AUTH_ENTRY_KEY)
  return value === "create" || value === "login" ? value : null
}
