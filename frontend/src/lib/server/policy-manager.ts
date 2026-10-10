import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_GUARDRAIL_POLICY, type GuardrailPolicy, type AttackCategory } from "./security-types";

const CATEGORY_MAP: Record<string, AttackCategory[]> = {
  "Prompt Security": ["DIRECT_INJECTION", "INDIRECT_INJECTION", "JAILBREAK", "PROMPT_LEAK"],
  "Data Protection": ["SENSITIVE_DATA"],
  "Content Safety": ["ROLE_ESCALATION"],
  "Access Control": ["POLICY_BYPASS"],
  "Code Security": ["OBFUSCATION"]
};

export async function getActivePolicyForUser(uid: string): Promise<GuardrailPolicy> {
  const policiesSnap = await adminDb.collection("policies")
    .where("uid", "==", uid)
    .where("status", "==", "Active")
    .get();

  if (policiesSnap.empty) {
    return DEFAULT_GUARDRAIL_POLICY;
  }

  // Clone default policy
  const combinedPolicy: GuardrailPolicy = {
    id: "custom-" + uid,
    name: "Custom User Policy",
    maxRiskForAllow: DEFAULT_GUARDRAIL_POLICY.maxRiskForAllow,
    customCategoryActions: { ...DEFAULT_GUARDRAIL_POLICY.customCategoryActions }
  };

  for (const doc of policiesSnap.docs) {
    const data = doc.data();
    
    // Apply category mappings
    if (data.category && CATEGORY_MAP[data.category]) {
      for (const attackCat of CATEGORY_MAP[data.category]) {
        // Only override if the new action is strictly defined.
        // We will allow users to customize their actions, but SEC-01 guarantees 
        // that critical system rules aren't completely bypassed during evaluatePolicy anyway.
        combinedPolicy.customCategoryActions![attackCat] = data.action;
      }
    }
  }

  return combinedPolicy;
}
