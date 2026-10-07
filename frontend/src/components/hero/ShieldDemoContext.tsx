"use client";

import * as React from "react";
import type { ShieldDemoSnapshot } from "@/components/hero/useShieldDemo";

type ShieldDemoContextValue = {
  snapshot: ShieldDemoSnapshot;
  runCustom: (text: string) => void;
  reducedMotion: boolean;
};

const ShieldDemoContext = React.createContext<ShieldDemoContextValue | null>(null);

export function ShieldDemoProvider({
  children,
  snapshot,
  runCustom,
  reducedMotion,
}: {
  children: React.ReactNode;
  snapshot: ShieldDemoSnapshot;
  runCustom: (text: string) => void;
  reducedMotion: boolean;
}) {
  return (
    <ShieldDemoContext.Provider value={{ snapshot, runCustom, reducedMotion }}>
      {children}
    </ShieldDemoContext.Provider>
  );
}

export function useShieldDemoContext(): ShieldDemoContextValue {
  const ctx = React.useContext(ShieldDemoContext);
  if (!ctx) {
    throw new Error("useShieldDemoContext must be used within a ShieldDemoProvider");
  }
  return ctx;
}