import type { Metadata } from "next";

import { AppPagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Security Policies",
  description: "Review active PromptShield policies and trust boundaries for prompt risk evaluation and enforcement.",
  robots: { index: false, follow: false },
};

export default function PoliciesPage() {
  return (
    <AppPagePlaceholder
      title="Security Policies"
      description="Policy controls define which prompt patterns, categories, and risk thresholds trigger warnings, sanitization, or blocking before the request reaches the model."
      badges={[
        { label: "Guardrails", tone: "allow" },
        { label: "Reviewed", tone: "warn" },
      ]}
    />
  );
}
