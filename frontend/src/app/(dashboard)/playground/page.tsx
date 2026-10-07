import type { Metadata } from "next";

import { AppPagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "AI Security Playground",
  description: "Test prompts, inspect the security decision, and validate policy behavior in the PromptShield playground.",
  robots: { index: false, follow: false },
};

export default function PlaygroundPage() {
  return (
    <AppPagePlaceholder
      title="AI Security Playground"
      description="Use the playground to submit sample prompts, review risk scoring, inspect policy outcomes, and evaluate whether a prompt should be allowed, warned, sanitized, or blocked."
      badges={[
        { label: "Prompt Test", tone: "allow" },
        { label: "Risk Review", tone: "warn" },
      ]}
    />
  );
}
