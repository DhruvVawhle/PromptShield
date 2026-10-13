import { adminDb } from "@/lib/firebase-admin";
import type { AnalysisResult } from "./security-types";
import { logAudit } from "./audit";

// Regex patterns to detect and scrub credentials, tokens, and PII independently of category
const SENSITIVE_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  // Private keys
  { pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[a-zA-Z0-9+/=\s]+-----END [A-Z ]+ PRIVATE KEY-----/gi, replacement: "[REDACTED_PRIVATE_KEY]" },
  // Bearer tokens & JWTs
  { pattern: /Bearer\s+[a-zA-Z0-9_\-\.]+/gi, replacement: "Bearer [REDACTED_TOKEN]" },
  { pattern: /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, replacement: "[REDACTED_JWT]" },
  // Common API key prefixes
  { pattern: /\b(sk-[a-zA-Z0-9_-]{16,}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z-_]{35}|xox[baprs]-[0-9a-zA-Z-]{10,})\b/gi, replacement: "[REDACTED_API_KEY]" },
  // Password / secret assignments
  { pattern: /\b(password|secret|api_key|token|passwd|auth_token)\s*[:=]\s*[^\s,;]+/gi, replacement: "$1: [REDACTED_CREDENTIAL]" },
  // Emails
  { pattern: /\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b/gi, replacement: "[REDACTED_EMAIL]" },
  // Credit cards
  { pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g, replacement: "[REDACTED_CARD]" },
  // US SSN
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[REDACTED_SSN]" },
];

/**
 * Strips detected credentials, personal identifiers, and tokens independently of threat category.
 */
export function redactSensitiveContent(text: string): { text: string; hadSensitiveContent: boolean } {
  let redacted = text;
  let hadSensitiveContent = false;

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    if (pattern.test(redacted)) {
      hadSensitiveContent = true;
      redacted = redacted.replace(pattern, replacement);
    }
  }

  return { text: redacted, hadSensitiveContent };
}

export async function persistSecurityEvent(uid: string, result: AnalysisResult, rawPrompt: string) {
  try {
    const eventRef = adminDb.collection("security_events").doc(result.requestId);
    
    // Privacy & data minimization:
    // 1. If category indicates sensitive data or prompt leak -> fully redact
    // 2. If decision is BLOCK or considered malicious -> do not store adversarial payload
    // 3. Otherwise -> scrub any detected secrets/PII independently and minimize length to 200 chars
    let storedPrompt: string;
    const isSensitiveCategory = result.categories.includes("SENSITIVE_DATA") || result.categories.includes("PROMPT_LEAK");

    if (isSensitiveCategory) {
      storedPrompt = "[REDACTED DUE TO SENSITIVE CONTENT]";
    } else if (result.decision === "BLOCK" || result.isMalicious) {
      storedPrompt = "[REDACTED ADVERSARIAL CONTENT]";
    } else {
      const { text: scrubbed } = redactSensitiveContent(rawPrompt);
      storedPrompt = scrubbed.length > 200 ? scrubbed.substring(0, 200) + "..." : scrubbed;
    }

    await eventRef.set({
      uid,
      timestamp: new Date().toISOString(),
      decision: result.decision,
      isMalicious: result.isMalicious,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      categories: result.categories,
      triggeredRuleIds: result.triggeredRuleIds,
      latencyMs: result.latencyMs,
      policyId: result.policyApplied.id,
      promptSnippet: storedPrompt,
    });

    await logAudit(uid, "SECURITY_DECISION", { 
      decision: result.decision,
      policyId: result.policyApplied.id,
      requestId: result.requestId
    });
  } catch (error) {
    console.error("Failed to persist security event to Firestore:", error);
    throw new Error("Failed to record security event. Request aborted to ensure strict auditing.");
  }
}
