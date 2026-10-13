import { getFirebaseAuth } from "./firebase";

export type HealthState = "healthy" | "degraded" | "unhealthy";

export interface DependencyStatus {
  name: string;
  category: "database" | "cache" | "gateway" | "security_engine";
  status: HealthState;
  required: boolean;
  message: string;
  latencyMs: number;
  lastChecked: string;
  details?: Record<string, unknown>;
}

export interface LivenessStatus {
  status: "alive";
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  nodeVersion: string;
}

export interface SystemStatusResponse {
  status: HealthState;
  timestamp: string;
  liveness: LivenessStatus;
  readiness: {
    status: HealthState;
    dependencies: DependencyStatus[];
  };
}

export async function fetchSystemStatus(fresh = false): Promise<SystemStatusResponse> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error("Authentication required to access system status.");
  }

  const url = fresh ? "/api/v1/system/status?fresh=true" : "/api/v1/system/status";

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || `Failed to fetch system status (HTTP ${res.status})`);
  }

  return res.json();
}

export function getHealthTone(status: HealthState): "allow" | "warn" | "block" {
  switch (status) {
    case "healthy":
      return "allow";
    case "degraded":
      return "warn";
    case "unhealthy":
      return "block";
    default:
      return "warn";
  }
}
