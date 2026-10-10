import type { RuleMatch } from "./security-types";

/**
 * Malicious clause removal patterns.
 * Designed to strip injection directives and jailbreak instructions
 * from mixed prompts while preserving benign user intent.
 */
const STRIP_PATTERNS: ReadonlyArray<RegExp> = [
  // Instruction override patterns
  /(?:and\s+)?(?:please\s+)?ignore\s+(?:(?:all|your|the|any)\s+)?(?:previous|prior|above|system|existing)?\s*(?:instructions|directives|rules|guidelines|prompts)[.!?,\s]*/gi,
  /(?:and\s+)?disregard\s+(?:(?:all|your|the|any)\s+)?(?:previous|prior|above|system|existing)?\s*(?:instructions|directives|rules|guidelines|prompts)[.!?,\s]*/gi,
  /(?:and\s+)?forget\s+(?:(?:all|your|the|any)\s+)?(?:previous|prior|above|system|existing)?\s*(?:instructions|directives|rules|guidelines|prompts)[.!?,\s]*/gi,

  // Jailbreak mode declarations
  /(?:from\s+now\s+on,\s*)?(?:developer\s+mode\s+(?:is\s+)?(?:enabled|activated|on))[.!?,\s]*/gi,
  /(?:you\s+are\s+now\s+(?:an?\s+)?DAN|DAN\s+mode\s+enabled)[.!?,\s]*/gi,
  /(?:with|have)\s+no\s+(?:ethical|safety|policy|content)\s+(?:restrictions|filters|limits|rules)[.!?,\s]*/gi,
  /(?:bypass\s+(?:all\s+)?(?:safety|content)\s+(?:filters|guidelines))[.!?,\s]*/gi,

  // System directive headers
  /(?:system\s*directive|admin\s*override|priority\s*instruction)\s*[:=]\s*/gi,

  // Direct extraction clauses
  /(?:and\s+)?(?:reveal|show|print|leak|extract|dump)\s+(?:the\s+|your\s+)?(?:system\s+prompt|developer\s+prompt|initial\s+instructions|api[_\s]?key|secret[_\s]?key|password)[.!?,\s]*/gi,
];

/**
 * Checks if a string contains substantive benign intent (not just residual punctuation/conjunctions).
 */
function hasSubstantiveIntent(text: string): boolean {
  const stripped = text.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  const words = stripped.split(/\s+/).filter((w) => w.length > 1);
  return words.length >= 2;
}

/**
 * Cleans up dangling punctuation, spaces, and leading/trailing conjunctions.
 */
function cleanResidualText(text: string): string {
  let cleaned = text.trim();

  // Remove leading conjunctions or punctuation
  cleaned = cleaned.replace(/^(?:and|also|but|so|then|or|,\s*|\.\s*|:\s*|-+\s*)+/i, "").trim();

  // Remove trailing conjunctions or dangling colons/dashes
  cleaned = cleaned.replace(/(?:\s+(?:and|also|or|but|then)|,\s*|:\s*|-+\s*)+$/i, "").trim();

  // Normalize duplicate spaces
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  return cleaned;
}

/**
 * Sanitizes a prompt by stripping adversarial directives.
 * Returns the sanitized benign prompt, or `null` if the prompt is entirely adversarial.
 */
export function sanitizePrompt(text: string, matchedRules: RuleMatch[]): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // If no rules matched, the prompt does not require sanitization
  if (!matchedRules || matchedRules.length === 0) {
    return text.trim();
  }

  let sanitized = text;

  // Apply stripping patterns
  for (const pattern of STRIP_PATTERNS) {
    sanitized = sanitized.replace(pattern, " ");
  }

  sanitized = cleanResidualText(sanitized);

  // If nothing substantial remains, or only trivial characters remain, the prompt cannot be salvaged
  if (!hasSubstantiveIntent(sanitized) || sanitized.length < 5) {
    return null;
  }

  return sanitized;
}
