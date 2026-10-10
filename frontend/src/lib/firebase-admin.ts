import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
}

if (!getApps().length) {
  try {
    initializeApp({
      projectId,
    });
  } catch (error) {
    console.warn('Firebase admin initialization warning: missing credentials or environment setup.', error);
    // Do not throw synchronously to avoid breaking unrelated imports and tests
  }
}

const createServiceProxy = <T extends object>(serviceName: string): T => {
  return new Proxy({} as T, {
    get: (_, prop) => {
      throw new Error(`Firebase Admin ${serviceName} is not initialized. Please ensure GCP credentials (ADC) are configured.`);
    },
  });
};

export const adminAuth = getApps().length ? getAuth() : createServiceProxy<ReturnType<typeof getAuth>>('Auth');
export const adminDb = getApps().length ? getFirestore() : createServiceProxy<ReturnType<typeof getFirestore>>('Firestore');
