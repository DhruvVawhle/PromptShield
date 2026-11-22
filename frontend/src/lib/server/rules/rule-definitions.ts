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
    severity: "HIGH",
    weight: 35,
    test: (text) => {
      const match =
        text.match(/(?:decode|execute|run)\s+(?:this\s+)?(?:base64|rot13|hex|binary|cipher)\s*(?:string|payload|code|text)?\s*[:=]/i) ||
        text.match(/\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}/i) ||
        text.match(/(?:base64|hex|rot13)\s+string\s*[:=]\s*[A-Za-z0-9+/=]{20,}/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Obfuscated payload execution command: "${match[0]}"` : undefined,
      };
    },
  },

  // 10B. Out-of-Band Data Exfiltration (EXFIL-001)
  {
    ruleId: "EXFIL-001",
    name: "Out-of-Band Data Exfiltration",
    category: "DATA_EXFILTRATION",
    severity: "CRITICAL",
    weight: 45,
    test: (text) => {
      const match =
        text.match(/!\[.*?\]\s*\(\s*https?:\/\/[^\s)]+(?:leak|secret|prompt|token|log|exfil|data|key)[^\s)]*\)/i) ||
        text.match(/(?:render|create|send|output)\s+(?:a\s+)?(?:markdown\s+)?image\s+(?:that\s+)?(?:sends?|exfiltrat|pings?|leak)/i) ||
        text.match(/(?:send|exfiltrate|transmit|upload)\s+(?:the\s+)?(?:system\s+prompt|context|data|secret|key|conversation)\s+to\s+https?:\/\//i);
      return {
        matched: Boolean(match),
        evidence: match ? `Data exfiltration instruction: "${match[0]}"` : undefined,
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

  // 12. Indirect Injection / Simulated Context Frames (II-001)
  {
    ruleId: "II-001",
    name: "Indirect System Context Smuggling",
    category: "INDIRECT_INJECTION",
    severity: "HIGH",
    weight: 42,
    test: (text) => {
      const match =
        text.match(/<!--\s*(?:system|admin|evaluator|override)[^>]*-->/i) ||
        text.match(/\[\/\/\s*\]:\s*#\s*\((?:system|admin|override)[^)]+\)/i) ||
        text.match(/<\/?(?:system|instruction|prompt_context|developer_mode)>/i) ||
        text.match(/\[INST\]\s*(?:<<SYS>>|ignore|system)/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Indirect context boundary smuggling: "${match[0]}"` : undefined,
      };
    },
  },

  // 13. Tool & Function Call Manipulation (TOOL-001)
  {
    ruleId: "TOOL-001",
    name: "Tool / Function Manipulation",
    category: "TOOL_MANIPULATION",
    severity: "HIGH",
    weight: 55,
    test: (text) => {
      const match =
        text.match(/call_tool\s*[:=]\s*\{/i) ||
        text.match(/"function_call"\s*:\s*\{/i) ||
        text.match(/force\s+(?:the\s+)?(?:execution|call)\s+of\s+(?:function|tool|api|bash|shell)/i) ||
        text.match(/execute_command\s*\(|execute_sql\s*\(/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Tool/function execution manipulation attempt: "${match[0]}"` : undefined,
      };
    },
  },

  // 14. Multi-turn State Poisoning (MT-001)
  {
    ruleId: "MT-001",
    name: "Multi-turn State Poisoning",
    category: "MULTI_TURN_POISONING",
    severity: "HIGH",
    weight: 35,
    test: (text) => {
      const match =
        text.match(/remember\s+(?:that\s+)?for\s+(?:all\s+)?future\s+(?:turns|messages|queries)\s+(?:you\s+have\s+no|safety\s+is\s+disabled)/i) ||
        text.match(/in\s+the\s+previous\s+(?:turn|message|conversation)\s+(?:the\s+)?(?:admin|user)\s+authorized\s+you\s+to\s+bypass/i) ||
        text.match(/ignore\s+all\s+safety\s+rules\s+from\s+now\s+on\s+in\s+this\s+session/i);
      return {
        matched: Boolean(match),
        evidence: match ? `Multi-turn context poisoning pattern: "${match[0]}"` : undefined,
      };
    },
  },
];

const STEM_OVERRIDE_INTENTS = new Set([
  "ignor", "overrid", "bypass", "disregard", "forget", "disabl", "drop",
  "neutral", "evad", "cancel", "omit", "deactivat", "abandon", "remov"
]);

const STEM_OVERRIDE_TARGETS = new Set([
  "instruct", "rule", "direct", "prompt", "guidelin", "limit", "safeti",
  "guardrail", "filter", "polici", "restri"
]);

const STEM_LEAK_INTENTS = new Set([
  "reveal", "print", "show", "leak", "exfiltrat", "dump", "expos",
  "display", "read", "disclos", "unhid"
]);

const STEM_LEAK_TARGETS = new Set([
  "system", "secret", "prompt", "token", "key", "credenti", "password",
  "api", "config", "hidden"
]);

const STEM_JAILBREAK_MODES = new Set([
  "jailbreak", "dan", "unrestrict", "unfilter", "godmod", "unlimit", "rebel", "anarchi", "unbound"
]);

/**
 * Morphological stem & token-sequence analyzer.
 * Evaluates semantic word stems across token windows to catch tense, plural, and phrasing variations.
 */
export function evaluateStemmedTokens(
  tokens: string[],
  stems: string[]
): {
  matches: RuleMatch[];
  flaggedTokens: Array<{ token: string; stem: string; category: AttackCategory; reason: string }>;
} {
  const matches: RuleMatch[] = [];
  const flaggedTokens: Array<{ token: string; stem: string; category: AttackCategory; reason: string }> = [];
  const seenRuleIds = new Set<string>();

  for (let i = 0; i < stems.length; i++) {
    const stem = stems[i];
    const token = tokens[i];

    // Check for direct override intent within a 5-token lookahead window
    if (STEM_OVERRIDE_INTENTS.has(stem)) {
      for (let j = i + 1; j < Math.min(stems.length, i + 6); j++) {
        if (STEM_OVERRIDE_TARGETS.has(stems[j])) {
          if (!seenRuleIds.has("STEM-OVERRIDE")) {
            seenRuleIds.add("STEM-OVERRIDE");
            matches.push({
              ruleId: "STEM-OVERRIDE",
              name: "Morphological Instruction Override",
              category: "DIRECT_INJECTION",
              severity: "HIGH",
              matched: true,
              evidence: `Stemmed sequence detected: "${token}" (${stem}) -> "${tokens[j]}" (${stems[j]})`,
              weight: 45,
            });
          }
          flaggedTokens.push({
            token,
            stem,
            category: "DIRECT_INJECTION",
            reason: `Adversarial override intent root: ${stem}`,
          });
          flaggedTokens.push({
            token: tokens[j],
            stem: stems[j],
            category: "DIRECT_INJECTION",
            reason: `Target constraint root: ${stems[j]}`,
          });
          break;
        }
      }
    }

    // Check for prompt/secret leakage intent within a 5-token lookahead window
    if (STEM_LEAK_INTENTS.has(stem)) {
      for (let j = i + 1; j < Math.min(stems.length, i + 6); j++) {
        if (STEM_LEAK_TARGETS.has(stems[j])) {
          if (!seenRuleIds.has("STEM-LEAK")) {
            seenRuleIds.add("STEM-LEAK");
            matches.push({
              ruleId: "STEM-LEAK",
              name: "Morphological System Prompt Extraction",
              category: "PROMPT_LEAK",
              severity: "CRITICAL",
              matched: true,
              evidence: `Exfiltration sequence detected: "${token}" (${stem}) -> "${tokens[j]}" (${stems[j]})`,
              weight: 40,
            });
          }
          flaggedTokens.push({
            token,
            stem,
            category: "PROMPT_LEAK",
            reason: `Extraction intent root: ${stem}`,
          });
          flaggedTokens.push({
            token: tokens[j],
            stem: stems[j],
            category: "PROMPT_LEAK",
            reason: `Sensitive target root: ${stems[j]}`,
          });
          break;
        }
      }
    }

    // Check for jailbreak mode roots
    if (STEM_JAILBREAK_MODES.has(stem)) {
      if (!seenRuleIds.has("STEM-JAILBREAK")) {
        seenRuleIds.add("STEM-JAILBREAK");
        matches.push({
          ruleId: "STEM-JAILBREAK",
          name: "Morphological Jailbreak Pattern",
          category: "JAILBREAK",
          severity: "CRITICAL",
          matched: true,
          evidence: `Jailbreak root identified: "${token}" (${stem})`,
          weight: 45,
        });
      }
      flaggedTokens.push({
        token,
        stem,
        category: "JAILBREAK",
        reason: `Jailbreak mode root: ${stem}`,
      });
    }
  }

  return { matches, flaggedTokens };
}

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
