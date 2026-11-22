import { getFirebaseAuth } from "./firebase";

export type AuditAction = 
  | "POLICY_CREATED" 
  | "POLICY_UPDATED" 
  | "POLICY_DELETED" 
  | "POLICY_ACTIVATION_CHANGED"
  | "UNAUTHORIZED_ACCESS_ATTEMPT"
  | "SECURITY_DECISION"
  | "INCIDENT_STATUS_UPDATED"
  | "INCIDENT_RESOLVED"
  | "USER_ROLE_UPDATED"
  | "USER_INVITED"
  | "AUDIT_VERIFIED"
  | "INTEGRITY_CHECK_FAILED";

export const VALID_AUDIT_ACTIONS: readonly AuditAction[] = [
  "POLICY_CREATED",
  "POLICY_UPDATED",
  "POLICY_DELETED",
  "POLICY_ACTIVATION_CHANGED",
  "UNAUTHORIZED_ACCESS_ATTEMPT",
  "SECURITY_DECISION",
  "INCIDENT_STATUS_UPDATED",
  "INCIDENT_RESOLVED",
  "USER_ROLE_UPDATED",
  "USER_INVITED",
  "AUDIT_VERIFIED",
  "INTEGRITY_CHECK_FAILED",
];

export interface AuditLogItem {
  id: string;
  action: AuditAction;
  timestamp: string;
  details: Record<string, any>;
  previousHash?: string;
  recordHash?: string;
  signature?: string;
  keyId?: string;
  isVerified?: boolean;
}

export interface AuditLogsResponse {
  logs: AuditLogItem[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface FetchAuditLogsOptions {
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}

export async function fetchAuditLogs(
  options: FetchAuditLogsOptions = {}
): Promise<AuditLogsResponse> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error("Authentication required to access audit logs.");
  }

  const queryParams = new URLSearchParams();
  if (options.action) queryParams.set("action", options.action);
  if (options.startDate) queryParams.set("startDate", options.startDate);
  if (options.endDate) queryParams.set("endDate", options.endDate);
  if (options.limit) queryParams.set("limit", options.limit.toString());
  if (options.cursor) queryParams.set("cursor", options.cursor);

  const url = `/api/v1/audit-logs?${queryParams.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || `Failed to fetch audit logs (HTTP ${res.status})`);
  }

  return res.json();
}

export async function verifyAuditLogsIntegrity(): Promise<{
  verified: boolean;
  totalRecords: number;
  validCount: number;
  tamperedCount: number;
  chainIntact: boolean;
  details?: string;
}> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error("Authentication required to verify audit logs.");
  }

  const res = await fetch("/api/v1/audit-logs/verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || `Audit verification failed (HTTP ${res.status})`);
  }

  return res.json();
}

export function getAuditActionTone(action: string): "allow" | "warn" | "sanitize" | "block" | "info" {
  switch (action) {
    case "POLICY_CREATED":
    case "INCIDENT_RESOLVED":
    case "AUDIT_VERIFIED":
      return "allow";
    case "POLICY_UPDATED":
    case "POLICY_ACTIVATION_CHANGED":
    case "INCIDENT_STATUS_UPDATED":
    case "USER_ROLE_UPDATED":
    case "USER_INVITED":
      return "info";
    case "POLICY_DELETED":
      return "warn";
    case "UNAUTHORIZED_ACCESS_ATTEMPT":
    case "INTEGRITY_CHECK_FAILED":
      return "block";
    case "SECURITY_DECISION":
      return "sanitize";
    default:
      return "info";
  }
}

export function formatAuditActionLabel(action: string): string {
  switch (action) {
    case "POLICY_CREATED":
      return "Policy Created";
    case "POLICY_UPDATED":
      return "Policy Updated";
    case "POLICY_DELETED":
      return "Policy Deleted";
    case "POLICY_ACTIVATION_CHANGED":
      return "Status Changed";
    case "UNAUTHORIZED_ACCESS_ATTEMPT":
      return "Unauthorized Access";
    case "SECURITY_DECISION":
      return "Security Decision";
    case "INCIDENT_STATUS_UPDATED":
      return "Incident Status Updated";
    case "INCIDENT_RESOLVED":
      return "Incident Resolved";
    case "USER_ROLE_UPDATED":
      return "User Role Updated";
    case "USER_INVITED":
      return "User Invited";
    case "AUDIT_VERIFIED":
      return "Audit Integrity Verified";
    case "INTEGRITY_CHECK_FAILED":
      return "Audit Integrity Failed";
    default:
      return action;
  }
}
