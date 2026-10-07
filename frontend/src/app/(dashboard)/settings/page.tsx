import type { Metadata } from "next";

import { AppPagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure PromptShield deployment settings, providers, and operational preferences.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <AppPagePlaceholder
      title="Settings"
      description="Deployment settings manage model providers, security rules, retention decisions, and operational preferences for the PromptShield control plane."
      badges={[
        { label: "Config", tone: "allow" },
        { label: "Secure", tone: "sanitize" },
      ]}
    />
  );
}
