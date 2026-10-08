import {
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

export interface AuthSubmitValues {
  name: string;
  email: string;
  password: string;
}

export interface AuthResult {
  ok: boolean;
  redirectTo: string;
}

export async function signInWithCredentials(values: AuthSubmitValues): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, values.email.trim(), values.password);
  void credential.user.getIdToken().catch(() => {});
  return { ok: true, redirectTo: "/dashboard" };
}

export async function signUpWithCredentials(values: AuthSubmitValues): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, values.email.trim(), values.password);
  const displayName = values.name.trim();
  if (displayName) {
    await updateProfile(credential.user, { displayName }).catch(() => {});
  }
  try {
    await credential.user.reload();
  } catch {}
  void credential.user.getIdToken().catch(() => {});
  return { ok: true, redirectTo: "/dashboard" };
}

export type AuthProvider = "google" | "github";

export async function signInWithProvider(provider: AuthProvider): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  const firebaseProvider = provider === "google" ? new GoogleAuthProvider() : new GithubAuthProvider();
  const credential = await signInWithPopup(auth, firebaseProvider);
  void credential.user.getIdToken().catch(() => {});
  return { ok: true, redirectTo: "/dashboard" };
}