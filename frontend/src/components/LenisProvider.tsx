"use client";

import * as React from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch {}
}

function LenisScrollSync() {
  const lenis = useLenis();
  React.useEffect(() => {
    if (!lenis) return;
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      try {
        lenis.off("scroll", onScroll);
      } catch {}
      gsap.ticker.remove(tick);
    };
  }, [lenis]);
  return null;
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