import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@promptshield.local";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact PromptShield for deployment questions, security inquiries, or product feedback.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8 lg:p-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          PromptShield
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-4xl">
          Contact
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5 text-sm leading-7 text-muted-foreground">
            <p>
              For deployment questions, product feedback, or security inquiries, use the configured
              contact channel for your PromptShield environment.
            </p>
            <p>
              This project intentionally avoids fake business details. Update the environment value
              for NEXT_PUBLIC_CONTACT_EMAIL before publishing the site publicly.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {contactEmail}
              </a>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-subtle px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Explore product
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-subtle p-5">
            <div className="flex items-center gap-3 text-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold">PromptShield</p>
                <p className="text-xs text-muted-foreground">AI security operations</p>
              </div>
            </div>

            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li>Security review and deployment support</li>
              <li>Prompt injection and policy guidance</li>
              <li>Product feedback and rollout questions</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
