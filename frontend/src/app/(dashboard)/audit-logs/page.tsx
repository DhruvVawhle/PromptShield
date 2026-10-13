import type { Metadata } from "next";

import { AuditLogsClient } from "./audit-logs-client";

export const metadata: Metadata = {
  title: "Audit Logs",
  description: "Review PromptShield audit records, operator actions, and policy history for the deployment.",
  robots: { index: false, follow: false },
};

export default function AuditLogsPage() {
  return <AuditLogsClient />;
}
