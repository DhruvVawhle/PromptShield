"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthLoading, useUser } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/app-shell";

export function ProtectedDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const loading = useAuthLoading();
  const user = useUser();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center text-muted-foreground">
          <div className="animate-pulse h-8 w-8 rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-3 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center text-muted-foreground">
          <div className="animate-pulse h-8 w-8 rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-3 text-sm">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}