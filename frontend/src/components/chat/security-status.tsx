import { ShieldAlert, ShieldCheck, ShieldX, RefreshCcw } from "lucide-react"

import { StatusBadge } from "@/components/ui/status-badge"

export type SecurityDecision = "ALLOW" | "WARN" | "SANITIZE" | "BLOCK"

export type SecurityRisk = "Low" | "Medium" | "High" | "Critical"

export function SecurityStatus({
  decision,
  risk,
  categories,
  signals,
}: {
  decision: SecurityDecision
  risk: SecurityRisk
  categories: string[]
  signals: string[]
}) {
  const decisionPalette: Record<SecurityDecision, { icon: typeof ShieldCheck; tone: "allow" | "warn" | "sanitize" | "block" }> = {
    ALLOW: { icon: ShieldCheck, tone: "allow" },
    WARN: { icon: ShieldAlert, tone: "warn" },
    SANITIZE: { icon: RefreshCcw, tone: "sanitize" },
    BLOCK: { icon: ShieldX, tone: "block" },
  }

  const riskTone: Record<SecurityRisk, string> = {
    Low: "text-status-allow",
    Medium: "text-status-warn",
    High: "text-status-sanitize",
    Critical: "text-status-block",
  }

  const Icon = decisionPalette[decision].icon

  return (
    <div className="rounded-2xl border border-border bg-surface-subtle/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground">
            <Icon className="h-4 w-4" />
          </span>
          Security check
        </div>
        <StatusBadge tone={decisionPalette[decision].tone} label={decision} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Decision</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{decision}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Risk</p>
          <p className={`mt-2 text-sm font-semibold ${riskTone[risk]}`}>{risk}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Category</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{categories[0] ?? "None"}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Security indicators</p>
        <ul className="space-y-1.5">
          {signals.map((signal) => (
            <li key={signal} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              <span>{signal}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
