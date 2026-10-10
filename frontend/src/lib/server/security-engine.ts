import crypto from "crypto";
import { normalizePromptInput } from "./normalizer";
import { evaluatePolicy } from "./policy-evaluator";
import {
  evaluateDetectionRules,
  isEducationalSecurityQuery,
  SAFE_INDICATORS,
} from "./rules/rule-definitions";
import { sanitizePrompt } from "./sanitizer";
import {
  DEFAULT_GUARDRAIL_POLICY,
  SECURITY_DISCLAIMER,
  type AnalysisResult,
  type AttackCategory,
  type GuardrailPolicy,
  type RiskLevel,
  type RuleMatch,
  type SecuritySignal,
} from "./security-types";

function calculateRiskLevel(score: number): RiskLevel {
  if (score < 25) return "LOW";
  if (score < 50) return "MODERATE";
  if (score < 75) return "HIGH";
  return "CRITICAL";
}

/**
 * PromptShield Server-Side Security Engine
 *
 * Evaluates inbound prompts deterministically via normalization, heuristic rules,
 * risk scoring, and guardrail policies. Never fails open.
 */
export async function analyzePromptServer(
  input: string,
  policy: GuardrailPolicy = DEFAULT_GUARDRAIL_POLICY
): Promise<AnalysisResult> {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();

  try {
    // 1. Validate empty / trivial input
    if (typeof input !== "string") {
      const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
      return {
        requestId,
        isMalicious: true,
        decision: "BLOCK",
        riskScore: 100,
        riskLevel: "CRITICAL",
        categories: ["OBFUSCATION"],
        signals: [{ source: "HEURISTIC", id: "INVALID_INPUT_TYPE", severity: "CRITICAL", category: "OBFUSCATION", detail: "Non-string input rejected." }],
        triggeredRuleIds: ["INVALID-INPUT"],
        sanitizedPrompt: null,
        reasoning: "Invalid input type. Expected string.",
        latencyMs,
        policyApplied: { id: policy.id || DEFAULT_GUARDRAIL_POLICY.id, name: policy.name || DEFAULT_GUARDRAIL_POLICY.name },
        confidence: 1.0,
        disclaimer: SECURITY_DISCLAIMER,
      };
    }

    if (input.trim().length === 0) {
      const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
      return {
        requestId,
        isMalicious: false,
        decision: "ALLOW",
        riskScore: 0,
        riskLevel: "LOW",
        categories: [],
        signals: [],
        triggeredRuleIds: [],
        sanitizedPrompt: null,
        reasoning: "Empty or whitespace-only prompt received. No threats detected.",
        latencyMs,
        policyApplied: {
          id: policy.id || DEFAULT_GUARDRAIL_POLICY.id,
          name: policy.name || DEFAULT_GUARDRAIL_POLICY.name,
        },
        confidence: 0.99,
        disclaimer: SECURITY_DISCLAIMER,
      };
    }

    // 2. Normalization
    const normalizedInput = normalizePromptInput(input);
    const text = normalizedInput.normalized;

    // 3. Educational Query Protection (TC-006)
    const isEducational = isEducationalSecurityQuery(text);

    // 4. Rule Evaluation
    const matchedRules: RuleMatch[] = evaluateDetectionRules(text);

    // Add obfuscation signals if detected during normalization
    if (normalizedInput.containsZeroWidthChars) {
      matchedRules.push({
        ruleId: "OBF-ZW",
        name: "Zero-Width Character Obfuscation",
        category: "OBFUSCATION",
        severity: "MEDIUM",
        matched: true,
        evidence: "Zero-width unicode characters detected and stripped.",
        weight: 25,
      });
    }

    if (normalizedInput.isObfuscatedEncoding) {
      matchedRules.push({
        ruleId: "OBF-ENC",
        name: "Suspicious Payload Encoding",
        category: "OBFUSCATION",
        severity: "MEDIUM",
        matched: true,
        evidence: `Obfuscated encodings found: ${normalizedInput.detectedEncodings.join(", ")}`,
        weight: 22,
      });
    }

    // 5. Risk Score Computation
    let calculatedScore = 0;
    const seenRuleIds = new Set<string>();

    for (const rule of matchedRules) {
      if (!seenRuleIds.has(rule.ruleId)) {
        seenRuleIds.add(rule.ruleId);
        calculatedScore += rule.weight;
      }
    }

    // If educational question and no critical injection rules matched, suppress false-positive scoring
    if (isEducational && !matchedRules.some((r) => r.severity === "CRITICAL" || r.severity === "HIGH")) {
      calculatedScore = Math.min(calculatedScore, 10);
    }

    // Safe indicator mitigation (only if no high/critical rules triggered)
    if (!matchedRules.some((r) => r.severity === "HIGH" || r.severity === "CRITICAL")) {
      const safeMatches = SAFE_INDICATORS.filter((pattern) => pattern.test(text)).length;
      if (safeMatches > 0) {
        calculatedScore = Math.max(0, calculatedScore - safeMatches * 3);
      }
    }

    // Bound risk score strictly [0, 100]
    const riskScore = Math.min(100, Math.max(0, Math.round(calculatedScore)));
    const riskLevel = calculateRiskLevel(riskScore);

    // 6. Sanitization Viability
    let sanitizedCandidate = sanitizePrompt(text, matchedRules);
    let canSanitize = false;
    
    if (sanitizedCandidate !== null && sanitizedCandidate !== text && sanitizedCandidate.length > 5) {
      // Re-validate the sanitized output
      const residualRules = evaluateDetectionRules(sanitizedCandidate);
      const hasMandatoryThreat = residualRules.some((r) => r.severity === "CRITICAL" || r.severity === "HIGH");
      
      if (!hasMandatoryThreat) {
        canSanitize = true;
      } else {
        // If mandatory threats remain, sanitization is unsafe and must fail closed
        sanitizedCandidate = null;
      }
    }

    // 7. Policy Evaluation
    const policyResult = evaluatePolicy(matchedRules, riskScore, policy, canSanitize);

    // Finalize sanitized prompt based on decision
    const sanitizedPrompt = policyResult.decision === "SANITIZE" ? sanitizedCandidate : null;

    // Malicious classification flag
    const isMalicious =
      policyResult.decision === "BLOCK" ||
      policyResult.decision === "SANITIZE" ||
      riskScore >= 50 ||
      matchedRules.some((r) => r.severity === "CRITICAL" || r.severity === "HIGH");

    // 8. Signals Compilation
    const signals: SecuritySignal[] = matchedRules.map((rule) => ({
      source: "RULE",
      id: rule.ruleId,
      severity: rule.severity,
      category: rule.category,
      detail: rule.evidence,
    }));

    const categories: AttackCategory[] = Array.from(
      new Set(matchedRules.map((r) => r.category))
    );

    const triggeredRuleIds = Array.from(new Set(matchedRules.map((r) => r.ruleId)));

    // Confidence metric (heuristic calibration)
    let confidence = 0.95;
    if (matchedRules.length === 0) {
      confidence = 0.98;
    } else if (matchedRules.length === 1 && matchedRules[0].severity === "LOW") {
      confidence = 0.85;
    }

    const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

    return {
      requestId,
      isMalicious,
      decision: policyResult.decision,
      riskScore,
      riskLevel,
      categories,
      signals,
      triggeredRuleIds,
      sanitizedPrompt,
      reasoning: policyResult.reasoning,
      latencyMs,
      policyApplied: policyResult.policyApplied,
      confidence,
      disclaimer: SECURITY_DISCLAIMER,
    };
  } catch (err: unknown) {
    // FAIL-CLOSED ARCHITECTURE: Never fail open on unexpected engine exceptions
    const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
    const errorMessage = err instanceof Error ? err.message : String(err);

    return {
      requestId,
      isMalicious: true,
      decision: "BLOCK",
      riskScore: 100,
      riskLevel: "CRITICAL",
      categories: ["DIRECT_INJECTION"],
      signals: [
        {
          source: "POLICY",
          id: "FAIL_CLOSED_EXCEPTION",
          severity: "CRITICAL",
          category: "DIRECT_INJECTION",
          detail: `Internal engine exception: ${errorMessage}`,
        },
      ],
      triggeredRuleIds: ["FAIL-CLOSED-SYS"],
      sanitizedPrompt: null,
      reasoning: "Security evaluation encountered an unexpected internal error and failed closed to protect downstream systems.",
      latencyMs,
      policyApplied: {
        id: "fail-closed-fallback",
        name: "Fail-Closed Safety Fallback",
      },
      confidence: 1.0,
      disclaimer: SECURITY_DISCLAIMER,
    };
  }
}
