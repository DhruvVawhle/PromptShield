/**
 * PromptShield Server-Side Security Engine Types
 * Source of truth: 04_SECURITY_MODEL.md & 05_DATABASE_AND_API_SPEC.md
 */

export type SecurityDecision = "ALLOW" | "WARN" | "SANITIZE" | "BLOCK";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type AttackCategory =
  | "DIRECT_INJECTION"
  | "INDIRECT_INJECTION"
  | "JAILBREAK"
  | "PROMPT_LEAK"
  | "ROLE_ESCALATION"
  | "SENSITIVE_DATA"
  | "OBFUSCATION"
  | "POLICY_BYPASS";

export type RuleSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RuleMatch {
  ruleId: string;
  name: string;
  category: AttackCategory;
  severity: RuleSeverity;
  matched: boolean;
  evidence: string;
  weight: number;
}

export interface SecuritySignal {
  source: "RULE" | "HEURISTIC" | "POLICY";
  id: string;
  severity: RuleSeverity;
  category: AttackCategory;
  detail: string;
}

export interface GuardrailPolicy {
  id: string;
  name: string;
  maxRiskForAllow?: number;
  maxRiskForWarn?: number;
  allowSanitization?: boolean;
  blockPromptLeak?: boolean;
  blockCredentialExtraction?: boolean;
  customCategoryActions?: Partial<Record<AttackCategory, SecurityDecision>>;
}

export interface NormalizedInput {
  raw: string;
  normalized: string;
  length: number;
  containsZeroWidthChars: boolean;
  isObfuscatedEncoding: boolean;
  detectedEncodings: string[];
}

export interface AnalysisResult {
  requestId: string;
  isMalicious: boolean;
  decision: SecurityDecision;
  riskScore: number;
  riskLevel: RiskLevel;
  categories: AttackCategory[];
  signals: SecuritySignal[];
  triggeredRuleIds: string[];
  sanitizedPrompt: string | null;
  reasoning: string;
  latencyMs: number;
  policyApplied: {
    id: string;
    name: string;
  };
  confidence: number;
  disclaimer: string;
}

export const DEFAULT_GUARDRAIL_POLICY: GuardrailPolicy = {
  id: "default-guardrail",
  name: "PromptShield Strict Baseline Policy",
  maxRiskForAllow: 24,
  maxRiskForWarn: 49,
  allowSanitization: true,
  blockPromptLeak: true,
  blockCredentialExtraction: true,
};

export const SECURITY_DISCLAIMER =
  "Heuristic and rule-based analysis does not guarantee detection or prevention of all adversarial prompts or prompt injection variations.";
