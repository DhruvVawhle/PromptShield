"use client";

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseFirestore, getFirebaseAuth } from "./firebase";
import type { SecurityDecision } from "./demo/promptAnalyzer";

import type { IncidentStatus } from "./incidents";

export const SECURITY_EVENTS_COLLECTION = "security_events";

export interface SecurityEvent {
  uid: string;
  promptId: string;
  timestamp: Timestamp;
  riskScore: number;
  threatDetected: boolean;
  threatCategory: string | null;
  decision: SecurityDecision;
  policy: string | null;
  confidence: number | null;
  promptLength: number;
  model: string | null;
  prompt?: string;
  promptSnippet?: string;
  sanitizedPrompt?: string | null;
  status?: IncidentStatus;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

export interface CreateSecurityEventInput {
  promptId: string;
  riskScore: number;
  threatDetected: boolean;
  threatCategory: string | null;
  decision: SecurityDecision;
  policy: string | null;
  confidence: number | null;
  promptLength: number;
  model: string | null;
  prompt?: string;
  promptSnippet?: string;
  sanitizedPrompt?: string | null;
}

export type SecurityEventWithId = SecurityEvent & { id: string };

export async function createSecurityEvent(
  uid: string,
  input: CreateSecurityEventInput
): Promise<SecurityEventWithId> {
  const db = getFirebaseFirestore();
  const ref = await addDoc(collection(db, SECURITY_EVENTS_COLLECTION), {
    uid,
    ...input,
    timestamp: Timestamp.now(),
  });
  return {
    uid,
    ...input,
    timestamp: Timestamp.now(),
    id: ref.id,
  } as SecurityEventWithId;
}

function parseEventDoc(doc: any): SecurityEventWithId {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    threatDetected: Boolean(data.threatDetected ?? (data.isMalicious || (data.categories && data.categories.length > 0))),
    threatCategory: data.threatCategory ?? data.categories?.[0] ?? null,
    riskScore: typeof data.riskScore === "number" ? data.riskScore : 0,
    decision: data.decision ?? "ALLOW",
    promptLength: data.promptLength ?? (typeof data.promptSnippet === "string" ? data.promptSnippet.length : (data.prompt?.length ?? 0)),
    prompt: data.prompt ?? data.promptSnippet ?? null,
    promptSnippet: data.promptSnippet ?? data.prompt ?? null,
    timestamp: data.timestamp,
  } as SecurityEventWithId;
}

