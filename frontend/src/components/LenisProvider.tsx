"use client";

import * as React from "react";
import { ReactLenis, type LenisRef, useLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  try {
    gsap.registerPlugin(ScrollTrigger);
  } catch {}
}

function LenisAnchorHandler() {
  const lenis = useLenis();

  React.useEffect(() => {
    if (!lenis) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href*='#']");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Only handle in-page anchors
      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(anchor.href, window.location.href);

      if (currentUrl.pathname !== targetUrl.pathname) return;

      const hash = targetUrl.hash;
      if (!hash || hash === "#") return;

      const targetEl = document.querySelector(hash);
      if (targetEl) {
        e.preventDefault();
        lenis.scrollTo(targetEl as HTMLElement, {
          offset: -76,
          duration: 1.25,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
        window.history.pushState(null, "", hash);
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
    };
  }, [lenis]);

  return null;
}

function ScrollProgress() {
  const barRef = React.useRef<HTMLDivElement>(null);

  useLenis((lenis) => {
    if (barRef.current) {
      const progress = Math.max(0, Math.min(1, lenis.progress));
      barRef.current.style.transform = `scaleX(${progress})`;
    }
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] bg-transparent"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left scale-x-0 bg-gradient-to-r from-primary/80 via-primary to-accent-foreground/90 transition-transform duration-75 ease-out shadow-[0_0_8px_rgba(56,189,248,0.35)]"
      />
    </div>
  );
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const lenisRef = React.useRef<LenisRef>(null);

  React.useEffect(() => {
    if (reducedMotion) return;

    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    const instance = lenisRef.current?.lenis;
    if (instance) {
      instance.on("scroll", ScrollTrigger.update);
    }

    return () => {
      gsap.ticker.remove(update);
      if (instance) {
        instance.off("scroll", ScrollTrigger.update);
      }
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      ref={lenisRef}
      root
      autoRaf={false}
      options={{
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.6,
        infinite: false,
      }}
    >
      <ScrollProgress />
      <LenisAnchorHandler />
      {children}
    </ReactLenis>
  );
}
