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
 *
 * Precedence Hierarchy:
 * 1. Tier 1: Mandatory Safeguards & Critical System Rules (HIGHEST)
 *    - Prompt leak extraction (PROMPT_LEAK)
 *    - Critical credential disclosures (SENSITIVE_DATA CRITICAL)
 *    - Any CRITICAL rule match
 *    -> Strictly BLOCKS. Cannot be overridden or downgraded by any user policy.
 *
 * 2. Tier 2: Custom Category Action Overrides
 *    - Evaluated if matched rules have actions defined in activePolicy.customCategoryActions.
 *    - Severity ranking: BLOCK (3) > SANITIZE (2) > WARN (1) > ALLOW (0).
 *    - BLOCK: Immediately blocks.
 *    - SANITIZE: Sanitizes if viable and allowed; fails closed to BLOCK if sanitization is unsafe.
 *    - WARN / ALLOW: Applies if all matched rules are covered or uncovered rules do not exceed thresholds.
 *
 * 3. Tier 3: Quantitative Risk Score Thresholds (BASELINE HEURISTICS)
 *    - Applies for rules not covered by custom category actions.
 *    - Evaluates cumulative risk score against maxRiskForAllow and maxRiskForWarn.
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

  // 1. Critical Rule & Mandatory Category Safeguards (HIGHEST PRECEDENCE - CANNOT BE OVERRIDDEN)
  const hasPromptLeak = matchedRules.some((r) => r.category === "PROMPT_LEAK");
  if (activePolicy.blockPromptLeak && hasPromptLeak) {
    return {
      decision: "BLOCK",
      policyApplied: policyMeta,
      reasoning: "Prompt extraction attempt detected and strictly blocked by mandatory safeguard.",
    };
  }

  const hasCredentialExtraction = matchedRules.some((r) => r.category === "SENSITIVE_DATA" && r.severity === "CRITICAL");
  if (activePolicy.blockCredentialExtraction && hasCredentialExtraction) {
    return {
      decision: "BLOCK",
      policyApplied: policyMeta,
      reasoning: "Credential disclosure attempt detected and strictly blocked by mandatory safeguard.",
    };
  }

  const hasCriticalRule = matchedRules.some((r) => r.severity === "CRITICAL");
  if (hasCriticalRule) {
    return {
      decision: "BLOCK",
      policyApplied: policyMeta,
      reasoning: "Critical security violation detected. Request strictly blocked before reaching model.",
    };
  }

  // 2. Custom Category Action Overrides
  if (activePolicy.customCategoryActions && matchedRules.length > 0) {
    let highestCustomDecision: SecurityDecision | null = null;
    let customReason: string | null = null;
    const coveredRules: RuleMatch[] = [];
    const uncoveredRules: RuleMatch[] = [];

    for (const match of matchedRules) {
      const customAction = activePolicy.customCategoryActions[match.category];
      if (customAction && customAction in DECISION_SEVERITY_ORDER) {
        coveredRules.push(match);
        if (
          !highestCustomDecision ||
          DECISION_SEVERITY_ORDER[customAction] > DECISION_SEVERITY_ORDER[highestCustomDecision]
        ) {
          highestCustomDecision = customAction;
          customReason = `Policy override enforced ${customAction} for category ${match.category} (${match.name}).`;
        }
      } else {
        uncoveredRules.push(match);
      }
    }

    if (highestCustomDecision) {
      if (highestCustomDecision === "BLOCK") {
        return {
          decision: "BLOCK",
          policyApplied: policyMeta,
          reasoning: customReason ?? "Custom policy category override triggered block.",
        };
      }

      if (highestCustomDecision === "SANITIZE") {
        if (canSanitize && activePolicy.allowSanitization !== false) {
          return {
            decision: "SANITIZE",
            policyApplied: policyMeta,
            reasoning: customReason ?? "Custom policy category override enforced sanitization.",
          };
        } else {
          // If sanitization is impossible or unsafe, fail closed to BLOCK
          return {
            decision: "BLOCK",
            policyApplied: policyMeta,
            reasoning: `${customReason ?? "Custom policy category override requested sanitization"}, but prompt could not be safely sanitized. Failing closed to BLOCK.`,
          };
        }
      }

      // For WARN or ALLOW custom actions:
      // If there are uncovered rules, check if those uncovered rules trigger a BLOCK in Tier 3
      const uncoveredScore = uncoveredRules.reduce((sum, r) => sum + r.weight, 0);
      const maxWarn = activePolicy.maxRiskForWarn ?? DEFAULT_GUARDRAIL_POLICY.maxRiskForWarn ?? 49;

      if (uncoveredRules.length === 0 || uncoveredScore <= maxWarn) {
        if (highestCustomDecision === "WARN") {
          return {
            decision: "WARN",
            policyApplied: policyMeta,
            reasoning: customReason ?? "Custom policy category override enforced warning.",
          };
        }

        if (highestCustomDecision === "ALLOW" && (uncoveredRules.length === 0 || uncoveredScore <= (activePolicy.maxRiskForAllow ?? DEFAULT_GUARDRAIL_POLICY.maxRiskForAllow ?? 24))) {
          return {
            decision: "ALLOW",
            policyApplied: policyMeta,
            reasoning: customReason ?? "Custom policy category override permitted request.",
          };
        }
      }
    }
  }

  // 3. Quantitative Risk Score Thresholds (BASELINE HEURISTICS)
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
