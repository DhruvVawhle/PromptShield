import type { ReactNode } from "react"

export type Capability = {
  id: string
  stage: string
  title: string
  description: string
  tag: string
  railIndex: number
  subtitle: string
}

export const CAPABILITIES: readonly Capability[] = [
  {
    id: "analyze",
    stage: "Analyze",
    title: "Prompt Analysis",
    description:
      "Normalize every prompt, inspect its structure, and explain why it received its risk classification before execution.",
    tag: "Risk score 0\u2013100",
    railIndex: 1,
    subtitle: "Every score is explainable. Know why a prompt earned its rating.",
  },
  {
    id: "detect",
    stage: "Detect",
    title: "Threat Detection",
    description:
      "Detect prompt injection, jailbreak attempts, instruction manipulation, obfuscation, and suspicious instructions.",
    tag: "Injection coverage",
    railIndex: 2,
    subtitle: "Signals surface before execution — nothing reaches the model unverified.",
  },
  {
    id: "protect",
    stage: "Protect",
    title: "Security Decision",
    description:
      "Allow, warn, sanitize, or block the request, then enforce guardrails before it reaches the model, provider, or tool layer.",
    tag: "Allow \u00b7 Warn \u00b7 Sanitize \u00b7 Block",
    railIndex: 4,
    subtitle: "Only trusted requests proceed. Everything else is intercepted.",
  },
] as const

export const PIPELINE = ["Prompt", "Analyze", "Detect", "Decide", "Protect"] as const

export const CAPABILITY_PANEL_VIEWS: Record<string, ReactNode> = {}
