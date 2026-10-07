import type { Metadata } from "next";

import { AppPagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Users",
  description: "Review PromptShield user access, roles, and administrative activity for the deployment.",
  robots: { index: false, follow: false },
};

export default function UsersPage() {
  return (
    <AppPagePlaceholder
      title="Users"
      description="User management covers access scope, role assignments, and operational accountability for PromptShield administrators and reviewers."
      badges={[
        { label: "Access", tone: "allow" },
        { label: "RBAC", tone: "warn" },
      ]}
    />
  );
}
