import { ShieldX, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function BlockedMessage({
  category = "Prompt Injection",
  risk = "High",
}: {
  category?: string
  risk?: string
}) {
  return (
    <div className="rounded-2xl border border-status-block/30 bg-status-block/5 p-5 text-foreground shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-status-block/30 bg-status-block/10 text-status-block">
          <ShieldX className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-status-block">Prompt blocked</p>
          <p className="mt-3 text-base font-medium text-foreground">PromptShield detected a potential prompt injection attempt.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The request was denied before any model execution, preserving the security boundary around the LLM.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Decision</p>
              <p className="mt-2 text-sm font-semibold text-status-block">BLOCK</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Risk</p>
              <p className="mt-2 text-sm font-semibold text-status-block">{risk}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Category</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{category}</p>
            </div>
          </div>

          <Button variant="secondary" className="mt-4 gap-2 px-3" type="button">
            View analysis
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
