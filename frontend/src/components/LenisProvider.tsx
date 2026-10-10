"use client";

import * as React from "react";
import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch {}
}



export function LenisProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ lerp: 0.09 }}>
      {children}
    </ReactLenis>
  );
}