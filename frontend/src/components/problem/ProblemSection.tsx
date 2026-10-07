"use client";

import * as React from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { SplitTextReveal } from "@/components/animations/split-text-reveal";
import { ContextWindowDemo } from "./ContextWindowDemo";
import { THREATS, type Threat } from "./threats";
import "./context-window.css";

type Mode = "unprotected" | "protected";

export function ProblemSection() {
  const [selectedId, setSelectedId] = React.useState<string>(THREATS[0]!.id);
  const [mode, setMode] = React.useState<Mode>("protected");
  const [playNonce, setPlayNonce] = React.useState(0);
  const [retypeOnPlay, setRetypeOnPlay] = React.useState(false);
  const introDoneRef = React.useRef(false);
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const demoWrapRef = React.useRef<HTMLDivElement | null>(null);
  const tabListRef = React.useRef<HTMLDivElement | null>(null);

  const selected = THREATS.find((t) => t.id === selectedId) ?? THREATS[0]!;
  const selectedIndex = THREATS.findIndex((t) => t.id === selectedId);

  const triggerPlay = React.useCallback((retype: boolean) => {
    setRetypeOnPlay(retype);
    setPlayNonce((n) => n + 1);
  }, []);

  const go = React.useCallback(
    (index: number) => {
      const n = THREATS.length;
      const wrapped = ((index % n) + n) % n;
      const t = THREATS[wrapped];
      if (!t) return;
      setSelectedId(t.id);
      triggerPlay(true);
    },
    [triggerPlay]
  );

  const handleTabClick = React.useCallback(
    (t: Threat) => {
      // eslint-disable-next-line react-hooks/immutability -- ref flag, no hook dep
      lockedRef.current = true;
      autoplayTweenRef.current?.kill();
      setIsAutoplaying(false);
      // eslint-disable-next-line react-hooks/immutability -- intro gate ref
      introDoneRef.current = true;
      setSelectedId(t.id);
      triggerPlay(true);
    },
    [triggerPlay]
  );

  const handleModeClick = React.useCallback(
    (m: Mode) => {
      // eslint-disable-next-line react-hooks/immutability -- ref flag, no hook dep
      lockedRef.current = true;
      autoplayTweenRef.current?.kill();
      setIsAutoplaying(false);
      // eslint-disable-next-line react-hooks/immutability -- intro gate ref
      introDoneRef.current = true;
      if (m === mode) {
        triggerPlay(false);
        return;
      }
      setMode(m);
    },
    [mode, triggerPlay]
  );

  const handleAnyInteraction = React.useCallback(() => {
    introDoneRef.current = true;
  }, []);

  // ── Autoplay with progress line (desktop 901px+, motion allowed, non-touch only) ──
  const autoplayTweenRef = React.useRef<gsap.core.Tween | null>(null);
  const lockedRef = React.useRef(false);
  const inViewRef = React.useRef(true);
  const hoveredSectionRef = React.useRef(false);
  const currentIndexRef = React.useRef(0);
  const [isAutoplaying, setIsAutoplaying] = React.useState(false);

  React.useEffect(() => {
    currentIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const canAutoplay = React.useCallback(() => {
    if (lockedRef.current) return false;
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (!window.matchMedia("(min-width: 901px)").matches) return false;
    if (window.matchMedia("(pointer: coarse)").matches) return false;
    if ("ontouchstart" in window && navigator.maxTouchPoints > 0) {
      if (window.matchMedia("(hover: none)").matches) return false;
    }
    if (!inViewRef.current) return false;
    if (hoveredSectionRef.current) return false;
    return true;
  }, []);

  const killAutoplay = React.useCallback(() => {
    autoplayTweenRef.current?.kill();
    autoplayTweenRef.current = null;
    setIsAutoplaying(false);
    const el = tabListRef.current;
    if (el) el.style.setProperty("--p", "1");
  }, []);

  const startAutoplay = React.useCallback(() => {
    if (!canAutoplay()) return;
    const el = tabListRef.current;
    if (!el) return;
    autoplayTweenRef.current?.kill();
    el.style.setProperty("--p", "0");
    void el.offsetHeight;
    setIsAutoplaying(true);
    const tween = gsap.to(el, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ["--p" as any]: 1,
      duration: 5.5,
      ease: "none",
      onComplete: () => {
        // eslint-disable-next-line react-hooks/immutability -- read-only check, no dep
        if (lockedRef.current) return;
        if (!canAutoplay()) return;
        go(currentIndexRef.current + 1);
      },
    });
    autoplayTweenRef.current = tween;
  }, [canAutoplay, go]);

  const handleStampLanded = React.useCallback(() => {
    if (!canAutoplay()) {
      const el = tabListRef.current;
      if (el) el.style.setProperty("--p", "1");
      return;
    }
    window.setTimeout(() => {
      if (!canAutoplay()) return;
      startAutoplay();
    }, 500);
  }, [canAutoplay, startAutoplay]);

  // Pointer anywhere inside the two-column wrapper pauses autoplay
  React.useEffect(() => {
    const wrap = demoWrapRef.current;
    if (!wrap) return;
    const onEnter = () => {
      hoveredSectionRef.current = true;
      autoplayTweenRef.current?.kill();
      autoplayTweenRef.current = null;
      setIsAutoplaying(false);
      const el = tabListRef.current;
      if (el) el.style.setProperty("--p", "1");
    };
    const onLeave = () => {
      hoveredSectionRef.current = false;
      if (lockedRef.current) return;
      if (!inViewRef.current) return;
      startAutoplay();
    };
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [startAutoplay]);

  // Pause when section not in view
  React.useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const visible = entry.isIntersecting && entry.intersectionRatio > 0.05;
        inViewRef.current = visible;
        if (!visible) {
          autoplayTweenRef.current?.kill();
          autoplayTweenRef.current = null;
          setIsAutoplaying(false);
          const tabEl = tabListRef.current;
          if (tabEl) tabEl.style.setProperty("--p", "1");
        } else if (visible && !hoveredSectionRef.current && !lockedRef.current) {
          startAutoplay();
        }
      },
      { threshold: [0, 0.05, 0.2] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [startAutoplay]);

  // Kick off autoplay after initial mount when conditions allow
  React.useEffect(() => {
    if (lockedRef.current) return;
    const id = window.setTimeout(() => {
      if (canAutoplay()) startAutoplay();
    }, 1200);
    return () => window.clearTimeout(id);
  }, [canAutoplay, startAutoplay, playNonce]);

  React.useEffect(() => {
    return () => {
      autoplayTweenRef.current?.kill();
    };
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const n = THREATS.length;
      let next: number | null = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        next = (selectedIndex + 1) % n;
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        next = (selectedIndex - 1 + n) % n;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = n - 1;
      }
      if (next !== null) {
        lockedRef.current = true;
        autoplayTweenRef.current?.kill();
        setIsAutoplaying(false);
        introDoneRef.current = true;
        const t = THREATS[next];
        if (t) {
          setSelectedId(t.id);
          triggerPlay(true);
          requestAnimationFrame(() => {
            const btn = tabListRef.current?.querySelector<HTMLElement>(`[data-threat-id="${t.id}"]`);
            btn?.focus();
          });
        }
      }
    },
    [selectedIndex, triggerPlay]
  );

  React.useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const mql = typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    if (mql?.matches) {
      introDoneRef.current = true;
      return;
    }
    if (introDoneRef.current) return;
    let cancelled = false;
    let t2: number | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting || cancelled) return;
        io.disconnect();
        if (introDoneRef.current) return;
        setMode("unprotected");
        triggerPlay(true);
        t2 = window.setTimeout(() => {
          if (cancelled || introDoneRef.current) return;
          introDoneRef.current = true;
          setMode("protected");
        }, 2600);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      if (t2 !== null) window.clearTimeout(t2);
    };
  }, [triggerPlay]);

  React.useEffect(() => {
    if (playNonce !== 0) return;
    const mql = typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    if (mql?.matches) return;
    if (introDoneRef.current) return;
  }, [playNonce]);

  return (
    <section ref={sectionRef} id="product" className="scroll-mt-24 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.92fr] lg:items-start lg:gap-12">
          <Reveal className="max-w-lg">
            <p className="flex items-center gap-3 text-[13px] font-medium tracking-[-0.01em] text-muted-foreground">
              <span className="h-px w-[22px] shrink-0 bg-border" aria-hidden="true" />
              Problem
            </p>
            <SplitTextReveal
              as="h2"
              type="words"
              start="top 85%"
              delay={0.1}
              duration={1}
              stagger={0.06}
              y={42}
              className="mt-4 text-[1.95rem] font-semibold tracking-[-0.06em] text-foreground sm:text-[2.25rem] lg:text-[3.15rem] lg:leading-[1.02]"
            >
              Your AI is only as secure as the instructions it trusts.
            </SplitTextReveal>
          </Reveal>

          <Reveal className="space-y-5 text-[14px] leading-7 text-[#465266]" delay={0.08}>
            <p>
              Modern LLM applications are exposed to prompt injection, jailbreak attempts, instruction manipulation, and indirect attacks carried through external content. Even a
              well-designed model can be misled when untrusted inputs override higher-priority instructions or try to extract hidden context.
            </p>
            <p>
              PromptShield creates a security checkpoint that identifies malicious intent before the model executes, making those decisions visible, explainable, and configurable instead
              of opaque.
            </p>
          </Reveal>
        </div>

        <div ref={demoWrapRef} className="mt-10 grid gap-6 lg:grid-cols-[250px_1fr] lg:items-start">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Threats"
            aria-orientation="vertical"
            className="problem-tablist flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
            style={{ scrollbarWidth: "thin", ["--p" as string]: "1" } as React.CSSProperties}
            onKeyDown={handleKeyDown}
            data-autoplaying={isAutoplaying ? "1" : "0"}
          >
            {THREATS.map((t, idx) => {
              const active = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  aria-label={`${t.label}: ${t.hint}`}
                  data-threat-id={t.id}
                  tabIndex={active ? 0 : -1}
                  type="button"
                  onClick={() => handleTabClick(t)}
                  className={active ? "problem-tab problem-tab--active" : "problem-tab"}
                >
                  <span className="problem-tab__label">{t.label}</span>
                  {active ? <span className="problem-tab__hint">{t.hint}</span> : null}
                  {active ? (
                    <ArrowRight className="problem-tab__arrow" aria-hidden="true" />
                  ) : null}
                  <span className="sr-only">
                    {idx + 1} of {THREATS.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-[13px] font-medium text-[#465266]">
                What the model receives
                <span className="font-mono text-[11px] font-normal tabular-nums text-[#94a3b8]">
                  {String(selectedIndex + 1).padStart(2, "0")} of {String(THREATS.length).padStart(2, "0")}
                </span>
              </p>
              <div className="inline-flex rounded-full border border-border bg-surface p-1" role="group" aria-label="Protection mode">
                <button
                  type="button"
                  aria-pressed={mode === "unprotected"}
                  onClick={() => handleModeClick("unprotected")}
                  className={mode === "unprotected" ? "problem-seg problem-seg--on" : "problem-seg"}
                >
                  Unprotected
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "protected"}
                  onClick={() => handleModeClick("protected")}
                  className={mode === "protected" ? "problem-seg problem-seg--on" : "problem-seg"}
                >
                  Protected
                </button>
              </div>
            </div>

            <ContextWindowDemo
              threat={selected}
              mode={mode}
              playNonce={playNonce}
              retypeOnPlay={retypeOnPlay}
              introDoneRef={introDoneRef}
              onUserInteraction={handleAnyInteraction}
              onStampLanded={handleStampLanded}
            />
          </div>
        </div>
      </div>

      <style>{`
        .problem-tablist { --p: 1; }
        .problem-tab {
          position: relative;
          text-align: left;
          width: 100%;
          padding: 12px 28px 12px 12px;
          border-left: 2px solid transparent;
          background: transparent;
          color: #0f172a;
          font-size: 14px;
          line-height: 1.35;
          flex-shrink: 0;
          overflow: hidden;
        }
        .problem-tab::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          height: 2px;
          background: #0f172a;
          transform: scaleX(var(--p, 1));
          transform-origin: left center;
          transition: none;
          opacity: 0;
          pointer-events: none;
        }
        .problem-tab--active::before {
          opacity: 1;
        }
        @media (max-width: 900px) {
          .problem-tab::before { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .problem-tab::before { display: none; }
        }
        .problem-tab:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
          border-radius: 6px;
        }
        .problem-tab--active {
          border-left-color: #0f172a;
          font-weight: 700;
        }
        .problem-tab__hint {
          display: block;
          margin-top: 4px;
          font-size: 13px;
          font-weight: 400;
          color: #465266;
        }
        .problem-tab__arrow {
          position: absolute;
          right: 8px;
          top: 50%;
          width: 16px;
          height: 16px;
          color: #0f172a;
          transform: translateY(-50%) translateX(-4px);
          opacity: 0;
          animation: problem-arrow-in 220ms ease forwards;
          pointer-events: none;
        }
        @keyframes problem-arrow-in {
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .problem-tab__arrow { animation: none; opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @media (max-width: 900px) {
          .problem-tab { border-left: 0; border-bottom: 2px solid transparent; white-space: nowrap; }
          .problem-tab--active { border-bottom-color: #0f172a; border-left-color: transparent; }
          .problem-tab__hint { display: inline; margin-left: 8px; }
          .problem-tab__arrow { display: none; }
        }
        .problem-seg {
          border-radius: 9999px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #465266;
          background: transparent;
          border: 1px solid transparent;
        }
        .problem-seg:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
        .problem-seg--on {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
        }
      `}</style>
    </section>
  );
}