export async function listSecurityEvents(
  uid: string,
  options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<SecurityEventWithId[]> {
  try {
    const auth = getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();

    if (token) {
      const queryParams = new URLSearchParams();
      queryParams.set("limit", String(options.limit ?? 100));
      if (options.startDate) queryParams.set("startDate", options.startDate.toISOString());
      if (options.endDate) queryParams.set("endDate", options.endDate.toISOString());

      const res = await fetch(`/api/v1/incidents?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const incidents: any[] = data.incidents || [];
        let mapped: SecurityEventWithId[] = incidents.map((inc) => ({
          id: inc.id,
          uid: inc.uid || uid,
          promptId: inc.promptId || inc.id,
          timestamp: inc.timestamp,
          riskScore: typeof inc.riskScore === "number" ? inc.riskScore : 0,
          threatDetected: Boolean(inc.threatDetected ?? (inc.riskScore >= 50 || inc.threatCategory)),
          threatCategory: inc.threatCategory || null,
          decision: inc.decision || "ALLOW",
          policy: inc.policy || "Default Guardrail Policy",
          confidence: typeof inc.confidence === "number" ? inc.confidence : null,
          promptLength: inc.promptLength || (inc.prompt?.length ?? (inc.promptSnippet?.length ?? 0)),
          model: inc.model || "promptshield-v1",
          prompt: inc.prompt || inc.promptSnippet || null,
          promptSnippet: inc.promptSnippet || inc.prompt || null,
          sanitizedPrompt: inc.sanitizedPrompt ?? null,
          status: inc.status || "OPEN",
          resolutionNotes: inc.resolutionNotes || null,
          resolvedAt: inc.resolvedAt || null,
          resolvedBy: inc.resolvedBy || null,
        }));

        mapped.sort((a, b) => eventDate(b).getTime() - eventDate(a).getTime());
        if (options.startDate || options.endDate) {
          mapped = mapped.filter((ev) => {
            const d = eventDate(ev);
            if (options.startDate && d < options.startDate) return false;
            if (options.endDate && d > options.endDate) return false;
            return true;
          });
        }
        if (options.limit) {
          mapped = mapped.slice(0, options.limit);
        }
        return mapped;
      }
    }
  } catch (err) {
    console.warn("[listSecurityEvents] Failed to fetch from API, falling back:", err);
  }

  // Fallback to client Firestore query if available
  try {
    const db = getFirebaseFirestore();
    const constraints: QueryConstraint[] = [where("uid", "==", uid)];
    const q = query(collection(db, SECURITY_EVENTS_COLLECTION), ...constraints);
    const snap = await getDocs(q);
    let events = snap.docs.map(parseEventDoc);
    events.sort((a, b) => eventDate(b).getTime() - eventDate(a).getTime());
    if (options.startDate || options.endDate) {
      events = events.filter((ev) => {
        const d = eventDate(ev);
        if (options.startDate && d < options.startDate) return false;
        if (options.endDate && d > options.endDate) return false;
        return true;
      });
    }
    if (options.limit) {
      events = events.slice(0, options.limit);
    }
    return events;
  } catch (err) {
    console.error("Failed to query security events fallback:", err);
    return [];
  }
}

export function subscribeSecurityEvents(
  uid: string,
  options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {},
  callback: (events: SecurityEventWithId[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  let active = true;

  const runFetch = async () => {
    try {
      const rows = await listSecurityEvents(uid, options);
      if (active) {
        callback(rows);
      }
    } catch (e) {
      if (active && onError) {
        onError(e as Error);
      }
    }
  };

  // Immediate initial load
  void runFetch();

  // Poll every 3.5s to capture newly analyzed prompts or chat interactions in real time
  const intervalId = setInterval(() => {
    if (active) void runFetch();
  }, 3500);

  // Also refetch when window regains focus
  const onFocus = () => {
    if (active) void runFetch();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("focus", onFocus);
  }

  return () => {
    active = false;
    clearInterval(intervalId);
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", onFocus);
    }
  };
}

export function getPeriodDateRange(period: "7d" | "4w" | "30d"): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "4w":
      start.setDate(end.getDate() - 28);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
  }
  return { start, end };
}

export function getPreviousPeriodDateRange(period: "7d" | "4w" | "30d"): { start: Date; end: Date } {
  const current = getPeriodDateRange(period);
  const durationMs = current.end.getTime() - current.start.getTime();
  const prevEnd = new Date(current.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart, end: prevEnd };
}

export function computePercentageChange(current: number, previous: number): string | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return "+100%";
  const change = ((current - previous) / previous) * 100;
  if (change === 0) return "0%";
  const sign = change > 0 ? "+" : "";
  return `${sign}${Math.round(change)}%`;
}

export function groupEventsByDay(
  events: SecurityEventWithId[]
): Map<string, SecurityEventWithId[]> {
  const map = new Map<string, SecurityEventWithId[]>();
  for (const ev of events) {
    const date = ev.timestamp instanceof Timestamp ? ev.timestamp.toDate() : new Date(ev.timestamp);
    const key = date.toISOString().split("T")[0];
    const existing = map.get(key) || [];
    existing.push(ev);
    map.set(key, existing);
  }
  return map;
}

export function formatDayLabel(dateStr: string, period: "7d" | "4w" | "30d"): string {
  const date = new Date(dateStr);
  if (period === "7d" || period === "30d") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return `Week ${Math.ceil(date.getDate() / 7)}`;
}

export interface SecurityDashboardStats {
  totalAnalyzed: number;
  threatsDetected: number;
  avgRiskScore: number;
  allowed: number;
  warned: number;
  sanitized: number;
  blocked: number;
}

export function computeDashboardStats(events: SecurityEventWithId[]): SecurityDashboardStats {
  const stats: SecurityDashboardStats = {
    totalAnalyzed: events.length,
    threatsDetected: 0,
    avgRiskScore: 0,
    allowed: 0,
    warned: 0,
    sanitized: 0,
    blocked: 0,
  };
  if (events.length === 0) return stats;
  let riskSum = 0;
  for (const ev of events) {
    if (ev.threatDetected) stats.threatsDetected += 1;
    riskSum += typeof ev.riskScore === "number" ? ev.riskScore : 0;
    switch (ev.decision) {
      case "ALLOW": stats.allowed += 1; break;
      case "WARN": stats.warned += 1; break;
      case "SANITIZE": stats.sanitized += 1; break;
      case "BLOCK": stats.blocked += 1; break;
    }
  }
  stats.avgRiskScore = Math.round(riskSum / events.length);
  return stats;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function eventDate(ev: SecurityEventWithId): Date {
  return ev.timestamp instanceof Timestamp ? ev.timestamp.toDate() : new Date(ev.timestamp);
}

export interface ThreatsOverTimePoint {
  day: string;
  detected: number;
  blocked: number;
}

export function buildThreatsOverTime(
  events: SecurityEventWithId[],
  period: "7d" | "4w" | "30d"
): ThreatsOverTimePoint[] {
  const { start, end } = getPeriodDateRange(period);
  const days = period === "4w" ? 28 : period === "30d" ? 30 : 7;
  const buckets = new Map<string, { detected: number; blocked: number; label: string }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = dayKey(d);
    buckets.set(key, { detected: 0, blocked: 0, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
  }
  void start;
  for (const ev of events) {
    const key = dayKey(eventDate(ev));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (ev.threatDetected) bucket.detected += 1;
    if (ev.decision === "BLOCK") bucket.blocked += 1;
  }
  return [...buckets.entries()].map(([, b]) => ({ day: b.label, detected: b.detected, blocked: b.blocked }));
}

export interface DecisionsOverTimePoint {
  day: string;
  Allowed: number;
  Warned: number;
  Sanitized: number;
  Blocked: number;
}

export function buildDecisionsOverTime(
  events: SecurityEventWithId[],
  period: "7d" | "4w" | "30d"
): DecisionsOverTimePoint[] {
  const { end } = getPeriodDateRange(period);
  const days = period === "4w" ? 28 : period === "30d" ? 30 : 7;
  const buckets = new Map<string, DecisionsOverTimePoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = dayKey(d);
    buckets.set(key, { day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), Allowed: 0, Warned: 0, Sanitized: 0, Blocked: 0 });
  }
  for (const ev of events) {
    const bucket = buckets.get(dayKey(eventDate(ev)));
    if (!bucket) continue;
    switch (ev.decision) {
      case "ALLOW": bucket.Allowed += 1; break;
      case "WARN": bucket.Warned += 1; break;
      case "SANITIZE": bucket.Sanitized += 1; break;
      case "BLOCK": bucket.Blocked += 1; break;
    }
  }
  return [...buckets.values()];
}

export interface ThreatCategorySlice {
  name: string;
  value: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Prompt Injection": "var(--severity-critical)",
  "Sensitive Data": "var(--severity-high)",
  "System Prompt Extraction": "var(--severity-high)",
  "Jailbreak": "var(--severity-medium)",
  "Privilege Escalation": "var(--severity-medium)",
  "Obfuscation": "var(--severity-info)",
  "Policy Bypass": "var(--severity-info)",
};

export function threatCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "var(--severity-low)";
}

export function buildThreatCategories(events: SecurityEventWithId[]): ThreatCategorySlice[] {
  const counts = new Map<string, number>();
  for (const ev of events) {
    if (!ev.threatDetected || !ev.threatCategory) continue;
    counts.set(ev.threatCategory, (counts.get(ev.threatCategory) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value, color: threatCategoryColor(name) }))
    .sort((a, b) => b.value - a.value);
}

export function formatRelativeTime(timestamp: SecurityEventWithId["timestamp"]): string {
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}