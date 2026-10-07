import type { Metadata } from "next";

import { AppPagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Review PromptShield attack trends, decision distribution, and security metrics for the deployment.",
  robots: { index: false, follow: false },
};

export default function AnalyticsPage() {
  return (
    <AppPagePlaceholder
      title="Analytics"
      description="The analytics workspace summarizes decision volumes, attack categories, policy trends, and operational posture over time so security teams can understand system behavior."
      badges={[
        { label: "Trends", tone: "sanitize" },
        { label: "Insights", tone: "allow" },
      ]}
    />
  );
}
