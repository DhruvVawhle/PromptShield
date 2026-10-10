import type { Metadata } from "next";

import { AnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Review PromptShield attack trends, decision distribution, and security metrics for the deployment.",
  robots: { index: false, follow: false },
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
