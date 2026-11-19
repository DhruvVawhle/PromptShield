import type { Metadata } from "next";
import { ArchitectureClient } from "./architecture-client";

export const metadata: Metadata = {
  title: "Gateway Architecture & System Topology | PromptShield",
  description:
    "Explore PromptShield's reverse-proxy gateway architecture, 6-stage security pipeline, sub-15ms stream passthrough, and zero-trust infrastructure topology.",
  alternates: { canonical: "/architecture" },
  openGraph: {
    title: "Gateway Architecture & System Topology | PromptShield",
    description:
      "Explore PromptShield's reverse-proxy gateway architecture, 6-stage security pipeline, and zero-trust model topology.",
    url: "/architecture",
    type: "website",
  },
};

export default function ArchitecturePage() {
  return <ArchitectureClient />;
}
