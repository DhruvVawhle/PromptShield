import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Learn how PromptShield detects prompt injection, explains risk, sanitizes unsafe inputs, and enforces guardrails before LLM execution.",
  alternates: { canonical: "/security" },
};

const decisions = [
  { title: "ALLOW", text: "Safe requests continue without interruption, preserving normal application flow." },
  { title: "WARN", text: "Ambiguous requests are flagged for review while continuing with a clear explanation of the risk." },
  { title: "SANITIZE", text: "Unsafe content is rewritten when the legitimate task can be preserved without bypassing the policy boundary." },
  { title: "BLOCK", text: "Malicious prompts are denied before they reach the model or tool layer." },
] as const;

const threats = [
  "Direct Prompt Injection",
  "Indirect Prompt Injection",
  "Jailbreak Attempts",
  "Prompt Leakage",
  "Role Escalation",
  "Sensitive Information Extraction",
  "Obfuscation",
  "Instruction Manipulation",
] as const;

export default function SecurityPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-border bg-surface p-6 shadow-sm sm:p-8 lg:p-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Security model
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">
          Detect the prompt. Understand the risk. Defend the outcome.
        </h1>

        <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground">
          PromptShield adds a transparent security checkpoint to AI workflows. It inspects the incoming
          prompt, checks for high-risk patterns and policy violations, and returns a clear decision that
          applications can trust and operate with confidence.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {decisions.map((decision) => (
            <div key={decision.title} className="rounded-2xl border border-border bg-surface-subtle p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Decision
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {decision.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{decision.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Attack categories
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground sm:text-3xl">
              Coverage for the prompts that most often compromise model behavior.
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {threats.map((threat) => (
              <div key={threat} className="rounded-xl border border-border bg-surface-subtle p-3 text-sm font-medium text-foreground">
                {threat}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-surface-subtle p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Operational flow
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-6">
            {[
              "User Prompt",
              "Normalization",
              "Rule Detection",
              "Risk Scoring",
              "Policy Check",
              "Decision",
            ].map((step, index) => (
              <div key={step} className="rounded-xl border border-border bg-surface p-3 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/#product" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            Open security check
          </Link>
          <Link href="/architecture" className="rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-sm font-medium text-foreground">
            View architecture
          </Link>
        </div>
      </div>
    </main>
  );
}
