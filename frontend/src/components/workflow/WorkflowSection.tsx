"use client";

import * as React from "react";
import { IBM_Plex_Mono } from "next/font/google";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { STEPS } from "./steps";
import "./workflow.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});

const STEP_PROGRESS = [0.035, 0.214, 0.393, 0.571, 0.750, 0.928];

export function WorkflowSection() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const pinRef = React.useRef<HTMLDivElement>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const fillRef = React.useRef<HTMLSpanElement>(null);
  const packetRef = React.useRef<HTMLSpanElement>(null);
  const stepPanesRef = React.useRef<(HTMLDivElement | null)[]>([]);
  const stRef = React.useRef<ScrollTrigger | null>(null);
  const activeIndexRef = React.useRef(0);

  const lenis = useLenis();
  const [mounted, setMounted] = React.useState(false);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const updateMetrics = () => {
      ScrollTrigger.refresh();
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateMetrics).catch(() => {});
    }
    window.addEventListener("resize", updateMetrics);
    return () => window.removeEventListener("resize", updateMetrics);
  }, [mounted]);

  const goTo = React.useCallback(
    (index: number) => {
      const st = stRef.current;
      if (!st) return;
      const start = st.start;
      const end = st.end;
      const targetProgress = STEP_PROGRESS[index] ?? (index / (STEPS.length - 1));
      const target = start + (end - start) * targetProgress;
      const wrappedLenis = lenis as unknown as { scrollTo?: (t: number, o?: unknown) => void } | null;
      if (wrappedLenis?.scrollTo) {
        wrappedLenis.scrollTo(target, { duration: 0.9 });
      } else {
        window.scrollTo({ top: target, behavior: "smooth" });
      }
    },
    [lenis]
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      const pinEl = pinRef.current;
      const rail = railRef.current;
      const fill = fillRef.current;
      const packet = packetRef.current;
      const panes = stepPanesRef.current;
      if (!section || !pinEl || !rail || !fill || !packet) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
        const total = STEPS.length;
        const railW = rail.clientWidth || 800;

        // Initialize element visual states
        panes.forEach((pane, i) => {
          if (!pane) return;
          if (i === 0) {
            gsap.set(pane, { opacity: 1, y: 0, pointerEvents: "auto", visibility: "visible" });
          } else {
            gsap.set(pane, { opacity: 0, y: 28, pointerEvents: "none", visibility: "visible" });
          }
        });

        gsap.set(fill, { scaleX: 0 });
        gsap.set(packet, { x: 0 });

        // Total timeline duration = 5.6s
        // Step 0 resting center: ~0.2s
        // Step 1 resting center: ~1.2s
        // Step 2 resting center: ~2.2s
        // Step 3 resting center: ~3.2s
        // Step 4 resting center: ~4.2s
        // Step 5 resting center: ~5.2s
        const tl = gsap.timeline({
          paused: true,
          defaults: { ease: "power2.inOut" },
        });

        // 1. Continuous smooth packet and fill progression along the rail
        tl.to(packet, { x: railW, ease: "none", duration: 5.0 }, 0.2);
        tl.to(fill, { scaleX: 1, ease: "none", duration: 5.0 }, 0.2);

        // 2. Liquid smooth crossfading & upward gliding between each pair of steps
        for (let i = 0; i < total - 1; i++) {
          const currentPane = panes[i];
          const nextPane = panes[i + 1];
          if (!currentPane || !nextPane) continue;

          const transitionStart = 0.2 + i * 1.0 + 0.3; // 0.3s after step center (ample resting plateau)
          const transitionDuration = 0.6; // smooth 0.6s scrub interpolation window

          // Outgoing step glides up and dissolves
          tl.to(
            currentPane,
            { opacity: 0, y: -28, duration: transitionDuration, ease: "power2.inOut" },
            transitionStart
          );

          // Incoming step glides up from below into resting position
          tl.fromTo(
            nextPane,
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: transitionDuration, ease: "power2.inOut" },
            transitionStart
          );
        }

        const st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * 3.5}`,
          pin: section,
          pinSpacing: true,
          scrub: 0.6,
          animation: tl,
          onUpdate: (self) => {
            const p = self.progress;

            // Map progress to active step for the rail markers
            let closestIdx = 0;
            let minDiff = 999;
            STEP_PROGRESS.forEach((sp, idx) => {
              const diff = Math.abs(p - sp);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
              }
            });

            if (closestIdx !== activeIndexRef.current) {
              activeIndexRef.current = closestIdx;
              setActive(closestIdx);

              panes.forEach((pane, idx) => {
                if (pane) {
                  pane.style.pointerEvents = idx === closestIdx ? "auto" : "none";
                }
              });
            }
          },
        });

        stRef.current = st;

        return () => {
          st.kill();
          tl.kill();
          stRef.current = null;
        };
      });

      return () => {
        mm.revert();
      };
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      data-mounted={mounted ? "true" : "false"}
      className={`relative flex min-h-screen flex-col justify-center scroll-mt-24 border-t border-border bg-page py-16 md:py-20 ${plexMono.variable}`}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
            Every prompt. Analyzed before execution.
          </h2>
        </div>

        {/* Mobile / Reduced-Motion Fallback List */}
        <div className="workflow-list">
          <div className="mx-auto max-w-2xl space-y-7 pt-10">
            {STEPS.map((s) => (
              <div key={s.id} className="workflow-mobile-item">
                <p className="font-mono text-xs font-medium text-muted-foreground">{s.id}</p>
                <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-foreground">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{s.description}</p>
                <div className="mt-4">{s.artifact}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Smooth Scrub Pinned Stage */}
        <div ref={pinRef} className="workflow-pin-wrap">
          <div className="mx-auto max-w-5xl">
            {/* Interactive Step Rail */}
            <div ref={railRef} className="workflow-rail" aria-hidden="true">
              <span className="workflow-rail__line" />
              <span ref={fillRef} className="workflow-rail__fill" />
              <span ref={packetRef} className="workflow-rail__packet" />
              {STEPS.map((s, i) => {
                const isActive = i === active;
                const isPast = i < active;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`${s.id} ${s.title}`}
                    onClick={() => goTo(i)}
                    className={
                      isActive
                        ? "workflow-node workflow-node--active"
                        : isPast
                          ? "workflow-node workflow-node--past"
                          : "workflow-node"
                    }
                    style={{ left: `${(i / (STEPS.length - 1)) * 100}%` } as React.CSSProperties}
                  >
                    <span className="workflow-node__dot" />
                    <span className="workflow-node__label">{s.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Continuous Stacked Step Stage */}
            <div className="workflow-stage mx-auto max-w-5xl pt-10" aria-live="polite">
              <div className="workflow-stage-grid">
                {STEPS.map((s, i) => (
                  <div
                    key={s.id}
                    ref={(el) => {
                      stepPanesRef.current[i] = el;
                    }}
                    className="workflow-step-pane"
                  >
                    <div className="min-w-0">
                      <p className="workflow-number" aria-hidden="true">
                        {s.id}
                      </p>
                      <h3 className="mt-3 text-[30px] font-semibold tracking-[-0.02em] text-foreground">
                        {s.title}
                      </h3>
                      <p className="mt-3 max-w-[420px] text-[16.5px] leading-7 text-muted-foreground">
                        {s.description}
                      </p>
                    </div>
                    <div className="min-w-0">
                      {s.artifact}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="pt-8 text-center text-sm text-muted-foreground">
              Scroll to move the prompt through each step, or select a step.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
