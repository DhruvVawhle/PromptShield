export type Layer = {
  id: string;
  name: string;
  role: string;
  outside: boolean;
};

export type Decision = "allow" | "warn" | "sanitize" | "block";

export const LAYERS: readonly Layer[] = [
  { id: "application", name: "Application", role: "Sends the user's prompt", outside: true },
  { id: "promptshield", name: "PromptShield", role: "Intercepts every prompt first", outside: false },
  { id: "analyzer", name: "Prompt analyzer", role: "Normalizes and inspects structure", outside: false },
  { id: "detection", name: "Detection engine", role: "Matches injection and jailbreak signals", outside: false },
  { id: "risk", name: "Risk scoring", role: "Combines signals into a score", outside: false },
  { id: "policy", name: "Policy / guardrails", role: "Applies your rules to the score", outside: false },
  { id: "decision", name: "Allow / warn / sanitize / block", role: "", outside: false },
  { id: "llm", name: "LLM provider", role: "Receives only what passes", outside: true },
] as const;

export const DECISION_OUTCOMES: Record<Decision, string> = {
  allow: "Forwarded to the LLM provider unchanged.",
  warn: "Forwarded to the LLM provider, with a warning logged.",
  sanitize: "Unsafe parts rewritten, then forwarded to the LLM provider.",
  block: "Stopped here. The LLM provider never sees this prompt.",
};

export const DECISION_COLOURS: Record<Decision, string> = {
  allow: "#34d399",
  warn: "#fbbf24",
  sanitize: "#60a5fa",
  block: "#f87171",
};
