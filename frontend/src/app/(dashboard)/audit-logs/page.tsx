import type { Metadata } from "next";

import { AppPagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Audit Logs",
  description: "Review PromptShield audit records, operator actions, and policy history for the deployment.",
  robots: { index: false, follow: false },
};

export default function AuditLogsPage() {
  return (
    <AppPagePlaceholder
      title="Audit Logs"
      description="Audit logs record policy modifications, alert decisions, and operational actions so administrators can trace what changed and why."
      badges={[
        { label: "Recorded", tone: "allow" },
        { label: "Traceable", tone: "sanitize" },
      ]}
    />
  );
}
