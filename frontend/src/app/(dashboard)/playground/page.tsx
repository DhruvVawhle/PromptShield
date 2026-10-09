import type { Metadata } from "next";

import { PlaygroundClient } from "./playground-client";

export const metadata: Metadata = {
  title: "AI Security Playground",
  description: "Test prompts, inspect the security decision, and validate policy behavior in the PromptShield playground.",
  robots: { index: false, follow: false },
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
