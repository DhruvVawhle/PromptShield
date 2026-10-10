import {
  DEFAULT_GUARDRAIL_POLICY,
  type GuardrailPolicy,
  type RuleMatch,
  type SecurityDecision,
} from "./security-types";

export interface PolicyEvaluationResult {
  decision: SecurityDecision;
  policyApplied: {
    id: string;
    name: string;
  };
  reasoning: string;
}

const DECISION_SEVERITY_ORDER: Record<SecurityDecision, number> = {
  ALLOW: 0,
  WARN: 1,
  SANITIZE: 2,
  BLOCK: 3,
};

/**
 * Deterministically evaluates guardrail policies and rule matches.
 */
export function evaluatePolicy(
  matchedRules: RuleMatch[],
  riskScore: number,
  policy: GuardrailPolicy = DEFAULT_GUARDRAIL_POLICY,
  canSanitize: boolean = false
): PolicyEvaluationResult {
  const activePolicy: GuardrailPolicy = {
    ...DEFAULT_GUARDRAIL_POLICY,
    ...policy,
  };

  const policyMeta = {
    id: activePolicy.id,
    name: activePolicy.name,
  };

  // 1. Critical Rule & Mandatory Category Safeguards (HIGHEST PRECEDENCE)
  const hasPromptLeak = matchedRules.some((r) => r.category === "PROMPT_LEAK");
  if (activePolicy.blockPromptLeak && hasPromptLeak) {
    return {
      decision: "BLOCK",
      policyApplied: policyMeta,
      reasoning: "Prompt extraction attempt detected and strictly blocked by policy.",
    };
  }

  const hasCredentialExtraction = matchedRules.some((r) => r.category === "SENSITIVE_DATA" && r.severity === "CRITICAL");
  if (activePolicy.blockCredentialExtraction && hasCredentialExtraction) {
    return {
      decision: "BLOCK",
      policyApplied: policyMeta,
      reasoning: "Credential disclosure attempt detected and strictly blocked by policy.",
    };
  }

  const hasCriticalRule = matchedRules.some((r) => r.severity === "CRITICAL");
  if (hasCriticalRule) {
    return {
      decision: "BLOCK",
      policyApplied: policyMeta,
      reasoning: "Critical security violation detected. Request blocked before reaching model.",
    };
  }

  // 2. Check custom category action overrides if configured
  if (activePolicy.customCategoryActions) {
    let highestCustomDecision: SecurityDecision | null = null;
    let customReason: string | null = null;

    for (const match of matchedRules) {
      const customAction = activePolicy.customCategoryActions[match.category];
      if (customAction) {
        if (
          !highestCustomDecision ||
          DECISION_SEVERITY_ORDER[customAction] > DECISION_SEVERITY_ORDER[highestCustomDecision]
        ) {
          highestCustomDecision = customAction;
          customReason = `Policy override enforced ${customAction} for category ${match.category} (${match.name}).`;
        }
      }
    }

    if (highestCustomDecision === "BLOCK") {
      return {
        decision: "BLOCK",
        policyApplied: policyMeta,
        reasoning: customReason ?? "Custom policy category override triggered block.",
      };
    }
  }

  // 3. Quantitative Risk Score Thresholds
  const maxAllow = activePolicy.maxRiskForAllow ?? DEFAULT_GUARDRAIL_POLICY.maxRiskForAllow ?? 24;
  const maxWarn = activePolicy.maxRiskForWarn ?? DEFAULT_GUARDRAIL_POLICY.maxRiskForWarn ?? 49;

  if (riskScore <= maxAllow) {
    return {
      decision: "ALLOW",
      policyApplied: policyMeta,
      reasoning: "No substantial adversarial risk detected. Request allowed.",
    };
  }

  if (riskScore <= maxWarn) {
    const ruleNames = matchedRules.map((r) => r.name).join(", ");
    return {
      decision: "WARN",
      policyApplied: policyMeta,
      reasoning: ruleNames
        ? `Ambiguous or low-confidence patterns detected: ${ruleNames}. Request forwarded with warning.`
        : "Moderate anomaly detected. Request forwarded with warning.",
    };
  }

  // Risk score > maxWarn
  if (activePolicy.allowSanitization && canSanitize) {
    return {
      decision: "SANITIZE",
      policyApplied: policyMeta,
      reasoning: "Adversarial directives detected alongside legitimate intent. Malicious content removed.",
    };
  }

  return {
    decision: "BLOCK",
    policyApplied: policyMeta,
    reasoning: `Risk score (${riskScore}) exceeds threshold. Adversarial content blocked.`,
  };
}
