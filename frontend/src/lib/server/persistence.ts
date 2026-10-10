import { adminDb } from "@/lib/firebase-admin";
import type { AnalysisResult } from "./security-types";
import { logAudit } from "./audit";

export async function persistSecurityEvent(uid: string, result: AnalysisResult, rawPrompt: string) {
  try {
    const eventRef = adminDb.collection("security_events").doc(result.requestId);
    
    // We do not persist the raw prompt if it's fully blocked and considered highly malicious, 
    // unless required by policy. But user constraints: "Do not log raw sensitive prompts unnecessarily."
    // Let's store a truncated version if it's blocked, or the full one if allowed/warned.
    // Actually, "Do not log raw sensitive prompts unnecessarily." If it's a prompt leak or sensitive data, 
    // we should definitely not log the full raw prompt.
    const isSensitive = result.categories.includes("SENSITIVE_DATA") || result.categories.includes("PROMPT_LEAK");
    const storedPrompt = isSensitive ? "[REDACTED DUE TO SENSITIVE CONTENT]" : rawPrompt.substring(0, 1000);

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
    // User requirement: "persistence failures do not silently bypass security enforcement."
    // If persistence fails, we should throw so the request fails closed?
    // Wait, if it throws, the `/api/ai` or `/api/v1/analyze` will catch it and return 500. This correctly fails closed.
    throw new Error("Failed to record security event. Request aborted to ensure strict auditing.");
  }
}
