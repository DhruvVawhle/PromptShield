import type { Metadata } from "next";

import { IncidentsClient } from "./incidents-client";

export const metadata: Metadata = {
  title: "Incidents",
  description: "Inspect security events, risk decisions, and investigations from the PromptShield incident workflow.",
  robots: { index: false, follow: false },
};

export default function IncidentsPage() {
  return (
    <IncidentsClient />
  );
}
