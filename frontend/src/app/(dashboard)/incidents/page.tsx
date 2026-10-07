import type { Metadata } from "next";

import { AppPagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Incidents",
  description: "Inspect security events, risk decisions, and investigations from the PromptShield incident workflow.",
  robots: { index: false, follow: false },
};

export default function IncidentsPage() {
  return (
    <AppPagePlaceholder
      title="Incidents"
      description="Incident records capture risk decisions, categories, evidence, and policy outcomes so operators can review and investigate suspicious prompt activity."      badges={[
        { label: "Monitoring", tone: "warn" },
        { label: "Escalated", tone: "block" },
      ]}
    />
  );
}
