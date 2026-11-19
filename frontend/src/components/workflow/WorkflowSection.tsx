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

export function WorkflowSection() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const pinRef = React.useRef<HTMLDivElement>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const fillRef = React.useRef<HTMLSpanElement>(null);
  const packetRef = React.useRef<HTMLSpanElement>(null);
  const numberRef = React.useRef<HTMLParagraphElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const stRef = React.useRef<ScrollTrigger | null>(null);
  const activeIndexRef = React.useRef(0);
  const railWidthRef = React.useRef(0);

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
      if (railRef.current) {
        railWidthRef.current = railRef.current.clientWidth;
      }
      ScrollTrigger.refresh();
    };
    updateMetrics();
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateMetrics).catch(() => {});
    }
    window.addEventListener("resize", updateMetrics);
    return () => window.removeEventListener("resize", updateMetrics);
  }, [mounted]);

  React.useEffect(() => {
    if (!mounted) return;
    const mql = window.matchMedia("(min-width: 901px) and (prefers-reduced-motion: no-preference)");
    if (mql.matches) return;
    const candidates = [numberRef.current, titleRef.current, descRef.current, sheetRef.current] as (HTMLElement | null)[];
    const els = candidates.filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const anim = gsap.fromTo(els, { y: 0, opacity: 1 }, { y: 0, opacity: 1, duration: 0 });
    return () => {
      anim.kill();
    };
  }, [active, mounted]);

  React.useEffect(() => {
    if (!mounted) return;
    const mql = window.matchMedia("(min-width: 901px) and (prefers-reduced-motion: no-preference)");
    if (!mql.matches) return;
    const candidates = [numberRef.current, titleRef.current, descRef.current] as (HTMLElement | null)[];
    const textEls = candidates.filter((el): el is HTMLElement => el !== null);
    if (textEls.length > 0) {
      gsap.fromTo(
        textEls,
        { y: 6, opacity: 0.35 },
        { y: 0, opacity: 1, duration: 0.22, ease: "power2.out", overwrite: "auto" }
      );
    }
    if (sheetRef.current) {
      gsap.fromTo(
        sheetRef.current,
        { opacity: 0.75, scale: 0.995 },
        { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out", overwrite: "auto" }
      );
    }
  }, [active, mounted]);

  const goTo = React.useCallback(
    (index: number) => {
      const st = stRef.current;
      if (!st) return;
      const start = st.start;
      const end = st.end;
      const n = STEPS.length;
      const target = start + (end - start) * (index / (n - 1));
      const wrappedLenis = lenis as unknown as { scrollTo?: (t: number, o?: unknown) => void } | null;
      if (wrappedLenis?.scrollTo) {
        wrappedLenis.scrollTo(target, { duration: 0.8 });
      } else {
        window.scrollTo({ top: target, behavior: "smooth" });
      }
    },
    [lenis]
  );

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
        const pinEl = pinRef.current;
        const rail = railRef.current;
        const fill = fillRef.current;
        const packet = packetRef.current;
        if (!pinEl || !rail) return;

        const total = STEPS.length;
        if (fill) gsap.set(fill, { scaleX: 0 });
        if (packet) gsap.set(packet, { x: 0 });
        if (rail) railWidthRef.current = rail.clientWidth;

        const st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * 3.4}`,
          pin: pinEl,
          pinSpacing: true,
          scrub: true,
          onUpdate: (self) => {
            const p = self.progress;
            if (fill) gsap.set(fill, { scaleX: p });
            if (packet) {
              const w = railWidthRef.current || rail.clientWidth;
              gsap.set(packet, { x: p * w });
            }
            const rawIdx = p * (total - 1);
            const current = activeIndexRef.current;
            let nextIdx = current;
            if (p <= 0.02) {
              nextIdx = 0;
            } else if (p >= 0.98) {
              nextIdx = total - 1;
            } else if (rawIdx > current + 0.55 && current < total - 1) {
              nextIdx = Math.min(total - 1, Math.floor(rawIdx + 0.45));
            } else if (rawIdx < current - 0.55 && current > 0) {
              nextIdx = Math.max(0, Math.ceil(rawIdx - 0.45));
            }
            if (nextIdx !== current) {
              activeIndexRef.current = nextIdx;
              setActive(nextIdx);
            }
          },
        });

        stRef.current = st;

        return () => {
          st.kill();
          stRef.current = null;
        };
      });

      return () => {
        mm.revert();
      };
    },
    { scope: sectionRef }
  );

  const step = STEPS[active]!;

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      data-mounted={mounted ? "true" : "false"}
      className={`scroll-mt-24 border-t border-border bg-page py-20 ${plexMono.variable}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
            Every prompt. Analyzed before execution.
          </h2>
        </div>

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

        <div ref={pinRef} className="workflow-pin-wrap">
          <div className="mx-auto max-w-5xl">
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

            <div
              className="workflow-stage mx-auto grid max-w-5xl gap-8 pt-10 md:grid-cols-[1.05fr_1fr] md:items-start"
              aria-live="polite"
            >
              <div className="min-w-0">
                <p ref={numberRef} className="workflow-number" aria-hidden="true">
                  {step.id}
                </p>
                <h3 ref={titleRef} className="mt-3 text-[30px] font-semibold tracking-[-0.02em] text-foreground">
                  {step.title}
                </h3>
                <p ref={descRef} className="mt-3 max-w-[420px] text-[16.5px] leading-7 text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <div ref={sheetRef} className="min-w-0">
                {step.artifact}
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
