import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Review how PromptShield handles prompts, security metadata, logs, and provider interactions.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <article className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8 lg:p-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          PromptShield
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-4xl">
          Privacy Policy
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <p>
            This Privacy Policy explains the data PromptShield may process as part of its prompt
            analysis workflow. The exact data that is collected depends on your deployment,
            configured policies, and connected LLM providers.
          </p>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Information collected</h2>
            <p>
              PromptShield may collect prompt text, request metadata, timestamps, model or provider
              identifiers, security decisions, risk scores, categories, and related analysis output.
              It may also store operational metadata such as user IDs, account identifiers, policy
              names, and audit records required to explain a security decision.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Prompt and security data</h2>
            <p>
              PromptShield analyzes user input before it reaches an LLM. This process may involve
              storing a sanitized representation of the prompt, the detected risk level, decision
              reason, applicable policies, and event metadata for monitoring or review. Raw prompt
              content should only be retained when your deployment explicitly requires it for
              security investigations or compliance workflows.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Logs and analytics</h2>
            <p>
              Operational logs may be used to monitor traffic, identify attack patterns, and support
              security incident review. Logs should avoid storing more information than necessary,
              especially sensitive prompt content or secret values. Analytics should be limited to
              aggregated, privacy-aware event metadata.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Cookies and tracking</h2>
            <p>
              PromptShield should use only essential cookies or any non-essential analytics cookies
              only when required and consented to under the applicable deployment. If your
              installation does not use tracking cookies, no consent banner is required.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Third-party providers</h2>
            <p>
              If you connect PromptShield to a model or infrastructure provider, that provider may
              process prompt data in accordance with its own terms and privacy practices. The
              PromptShield deployment should document which providers are in use and whether prompt
              content is stored by those services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Retention and deletion</h2>
            <p>
              Retention periods should be configured according to the deployment&apos;s security and
              business requirements. PromptShield should avoid indefinite storage of raw prompt data
              unless required for a legitimate operational need. Users should be able to request
              access, correction, or deletion insofar as those rights apply to the specific
              deployment and legal jurisdiction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Security</h2>
            <p>
              PromptShield applies access controls, audit logging, and policy enforcement to reduce
              the risk of unauthorized access to security events and prompt metadata. Secrets,
              API keys, and sensitive credentials should never be stored in logs or exposed through
              client-facing interfaces.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Contact</h2>
            <p>
              Replace this placeholder with your actual privacy contact details in your deployment
              environment. For example, use the value defined by the NEXT_PUBLIC_CONTACT_EMAIL
              environment variable or a dedicated support channel.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/terms"
            className="inline-flex items-center rounded-lg border border-border bg-surface-subtle px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Terms
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
