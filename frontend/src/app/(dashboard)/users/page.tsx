import type { Metadata } from "next";
import { UsersClient } from "./users-client";

export const metadata: Metadata = {
  title: "Team & Access Control",
  description: "Review PromptShield user access, roles, and administrative activity for the deployment.",
  robots: { index: false, follow: false },
};

export default function UsersPage() {
  return <UsersClient />;
}
