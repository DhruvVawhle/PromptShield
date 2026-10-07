"use client";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseFirestore } from "./firebase";

export type UserProvider = "password" | "google" | "github";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  provider: UserProvider;
  role: "user" | "admin";
  createdAt: unknown;
  updatedAt: unknown;
}

export const USERS_COLLECTION = "users";

export type ProfileErrorKind = "offline" | "permission-denied" | "unknown";

export interface ProfileError {
  kind: ProfileErrorKind;
  message: string;
  raw: unknown;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const e = error as { message?: unknown } | null;
  if (e?.message && typeof e.message === "string") return e.message;
  try {
    return String(error);
  } catch {
    return "Unknown error";
  }
}

function errorCode(error: unknown): string {
  const e = error as { code?: unknown } | null;
  return typeof e?.code === "string" ? e.code : "";
}

export function classifyFirestoreError(error: unknown): ProfileErrorKind {
  const code = errorCode(error);
  const msg = errorMessage(error).toLowerCase();
  if (code === "permission-denied") return "permission-denied";
  if (msg.includes("client is offline") || msg.includes("failed to get document because the client is offline")) return "offline";
  if (code === "unavailable" || code === "deadline-exceeded") return "offline";
  if (msg.includes("offline") || msg.includes("unavailable") || msg.includes("could not reach cloud firestore backend") || msg.includes("timed out") || msg.includes("long-polling is blocked") || msg.includes("firestore.googleapis.com") || msg.includes("f60a5;firestore") ) return "offline";
  return "unknown";
}

export function toProfileError(error: unknown): ProfileError {
  const kind = classifyFirestoreError(error);
  const rawMsg = errorMessage(error);
  const message =
    kind === "offline"
      ? "Unable to connect to Firestore. Firestore may not be enabled for promptshield-fdea9 or firestore.googleapis.com is blocked. Check Firebase console -> Firestore Database -> Enable, verify rules allow users/{uid} where request.auth.uid == uid, then retry."
      : kind === "permission-denied"
        ? "You do not have permission to access this profile. Ensure Firestore rules allow users/{uid} where request.auth.uid == uid."
        : rawMsg;
  return { kind, message, raw: error };
}

function buildLocalProfile(user: User): UserProfile {
  const name = user.displayName?.trim() ?? user.email?.split("@")[0] ?? "User";
  const provider: UserProvider =
    user.providerData[0]?.providerId === "google.com"
      ? "google"
      : user.providerData[0]?.providerId === "github.com"
        ? "github"
        : "password";
  return {
    uid: user.uid,
    name,
    email: user.email ?? "",
    photoURL: user.photoURL,
    provider,
    role: "user",
    createdAt: null,
    updatedAt: null,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms — likely Firestore is unreachable or long-polling is blocked`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    if (timer) clearTimeout(timer);
    return result as T;
  } catch (e) {
    if (timer) clearTimeout(timer);
    throw e;
  }
}

export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, USERS_COLLECTION, user.uid);

  let docSnap;
  try {
    docSnap = await withTimeout(getDoc(userRef), 8000, "getDoc(users/{uid})");
  } catch (error) {
    if (classifyFirestoreError(error) === "offline") {
      return buildLocalProfile(user);
    }
    throw toProfileError(error);
  }

  if (docSnap.exists()) {
    const data = docSnap.data() as Omit<UserProfile, "createdAt" | "updatedAt">;
    try {
      await withTimeout(setDoc(userRef, { updatedAt: serverTimestamp() }, { merge: true }), 8000, "setDoc(users/{uid})");
    } catch {}
    return { ...data, uid: user.uid, createdAt: docSnap.data().createdAt, updatedAt: docSnap.data().updatedAt };
  }

  const local = buildLocalProfile(user);
  const payload = {
    uid: local.uid,
    name: local.name,
    email: local.email,
    photoURL: local.photoURL,
    provider: local.provider,
    role: "user" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await withTimeout(setDoc(userRef, payload), 8000, "setDoc(users/{uid})");
  } catch (error) {
    if (classifyFirestoreError(error) === "offline") {
      return local;
    }
    throw toProfileError(error);
  }

  return { ...local, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, USERS_COLLECTION, uid);
  let docSnap;
  try {
    docSnap = await withTimeout(getDoc(userRef), 8000, "getDoc(users/{uid})");
  } catch (error) {
    if (classifyFirestoreError(error) === "offline") return null;
    throw toProfileError(error);
  }
  if (!docSnap.exists()) return null;
  const data = docSnap.data() as Omit<UserProfile, "createdAt" | "updatedAt">;
  return { ...data, uid, createdAt: docSnap.data().createdAt, updatedAt: docSnap.data().updatedAt };
}

export async function updateProfilePhotos(uid: string, photoURL: string | null): Promise<void> {
  const db = getFirebaseFirestore();
  await setDoc(doc(db, USERS_COLLECTION, uid), { photoURL }, { merge: true });
}

export function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}
