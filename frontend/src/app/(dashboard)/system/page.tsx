import type { Metadata } from "next";

import { AppPagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "System",
  description: "Review PromptShield runtime configuration, provider health, and platform readiness.",
  robots: { index: false, follow: false },
};

export default function SystemPage() {
  return (
    <AppPagePlaceholder
      title="System"
      description="System controls provide visibility into provider status, deployment health, and the operational configuration required to keep AI security checks running reliably."
      badges={[
        { label: "Health", tone: "allow" },
        { label: "Provider", tone: "warn" },
      ]}
    />
  );
}
