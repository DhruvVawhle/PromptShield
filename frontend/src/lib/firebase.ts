"use client";

import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? ,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? ,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? ,
} as const;

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  if (getApps().length > 0) {
    appInstance = getApp();
    return appInstance;
  }
  appInstance = initializeApp(firebaseConfig);
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseFirestore(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  const app = getFirebaseApp();
  if (typeof window === "undefined") {
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  }
  try {
    firestoreInstance = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch (e: unknown) {
    const msg = (e as { message?: string; code?: string })?.message ?? "";
    const code = (e as { code?: string })?.code ?? "";
    if (msg.includes("already") || code === "failed-precondition" || msg.includes("initialized")) {
      firestoreInstance = getFirestore(app);
    } else {
      throw e;
    }
  }
  return firestoreInstance;
}

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (analyticsPromise) return analyticsPromise;
  analyticsPromise = isAnalyticsSupported()
    .then((supported) => (supported ? getAnalytics(getFirebaseApp()) : null))
    .catch(() => null);
  return analyticsPromise;
}

export { firebaseConfig };
