import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      tone: {
        allow: "border-[var(--severity-info-border)] bg-[var(--severity-info-bg)] text-[var(--severity-info-text)]",
        warn: "border-[var(--severity-high-border)] bg-[var(--severity-high-bg)] text-[var(--severity-high-text)]",
        sanitize: "border-[var(--severity-medium-border)] bg-[var(--severity-medium-bg)] text-[var(--severity-medium-text)]",
        block: "border-[var(--severity-critical-border)] bg-[var(--severity-critical-bg)] text-[var(--severity-critical-text)]",
        low: "border-[var(--severity-low-border)] bg-[var(--severity-low-bg)] text-[var(--severity-low-text)]",
        info: "border-[var(--severity-info-border)] bg-[var(--severity-info-bg)] text-[var(--severity-info-text)]",
        medium: "border-[var(--severity-medium-border)] bg-[var(--severity-medium-bg)] text-[var(--severity-medium-text)]",
        high: "border-[var(--severity-high-border)] bg-[var(--severity-high-bg)] text-[var(--severity-high-text)]",
        critical: "border-[var(--severity-critical-border)] bg-[var(--severity-critical-bg)] text-[var(--severity-critical-text)]",
      },
    },
    defaultVariants: {
      tone: "allow",
    },
  }
)

export function StatusBadge({
  label,
  tone,
  className,
  pulse,
}: {
  label: string
  tone?: VariantProps<typeof statusBadgeVariants>["tone"]
  className?: string
  pulse?: boolean
}) {
  const shouldPulse = pulse ?? (tone === "block" || tone === "critical" || tone === "warn" || tone === "high")

  return (
    <span className={cn(statusBadgeVariants({ tone }), className)}>
      <span className="relative flex h-1.5 w-1.5 items-center justify-center" aria-hidden="true">
        {shouldPulse && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  )
}
