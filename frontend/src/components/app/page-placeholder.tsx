import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";

export function AppPagePlaceholder({
  title,
  description,
  badges = [],
}: {
  title: string;
  description: string;
  badges?: { label: string; tone?: "allow" | "warn" | "sanitize" | "block" }[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">PromptShield</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        </div>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <StatusBadge key={badge.label} label={badge.label} tone={badge.tone ?? "allow"} />
            ))}
          </div>
        ) : null}
      </div>
      <Panel className="p-6 sm:p-7">
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {["Threat review", "Security analysis", "Guardrail controls", "Policy visibility", "Audit trail", "Operational insight"].map((item) => (
            <div key={item} className="rounded-xl border border-border bg-surface-subtle px-4 py-3 text-sm font-medium text-foreground">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
