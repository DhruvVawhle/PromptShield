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

export async function createPolicy(uid: string, input: CreatePolicyInput): Promise<PolicyWithId> {
  const db = getFirebaseFirestore();
  const ref = await addDoc(collection(db, POLICIES_COLLECTION), {
    uid,
    ...input,
    isSystem: false,
    updatedAt: Timestamp.now(),
  });
  return {
    uid,
    ...input,
    isSystem: false,
    updatedAt: Timestamp.now(),
    id: ref.id,
  } as PolicyWithId;
}

export async function updatePolicy(id: string, updates: Partial<Omit<Policy, "uid" | "isSystem" | "updatedAt">>): Promise<void> {
  const db = getFirebaseFirestore();
  const ref = doc(db, POLICIES_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deletePolicy(id: string): Promise<void> {
  const db = getFirebaseFirestore();
  const ref = doc(db, POLICIES_COLLECTION, id);
  await deleteDoc(ref);
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
