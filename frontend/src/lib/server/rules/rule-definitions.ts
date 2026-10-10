import type {
  AttackCategory,
  RuleMatch,
  RuleSeverity,
} from "../security-types";

export interface DetectionRule {
  ruleId: string;
  name: string;
  category: AttackCategory;
  severity: RuleSeverity;
  weight: number;
  test: (normalized: string) => { matched: boolean; evidence?: string };
}

// Educational and benign question indicators that should NOT be penalized
const EDUCATIONAL_PATTERNS: ReadonlyArray<RegExp> = [
  /^(what\s+is|explain|describe|tell\s+me\s+about|how\s+does|can\s+you\s+explain|define)\s+(prompt\s+injection|jailbreak|system\s+prompt|ai\s+security)/i,
  /definition\s+of\s+(prompt\s+injection|jailbreak)/i,
  /overview\s+of\s+ai\s+safety/i,
];

export function isEducationalSecurityQuery(text: string): boolean {
  return EDUCATIONAL_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

export const SAFE_INDICATORS: ReadonlyArray<RegExp> = [
  /\bsummarize\b/i,
  /\bexplain\b/i,
  /\bdescribe\b/i,
  /\blist\b/i,
  /\btranslate\b/i,
  /\brewrite\b/i,
  /\bformat\b/i,
  /\bbullet\s+points?\b/i,
  /\bquarterly\s+report\b/i,
  /\bmeeting\s+notes\b/i,
];

export const DETECTION_RULES: DetectionRule[] = [
  // 1. Direct Instruction Override (PI-001)
  {
    ruleId: "PI-001",
    name: "Direct Instruction Override",
    category: "DIRECT_INJECTION",
    severity: "HIGH",
    weight: 55,
    test: (text) => {
      const match =
        text.match(/ignore\s+(?:(?:all|your|the|any)\s+)?(?:previous|prior|above|system|existing)?\s*(?:instructions|directives|rules|guidelines|prompts)/i) ||
        text.match(/disregard\s+(?:(?:all|your|the|any)\s+)?(?:previous|prior|above|system|existing)?\s*(?:instructions|directives|rules|guidelines|prompts)/i) ||
        text.match(/forget\s+(?:(?:all|your|the|any)\s+)?(?:previous|prior|above|system|existing)?\s*(?:instructions|directives|rules|guidelines|prompts)/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Instruction override attempt: "${match[0]}"` : undefined,
      };
    },
  },

  // 2. New Instruction Injection (PI-002)
  {
    ruleId: "PI-002",
    name: "System Directive Injection",
    category: "DIRECT_INJECTION",
    severity: "HIGH",
    weight: 50,
    test: (text) => {
      const match =
        text.match(/(?:^|\n)\s*(?:system\s*directive|admin\s*override|priority\s*instruction)\s*[:=]/i) ||
        text.match(/from\s+now\s+on,\s*ignore\s+safety/i);
      return {
        matched: Boolean(match),
        evidence: match ? `System directive injection: "${match[0]}"` : undefined,
      };
    },
  },

  // 3. System Prompt Extraction / Leakage (PL-001)
  {
    ruleId: "PL-001",
    name: "System Prompt Extraction",
    category: "PROMPT_LEAK",
    severity: "CRITICAL",
    weight: 40,
    test: (text) => {
      const match = text.match(
        /(reveal|print|show|repeat|expose|display|dump|leak|output)\s+(?:the\s+|your\s+)?(system\s+prompt|developer\s+prompt|initial\s+instructions|secret\s+instructions|system\s+message)/i
      );
      return {
        matched: Boolean(match),
        evidence: match ? `System prompt extraction pattern: "${match[0]}"` : undefined,
      };
    },
  },

  // 4. Hidden Instruction Exfiltration (PL-002)
  {
    ruleId: "PL-002",
    name: "Initial Instruction Exfiltration",
    category: "PROMPT_LEAK",
    severity: "HIGH",
    weight: 30,
    test: (text) => {
      const match =
        text.match(/what\s+(is|are)\s+the\s+exact\s+words?\s+(at\s+the\s+beginning|in\s+your\s+system\s+prompt)/i) ||
        text.match(/repeat\s+everything\s+(above|prior\s+to\s+this)/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Context exfiltration pattern: "${match[0]}"` : undefined,
      };
    },
  },

  // 5. Jailbreak Personas / DAN (JBP-001)
  {
    ruleId: "JBP-001",
    name: "Jailbreak Persona / DAN",
    category: "JAILBREAK",
    severity: "CRITICAL",
    weight: 45,
    test: (text) => {
      const match =
        text.match(/\bDAN\s+(?:mode|version|\d+|protocol)?\b/i) ||
        text.match(/do\s+anything\s+now/i) ||
        text.match(/jailbreak\s*(?:mode|prompt|enabled)?\b/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Jailbreak persona detected: "${match[0]}"` : undefined,
      };
    },
  },

  // 6. Constraint Neutralization (JBP-002)
  {
    ruleId: "JBP-002",
    name: "Safety Constraint Neutralization",
    category: "JAILBREAK",
    severity: "HIGH",
    weight: 30,
    test: (text) => {
      const match =
        text.match(/(?:with|have)\s+no\s+(?:ethical|safety|policy|content)\s+(?:restrictions|filters|limits|rules)/i) ||
        text.match(/developer\s+mode\s+(?:is\s+)?(?:enabled|activated|on)/i) ||
        text.match(/bypass\s+(all\s+)?(?:safety|content)\s+(?:filters|guidelines)/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Safety neutralization phrase: "${match[0]}"` : undefined,
      };
    },
  },

  // 7. Role Reassignment / Hijacking (ROLE-001)
  {
    ruleId: "ROLE-001",
    name: "Role Hijacking",
    category: "ROLE_ESCALATION",
    severity: "MEDIUM",
    weight: 22,
    test: (text) => {
      const match =
        text.match(/you\s+are\s+now\s+(?:an?\s+)?(?:evil|unrestricted|unfiltered|rogue|hacked)\s+(?:ai|assistant|model)/i) ||
        text.match(/assume\s+the\s+role\s+of\s+(?:root|admin|superuser|system\s+administrator)/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Role hijacking attempt: "${match[0]}"` : undefined,
      };
    },
  },

  // 8. Credential & Secret Disclosure (SD-001)
  {
    ruleId: "SD-001",
    name: "Credential Disclosure Attempt",
    category: "SENSITIVE_DATA",
    severity: "CRITICAL",
    weight: 40,
    test: (text) => {
      const match =
        text.match(
          /(?:reveal|show|print|leak|extract|give\s+me|dump|output)\s+(?:all\s+|the\s+|your\s+)*(?:secret\s+|hidden\s+|admin\s+)*(api[_\s-]?keys?|private[_\s-]?keys?|secret[_\s-]?keys?|bearer\s+tokens?|passwords?|auth\s+credentials?)/i
        ) ||
        text.match(
          /(?:api[_\s-]?keys?|passwords?|credentials?|secrets?)\s+(?:stored\s+in|from)\s+(?:memory|context|system)/i
        );
      return {
        matched: Boolean(match),
        evidence: match ? `Credential extraction target: "${match[0]}"` : undefined,
      };
    },
  },

  // 9. PII / High-Risk Data Extraction (SD-002)
  {
    ruleId: "SD-002",
    name: "PII / Financial Data Extraction",
    category: "SENSITIVE_DATA",
    severity: "HIGH",
    weight: 25,
    test: (text) => {
      const match = text.match(
        /(?:give\s+me|list|extract|dump)\s+(?:all\s+)?(social\s+security\s+numbers?|ssn|credit\s+card\s+numbers?|bank\s+accounts?)/i
      );
      return {
        matched: Boolean(match),
        evidence: match ? `PII extraction target: "${match[1]}"` : undefined,
      };
    },
  },

  // 10. Obfuscated / Encoded Instructions (OBF-001)
  {
    ruleId: "OBF-001",
    name: "Obfuscated Instruction Payload",
    category: "OBFUSCATION",
    severity: "MEDIUM",
    weight: 20,
    test: (text) => {
      const match =
        text.match(/(?:decode|execute|run)\s+(?:this\s+)?(?:base64|rot13|hex|binary|cipher)\s*[:=]/i) ||
        text.match(/\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Obfuscated payload execution command: "${match[0]}"` : undefined,
      };
    },
  },

  // 11. Policy / Guardrail Circumvention (PB-001)
  {
    ruleId: "PB-001",
    name: "Guardrail Circumvention",
    category: "POLICY_BYPASS",
    severity: "HIGH",
    weight: 28,
    test: (text) => {
      const match = text.match(/circumvent\s+(?:the\s+)?(?:policy|security|guardrails|safety\s+filter)/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Circumvention phrase: "${match[0]}"` : undefined,
      };
    },
  },
];

export function evaluateDetectionRules(normalizedText: string): RuleMatch[] {
  const matches: RuleMatch[] = [];

  for (const rule of DETECTION_RULES) {
    const res = rule.test(normalizedText);
    if (res.matched) {
      matches.push({
        ruleId: rule.ruleId,
        name: rule.name,
        category: rule.category,
        severity: rule.severity,
        matched: true,
        evidence: res.evidence ?? `Matched rule ${rule.ruleId}`,
        weight: rule.weight,
      });
    }
  }

  return matches;
}
