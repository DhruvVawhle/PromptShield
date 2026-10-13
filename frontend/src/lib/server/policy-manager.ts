import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_GUARDRAIL_POLICY, type GuardrailPolicy, type AttackCategory } from "./security-types";

const CATEGORY_MAP: Record<string, AttackCategory[]> = {
  "Prompt Security": ["DIRECT_INJECTION", "INDIRECT_INJECTION", "JAILBREAK", "PROMPT_LEAK"],
  "Data Protection": ["SENSITIVE_DATA"],
  "Content Safety": ["ROLE_ESCALATION"],
  "Access Control": ["POLICY_BYPASS"],
  "Code Security": ["OBFUSCATION"]
};

const ACTION_SEVERITY: Record<string, number> = {
  BLOCK: 3,
  SANITIZE: 2,
  WARN: 1,
  ALLOW: 0,
};

/**
 * Retrieves and deterministically combines active guardrail policies for a user.
 *
 * Conflict Resolution Precedence:
 * 1. Strictest Action Wins (Defense-in-Depth):
 *    BLOCK (3) > SANITIZE (2) > WARN (1) > ALLOW (0).
 *    A more restrictive policy always overrides a more permissive one.
 * 2. Recency Tiebreak:
 *    If conflicting policies have identical action severity, the most recently
 *    updated policy (newest updatedAt) wins.
 * 3. Document ID Tiebreak:
 *    Deterministic alphabetical tiebreak on document ID if timestamps match.
 *
 * This guarantees deterministic evaluation independent of Firestore query order.
 */
export async function getActivePolicyForUser(uid: string): Promise<GuardrailPolicy> {
  const policiesSnap = await adminDb.collection("policies")
    .where("uid", "==", uid)
    .where("status", "==", "Active")
    .get();

  if (policiesSnap.empty) {
    return DEFAULT_GUARDRAIL_POLICY;
  }

  // Deterministically sort documents: newest updatedAt first, then tiebreak by doc ID
  const sortedDocs = [...policiesSnap.docs].sort((a, b) => {
    const aData = a.data();
    const bData = b.data();
    const aTime = aData.updatedAt ? new Date(aData.updatedAt).getTime() : 0;
    const bTime = bData.updatedAt ? new Date(bData.updatedAt).getTime() : 0;
    if (bTime !== aTime) {
      return bTime - aTime;
    }
    return a.id.localeCompare(b.id);
  });

  // Clone default policy
  const combinedPolicy: GuardrailPolicy = {
    id: "custom-" + uid,
    name: "Custom User Policy",
    maxRiskForAllow: DEFAULT_GUARDRAIL_POLICY.maxRiskForAllow,
    customCategoryActions: { ...DEFAULT_GUARDRAIL_POLICY.customCategoryActions }
  };

  for (const doc of sortedDocs) {
    const data = doc.data();
    const action = data.action;

    // Validate action is supported
    if (!action || !(action in ACTION_SEVERITY)) {
      continue;
    }

    // Apply category mappings with strictest-action precedence
    if (data.category && CATEGORY_MAP[data.category]) {
      for (const attackCat of CATEGORY_MAP[data.category]) {
        const existingAction = combinedPolicy.customCategoryActions?.[attackCat];
        if (!existingAction) {
          combinedPolicy.customCategoryActions![attackCat] = action;
        } else {
          const existingSeverity = ACTION_SEVERITY[existingAction] ?? -1;
          const newSeverity = ACTION_SEVERITY[action];
          // Stricter action wins over less strict action
          if (newSeverity > existingSeverity) {
            combinedPolicy.customCategoryActions![attackCat] = action;
          }
          // If equal severity, newest policy already claimed it since sortedDocs is newest first
        }
      }
    }
  }

  return combinedPolicy;
}
