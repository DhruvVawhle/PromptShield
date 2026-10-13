import { getFirebaseAuth } from "./firebase";

export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "FALSE_POSITIVE";

export const VALID_INCIDENT_STATUSES: readonly IncidentStatus[] = [
  "OPEN",
  "INVESTIGATING",
  "RESOLVED",
  "FALSE_POSITIVE",
];

export interface IncidentItem {
  id: string;
  promptId: string;
  timestamp: string;
  riskScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  threatCategory: string;
  categories: string[];
  decision: "ALLOW" | "WARN" | "SANITIZE" | "BLOCK";
  status: IncidentStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  promptSnippet: string | null;
  triggeredRuleIds: string[];
  policyId: string | null;
  latencyMs: number | null;
}

export interface IncidentsResponse {
  incidents: IncidentItem[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface FetchIncidentsOptions {
  status?: string;
  severity?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}

export interface UpdateIncidentInput {
  status?: IncidentStatus;
  resolutionNotes?: string;
}

export async function fetchIncidents(
  options: FetchIncidentsOptions = {}
): Promise<IncidentsResponse> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error("Authentication required to access incidents.");
  }

  const queryParams = new URLSearchParams();
  if (options.status) queryParams.set("status", options.status);
  if (options.severity) queryParams.set("severity", options.severity);
  if (options.category) queryParams.set("category", options.category);
  if (options.startDate) queryParams.set("startDate", options.startDate);
  if (options.endDate) queryParams.set("endDate", options.endDate);
  if (options.limit) queryParams.set("limit", options.limit.toString());
  if (options.cursor) queryParams.set("cursor", options.cursor);

  const url = `/api/v1/incidents?${queryParams.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || `Failed to fetch incidents (HTTP ${res.status})`);
  }

  return res.json();
}

export async function fetchIncidentById(id: string): Promise<IncidentItem> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error("Authentication required to access incident.");
  }

  const res = await fetch(`/api/v1/incidents/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || `Failed to fetch incident (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.incident;
}

export async function updateIncident(
  id: string,
  input: UpdateIncidentInput
): Promise<IncidentItem> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error("Authentication required to update incident.");
  }

  const res = await fetch(`/api/v1/incidents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || `Failed to update incident (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.incident;
}

export function getIncidentStatusTone(status: IncidentStatus): "allow" | "warn" | "block" | "info" {
  switch (status) {
    case "RESOLVED":
      return "allow";
    case "FALSE_POSITIVE":
      return "info";
    case "INVESTIGATING":
      return "warn";
    case "OPEN":
    default:
      return "block";
  }
}

export function formatIncidentStatus(status: IncidentStatus): string {
  switch (status) {
    case "OPEN":
      return "Open";
    case "INVESTIGATING":
      return "Investigating";
    case "RESOLVED":
      return "Resolved";
    case "FALSE_POSITIVE":
      return "False Positive";
    default:
      return status;
  }
}
