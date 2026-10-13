import type { Metadata } from "next";

import { SystemClient } from "./system-client";

export const metadata: Metadata = {
  title: "System",
  description: "Review PromptShield runtime configuration, provider health, and platform readiness.",
  robots: { index: false, follow: false },
};

export default function SystemPage() {
  return <SystemClient />;
}
