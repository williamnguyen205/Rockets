const GUIDE_STORAGE_KEY = "clarity:getting-started-guide-v1"

export function markGettingStartedGuideSeen() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(GUIDE_STORAGE_KEY, "1")
}

export function resetGettingStartedGuide() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(GUIDE_STORAGE_KEY)
}

export function shouldShowGettingStartedGuide() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(GUIDE_STORAGE_KEY) !== "1"
}
