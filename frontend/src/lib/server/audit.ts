import { adminDb } from "@/lib/firebase-admin";

export type AuditAction = 
  | "POLICY_CREATED" 
  | "POLICY_UPDATED" 
  | "POLICY_DELETED" 
  | "POLICY_ACTIVATION_CHANGED"
  | "UNAUTHORIZED_ACCESS_ATTEMPT"
  | "SECURITY_DECISION";

export interface AuditRecord {
  uid: string;
  action: AuditAction;
  details: Record<string, any>;
  timestamp: string;
}

export async function logAudit(uid: string, action: AuditAction, details: Record<string, any>) {
  try {
    await adminDb.collection("audit_logs").add({
      uid,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Don't throw for now to avoid breaking the main flow if audit logging fails
  }
}
