"use client";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseFirestore } from "./firebase";

export const POLICIES_COLLECTION = "policies";

export type PolicyAction = "BLOCK" | "SANITIZE" | "WARN" | "ALLOW";
export type PolicyStatus = "Active" | "Disabled";
export type PolicyCategory = "Prompt Security" | "Data Protection" | "Content Safety" | "Access Control" | "Code Security" | "Custom";

export interface Policy {
  uid: string;
  name: string;
  description: string;
  category: PolicyCategory | string;
  action: PolicyAction;
  status: PolicyStatus;
  isSystem: boolean;
  conditions: string; // Simplification for now, just text
  updatedAt: Timestamp;
}

export type PolicyWithId = Policy & { id: string };

export type CreatePolicyInput = Omit<Policy, "uid" | "updatedAt" | "isSystem">;

import { getFirebaseAuth } from "./firebase";

export async function createPolicy(uid: string, input: CreatePolicyInput): Promise<PolicyWithId> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch("/api/v1/policies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to create policy");
  }
  const data = await res.json();
  return data.policy;
}

export async function updatePolicy(id: string, updates: Partial<Omit<Policy, "uid" | "isSystem" | "updatedAt">>): Promise<void> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/v1/policies/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to update policy");
  }
}

export async function deletePolicy(id: string): Promise<void> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/v1/policies/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to delete policy");
  }
}

export function subscribePolicies(
  uid: string,
  callback: (policies: PolicyWithId[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, POLICIES_COLLECTION),
    where("uid", "==", uid),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const policies = snap.docs.map(
        (d) =>
          ({
            id: d.id,
            ...(d.data() as Omit<Policy, "updatedAt"> & { updatedAt: Timestamp }),
          } as PolicyWithId)
      );
      callback(policies);
    },
    (error) => {
      if (onError) onError(error);
      else console.error("policies subscription failed:", error);
    }
  );
}

export function formatRelativeTime(timestamp: PolicyWithId["updatedAt"]): string {
  if (!timestamp) return "Just now";
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
