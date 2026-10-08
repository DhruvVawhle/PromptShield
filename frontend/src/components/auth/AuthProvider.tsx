"use client";

import * as React from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getOrCreateUserProfile, type UserProfile, type ProfileError } from "@/lib/user-profile";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: ProfileError | null;
  retryProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function devLog(label: string) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Auth] ${label} @ ${performance.now().toFixed(2)}ms`);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileError, setProfileError] = React.useState<ProfileError | null>(null);

  const loadProfile = React.useCallback(async (currentUser: User) => {
    devLog(`loadProfile start for ${currentUser.uid}`);
    setProfileLoading(true);
    setProfileError(null);
    try {
      const userProfile = await getOrCreateUserProfile(currentUser);
      devLog(`loadProfile success for ${currentUser.uid}`);
      setProfile(userProfile);
      setProfileError(null);
    } catch (error) {
      devLog(`loadProfile error for ${currentUser.uid}`);
      const err = error as ProfileError;
      const normalized: ProfileError =
        err && typeof err === "object" && "kind" in err
          ? err
          : { kind: "unknown", message: (err as { message?: string })?.message ?? String(err), raw: error };
      console.error("Failed to load user profile:", normalized.raw ?? normalized.message);
      setProfile(null);
      setProfileError(normalized);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  React.useEffect(() => {
    devLog("onAuthStateChanged subscribing");
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        devLog(`onAuthStateChanged: user ${currentUser.uid}`);
        setUser(currentUser);
        setLoading(false);
        // Load profile in background - don't await
        loadProfile(currentUser);
      } else {
        devLog("onAuthStateChanged: signed out");
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
        setLoading(false);
      }
    });
    return () => {
      devLog("onAuthStateChanged unsubscribing");
      unsubscribe();
    };
  }, [loadProfile]);

  const retryProfile = React.useCallback(async () => {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setUser(currentUser);
    await loadProfile(currentUser);
  }, [loadProfile]);

  const handleSignOut = React.useCallback(async () => {
    devLog("signOut called");
    const auth = getFirebaseAuth();
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setProfileError(null);
    setProfileLoading(false);
  }, []);

  const value: AuthContextValue = React.useMemo(
    () => ({ user, profile, loading, profileLoading, profileError, retryProfile, signOut: handleSignOut }),
    [user, profile, loading, profileLoading, profileError, retryProfile, handleSignOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

export function useProfile(): UserProfile | null {
  const { profile } = useAuth();
  return profile;
}

export function useAuthLoading(): boolean {
  const { loading } = useAuth();
  return loading;
}

export function useSignOut(): () => Promise<void> {
  const { signOut } = useAuth();
  return signOut;
}
