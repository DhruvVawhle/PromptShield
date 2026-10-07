import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Review the PromptShield service terms, acceptable use expectations, and responsibilities for deployment operators.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <article className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8 lg:p-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          PromptShield
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-4xl">
          Terms & Conditions
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>
            This page is a product placeholder and is not legal advice. Before production release,
            review these terms with appropriate legal counsel and replace any placeholder language
            with the final business and legal terms for your deployment.
          </p>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Acceptable use</h2>
            <p>
              Users and deployment operators are responsible for using PromptShield in compliance with
              applicable laws, internal policies, and the intended AI security workflow. PromptShield
              is designed to analyze and filter prompts before they reach an LLM and should not be used
              to bypass approved security controls or fabricate false audit results.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Prohibited use</h2>
            <p>
              You may not use PromptShield to exfiltrate sensitive secrets, bypass enterprise
              protections, or process regulated data in a manner that violates internal policy or
              governing law. PromptShield does not guarantee detection of every malicious prompt and
              should be paired with operational review and appropriate guardrail controls.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Service availability</h2>
            <p>
              The PromptShield gateway may be unavailable temporarily during maintenance, configuration
              changes, or provider outages. Availability is not guaranteed. Operators should implement
              their own resilience, fallback procedures, and monitoring for critical production traffic.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">User responsibilities</h2>
            <p>
              Operators are responsible for configuring policies, access controls, retention settings,
              provider connections, and review workflows in a way that aligns with their environment,
              business requirements, and risk profile.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Intellectual property</h2>
            <p>
              PromptShield and related design assets remain subject to the applicable ownership,
              licensing, and usage terms for the deployment. Third-party libraries, model providers,
              and platform services used by the application remain subject to their own licenses and
              service terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Limitation of liability</h2>
            <p>
              PromptShield should be treated as a security control layer to reduce risk, not a guarantee
              of absolute safety or perfect detection. Deployment operators remain responsible for
              evaluating the suitability of the platform for their environment and risk profile.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Changes</h2>
            <p>
              These terms may change over time as the product evolves. Material changes should be
              communicated to users and administrators before taking effect wherever required by your
              deployment or legal obligations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Contact</h2>
            <p>
              Replace this placeholder with the actual legal or operational contact information for your
              PromptShield deployment. Use a configured contact channel or the value defined in
              NEXT_PUBLIC_CONTACT_EMAIL.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/privacy"
            className="inline-flex items-center rounded-lg border border-border bg-surface-subtle px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Privacy
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg border border-border bg-surface-subtle px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Contact
          </Link>
        </div>
      </article>
    </main>
  );
}
