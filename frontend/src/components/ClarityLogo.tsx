import { cn } from "@/lib/utils"

type ClarityLogoProps = {
  className?: string
  showTagline?: boolean
  compact?: boolean
}

function ChartMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-full w-full", className)}
      viewBox="0 0 96 96"
    >
      <circle cx="43" cy="44" r="31" fill="none" stroke="currentColor" strokeWidth="9" />
      <path
        d="M17 70L37 50L48 60L77 31"
        fill="none"
        stroke="currentColor"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeWidth="9"
      />
      <path d="M69 23L90 14L82 36Z" fill="currentColor" />
      <path
        d="M63 63L82 82"
        fill="none"
        stroke="currentColor"
        strokeLinecap="butt"
        strokeWidth="9"
      />
    </svg>
  )
}

export function ClarityIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Clarity"
      className={cn("h-7 w-7", className)}
      role="img"
      viewBox="0 0 96 96"
    >
      <ChartMark />
    </svg>
  )
}

export function ClarityLogo({ className, showTagline = false, compact = false }: ClarityLogoProps) {
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className="inline-flex items-center gap-3" aria-label="Clarity" role="img">
        <ClarityIcon className={compact ? "h-9 w-9" : "h-14 w-14"} />
        <span
          className={cn(
            "font-extrabold leading-none tracking-[0.03em] text-current",
            compact ? "text-2xl" : "text-5xl",
          )}
        >
          CLARITY
        </span>
      </span>
      {showTagline ? (
        <span className={cn("text-xs font-bold uppercase tracking-[0.08em] text-[#687792]", compact ? "mt-1" : "mt-3")}>
          Investing, translated
        </span>
      ) : null}
    </span>
  )
}
