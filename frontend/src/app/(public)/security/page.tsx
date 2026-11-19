import type { Metadata } from "next";
import { SecurityClient } from "./security-client";

export const metadata: Metadata = {
  title: "Security Model & Threat Defense | PromptShield",
  description:
    "Explore PromptShield's multi-layer security architecture, deterministic guardrail decisions (ALLOW, WARN, SANITIZE, BLOCK), and defense against the OWASP Top 10 for LLMs.",
  alternates: { canonical: "/security" },
  openGraph: {
    title: "Security Model & Threat Defense | PromptShield",
    description:
      "Explore PromptShield's multi-layer security architecture, deterministic guardrail decisions, and defense against prompt injection, jailbreaks, and data extraction.",
    url: "/security",
    type: "website",
  },
};

export default function SecurityPage() {
  return <SecurityClient />;
}
