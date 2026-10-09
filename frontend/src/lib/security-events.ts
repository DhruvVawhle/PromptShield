"use client";

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseFirestore } from "./firebase";
import type { SecurityDecision } from "./demo/promptAnalyzer";

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
  sanitizedPrompt?: string | null;
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

export async function listSecurityEvents(
  uid: string,
  options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<SecurityEventWithId[]> {
  const db = getFirebaseFirestore();
  const constraints: QueryConstraint[] = [where("uid", "==", uid)];

  if (options.startDate) {
    constraints.push(where("timestamp", ">=", Timestamp.fromDate(options.startDate)));
  }
  if (options.endDate) {
    constraints.push(where("timestamp", "<=", Timestamp.fromDate(options.endDate)));
  }

  constraints.push(orderBy("timestamp", "desc"));

  if (options.limit) {
    constraints.push(limit(options.limit));
  }

  const q = query(collection(db, SECURITY_EVENTS_COLLECTION), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SecurityEvent, "timestamp"> & { timestamp: Timestamp }) }) as SecurityEvent & { id: string });
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
  const db = getFirebaseFirestore();
  const constraints: QueryConstraint[] = [where("uid", "==", uid)];

  if (options.startDate) {
    constraints.push(where("timestamp", ">=", Timestamp.fromDate(options.startDate)));
  }
  if (options.endDate) {
    constraints.push(where("timestamp", "<=", Timestamp.fromDate(options.endDate)));
  }

  constraints.push(orderBy("timestamp", "desc"));

  if (options.limit) {
    constraints.push(limit(options.limit));
  }

  const q = query(collection(db, SECURITY_EVENTS_COLLECTION), ...constraints);
  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SecurityEvent, "timestamp"> & { timestamp: Timestamp }) }) as SecurityEvent & { id: string });
      callback(events);
    },
    (error) => {
      if (onError) onError(error);
      else console.error("security_events subscription failed:", error);
    }
  );
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