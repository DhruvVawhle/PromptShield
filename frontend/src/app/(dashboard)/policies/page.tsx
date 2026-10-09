import type { Metadata } from "next";

import { PoliciesClient } from "./policies-client";

export const metadata: Metadata = {
  title: "Security Policies",
  description: "Review active PromptShield policies and trust boundaries for prompt risk evaluation and enforcement.",
  robots: { index: false, follow: false },
};

export default function PoliciesPage() {
  return <PoliciesClient />;
}
