import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "PromptShield — Secure Every Prompt",
  description:
    "PromptShield sits between users and LLMs to detect prompt injection attempts, explain risk, and enforce allow, warn, sanitize, and block decisions before execution.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <LandingPage />;
}
