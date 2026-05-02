import { CheckCircle2, Search } from "lucide-react"

const holdings = [
  { sym: "AAPL", name: "Apple Inc.", chg: "+12.4%", pos: true },
  { sym: "NVDA", name: "NVIDIA Corp.", chg: "+16.7%", pos: true },
  { sym: "VTI", name: "Vanguard Total Market", chg: "-0.8%", pos: false },
]

function PortfolioContent() {
  return (
    <div className="flex h-full flex-col justify-center px-8 py-6">
      <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground">
        Portfolio overview
      </p>
      <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">$24,817.43</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[0.6rem] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
          +9.4%
        </span>
        <span className="text-[0.6rem] text-muted-foreground">+$2,143.20 all time</span>
      </div>
      <div className="mt-4 space-y-1.5">
        {holdings.map(({ sym, name, chg, pos }) => (
          <div
            key={sym}
            className="flex items-center gap-2.5 rounded-md border border-border/40 bg-card/60 px-3 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/15 text-[0.55rem] font-bold text-primary">
              {sym[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.65rem] font-semibold text-foreground">{sym}</span>
              <span className="block truncate text-[0.55rem] text-muted-foreground">{name}</span>
            </span>
            <span
              className={`text-[0.65rem] font-semibold ${pos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
            >
              {chg}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HeroAnimation() {
  return (
    <div className="relative aspect-[1.35] overflow-hidden bg-gradient-to-br from-white to-blue-50/40 dark:from-[#0d1020] dark:to-[#0d1020]">
      <style>{`
        @keyframes hcGlass {
          0%, 10%  { left: -14%; }
          52%      { left: 114%; }
          100%     { left: 114%; }
        }
        @keyframes hcReveal {
          0%, 10%  { clip-path: inset(0 100% 0 0); opacity: 1; }
          52%, 62% { clip-path: inset(0 0% 0 0); opacity: 1; }
          70%      { clip-path: inset(0 0% 0 0); opacity: 0; }
          100%     { clip-path: inset(0 100% 0 0); opacity: 0; }
        }
        @keyframes hcBlurLayer {
          0%, 10%  { opacity: 1; }
          48%, 100% { opacity: 0; }
        }
        @keyframes hcClearPortfolio {
          0%, 68%  { opacity: 0; }
          76%, 91% { opacity: 1; }
          100%     { opacity: 0; }
        }
        .hc-glass {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          animation: hcGlass 12s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          filter: drop-shadow(0 4px 14px rgba(33,120,196,0.28));
          pointer-events: none;
        }
        .hc-reveal          { animation: hcReveal 12s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .hc-blur-layer      { animation: hcBlurLayer 12s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .hc-clear-portfolio { animation: hcClearPortfolio 12s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>

      {/* Phase 1 — blurry portfolio data */}
      <div
        className="hc-blur-layer absolute inset-0"
        style={{ filter: "blur(5px)" }}
        aria-hidden="true"
      >
        <PortfolioContent />
      </div>

      {/* Phase 2 — "See your portfolio clearly with Clarity" (revealed by glass sweep) */}
      <div className="hc-reveal absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-50 to-amber-50/20 px-8 py-6 dark:from-slate-900 dark:to-slate-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/10">
          <Search className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
            See your portfolio
            <br />
            clearly with <span className="text-primary">Clarity.</span>
          </p>
          <p className="mt-2.5 text-xs leading-5 text-muted-foreground">
            Practice investing, understand your holdings,
            <br />
            and make confident decisions.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-primary/70">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          No real money required
        </div>
      </div>

      {/* Phase 3 — portfolio data shown clearly */}
      <div className="hc-clear-portfolio absolute inset-0 bg-gradient-to-br from-white to-blue-50/40 dark:from-[#0d1020] dark:to-[#0d1020]">
        <PortfolioContent />
      </div>

      {/* Magnifying glass overlay */}
      <div className="hc-glass">
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="35" cy="35" r="28" fill="rgba(33,120,196,0.08)" stroke="rgba(33,120,196,0.80)" strokeWidth="3.5" />
          <ellipse cx="25" cy="24" rx="7.5" ry="4.5" fill="white" fillOpacity="0.30" transform="rotate(-32 25 24)" />
          <line x1="57" y1="57" x2="84" y2="84" stroke="rgba(34,38,63,0.85)" strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="84" cy="84" r="3.5" fill="rgba(33,120,196,0.70)" />
        </svg>
      </div>
    </div>
  )
}
