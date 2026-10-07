import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Architecture",
  description:
    "See how PromptShield operates as a gateway between applications, policy checks, and LLM providers to enforce secure execution.",
  alternates: { canonical: "/architecture" },
};

const layers = [
  "Application",
  "PromptShield",
  "Security Analysis",
  "Policy / Guardrails",
  "LLM Provider",
  "Response",
] as const;

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-border bg-surface p-6 shadow-sm sm:p-8 lg:p-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Architecture
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">
          A security gateway that keeps AI execution transparent.
        </h1>

        <div className="mt-10 overflow-x-auto">
          <div className="mx-auto flex min-w-[720px] flex-col items-center gap-3">
            {layers.map((layer, index) => (
              <div key={layer} className="w-full">
                <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-4 text-center text-sm font-medium text-foreground">
                  {layer}
                </div>
                {index < layers.length - 1 ? (
                  <div className="mt-2 flex justify-center text-muted-foreground" aria-hidden="true">
                    <span className="text-xl">↓</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ["Input validation", "Normalize and inspect requests before they reach the LLM or provider layer."],
            ["Rules + scoring", "Apply deterministic signal checks, risk aggregation, and model-aware analysis."],
            ["Decision enforcement", "Allow, warn, sanitize, or block based on policy and severity."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-border bg-surface-subtle p-5">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-surface-subtle p-5 text-sm leading-7 text-muted-foreground">
          PromptShield is intentionally positioned as a distinct security control layer. It calls out the
          decision, explains what triggered it, and keeps provider execution separate from policy logic,
          which makes the stack easier to audit and safer to operate in production.
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/security" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            Learn the security model
          </Link>
          <Link href="/#product" className="rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-sm font-medium text-foreground">
            Try the experience
          </Link>
        </div>
      </div>
    </main>
  );
}
