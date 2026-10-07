import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn how PromptShield provides a transparent security layer around AI applications and LLM workflows.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <article className="rounded-[28px] border border-border bg-surface p-6 shadow-sm sm:p-8 lg:p-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          About PromptShield
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">
          A security layer for the modern AI stack.
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>
            PromptShield sits between an application, a user, and a model to detect unsafe prompts,
            explain risk, and enforce an explicit decision before execution. The goal is simple: keep
            legitimate workflows moving while making malicious or ambiguous prompts visible and
            governable.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Prompt Intake", "User and application prompts are normalized and inspected before reaching the model."],
              ["Risk Interpretation", "Signals, categories, and policy context are combined into an explainable security decision."],
              ["Safe Execution", "Legitimate prompts continue, risky inputs are warned on, sanitized, or blocked according to policy."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-border bg-surface-subtle p-4">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <p>
            PromptShield is designed to be a transparent and auditable control plane, not a generic
            chatbot. It highlights attack patterns such as direct or indirect prompt injection,
            jailbreak attempts, leakage, role escalation, and obfuscation while preserving operational
            clarity for developers and security teams.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/security" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            Explore security
          </Link>
          <Link href="/architecture" className="rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-sm font-medium text-foreground">
            View architecture
          </Link>
        </div>
      </article>
    </main>
  );
}
