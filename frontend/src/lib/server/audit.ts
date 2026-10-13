import { adminDb } from "@/lib/firebase-admin";
import { type AuditAction, VALID_AUDIT_ACTIONS } from "@/lib/audit-logs";

export { VALID_AUDIT_ACTIONS, type AuditAction };

export interface AuditRecord {
  uid: string;
  action: AuditAction;
  details: Record<string, any>;
  timestamp: string;
}

export async function logAudit(uid: string, action: AuditAction, details: Record<string, any>): Promise<void> {
  try {
    await adminDb.collection("audit_logs").add({
      uid,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    throw new Error(`Audit logging failed for action ${action}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
