import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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
    console.error('Firebase admin initialization error', error);
    throw error;
  }
}

export const adminAuth = getAuth();
