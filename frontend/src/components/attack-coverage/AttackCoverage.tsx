"use client";

import * as React from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ATTACKS, type Attack } from "./attacks";
import "./attack-coverage.css";

export function AttackCoverage() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const stampRef = React.useRef<HTMLSpanElement>(null);
  const scrollLockRef = React.useRef(false);
  const activeIndexRef = React.useRef(0);
  const typingTimersRef = React.useRef<Set<number>>(new Set());

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [typedExample, setTypedExample] = React.useState(() => ATTACKS[0]?.example ?? "");
  const [showStamp, setShowStamp] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);

  const prefersReducedMotion = React.useRef(false);

  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mql.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const clearTyping = React.useCallback(() => {
    typingTimersRef.current.forEach((id) => window.clearTimeout(id));
    typingTimersRef.current.clear();
  }, []);

  const schedule = React.useCallback((ms: number, fn: () => void) => {
    if (prefersReducedMotion.current) {
      fn();
      return;
    }
    const id = window.setTimeout(() => {
      typingTimersRef.current.delete(id);
      fn();
    }, ms) as unknown as number;
    typingTimersRef.current.add(id);
  }, []);

  const playActive = React.useCallback(
    (index: number) => {
      const attack: Attack | undefined = ATTACKS[index];
      if (!attack) return;
      clearTyping();
      gsap.killTweensOf(stampRef.current);
      gsap.killTweensOf(sheetRef.current);
      if (prefersReducedMotion.current) {
        setTypedExample(attack.example);
        setShowStamp(true);
        return;
      }
      setShowStamp(false);
      setTypedExample("");
      const text = attack.example;
      const charDelay = 13;
      let i = 0;
      const typeNext = () => {
        if (i < text.length) {
          i += 1;
          setTypedExample(text.slice(0, i));
          const id = window.setTimeout(typeNext, charDelay) as unknown as number;
          typingTimersRef.current.add(id);
        } else {
          schedule(120, () => {
            const stamp = stampRef.current;
            const sheet = sheetRef.current;
            if (!stamp) {
              setShowStamp(true);
              return;
            }
            gsap.set(stamp, { opacity: 0, scale: 1.9, rotation: -16 });
            setShowStamp(true);
            const tl = gsap.timeline();
            tl.fromTo(
              stamp,
              { opacity: 0, scale: 1.9, rotation: -16 },
              { opacity: 0.92, scale: 1, rotation: -6, duration: 0.26, ease: "power4.in" }
            );
            if (sheet) {
              tl.fromTo(sheet, { y: 0 }, { y: 4, duration: 0.06, yoyo: true, repeat: 1 }, "<");
            }
          });
        }
      };
      const firstId = window.setTimeout(typeNext, 80) as unknown as number;
      typingTimersRef.current.add(firstId);
    },
    [clearTyping, schedule]
  );

  const goTo = React.useCallback(
    (index: number) => {
      if (scrollLockRef.current) return;
      if (index < 0 || index >= ATTACKS.length) return;
      activeIndexRef.current = index;
      setActiveIndex(index);
      playActive(index);
    },
    [playActive]
  );

  const handleRowHover = React.useCallback(
    (index: number) => {
      if (typeof window === "undefined") return;
      const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
      if (!mql.matches) return;
      goTo(index);
    },
    [goTo]
  );

  const handleRowKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        goTo((activeIndex + 1) % ATTACKS.length);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        goTo((activeIndex - 1 + ATTACKS.length) % ATTACKS.length);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(ATTACKS.length - 1);
      }
    },
    [activeIndex, goTo]
  );

  React.useEffect(() => {
    return () => clearTyping();
  }, [clearTyping]);

  React.useEffect(() => {
    if (scrollLockRef.current) return;
    if (activeIndexRef.current !== activeIndex) {
      scrollLockRef.current = true;
      const raf = window.requestAnimationFrame(() => {
        scrollLockRef.current = false;
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [activeIndex]);

  useGSAP(
    () => {
      if (!mounted) return;
      if (prefersReducedMotion.current) return;
      const list = listRef.current;
      if (!list) return;
      const rows = list.querySelectorAll<HTMLElement>(".attack-row");
      if (rows.length === 0) return;
      gsap.set(rows, { y: 26, opacity: 0 });
    },
    { scope: sectionRef, dependencies: [mounted] }
  );

  React.useEffect(() => {
    if (!mounted) return;
    const section = sectionRef.current;
    if (!section) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        io.disconnect();
        const list = listRef.current;
        if (!list) {
          setRevealed(true);
          return;
        }
        const rows = list.querySelectorAll<HTMLElement>(".attack-row");
        if (rows.length === 0) {
          setRevealed(true);
          return;
        }
        gsap.to(rows, {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.06,
          onComplete: () => setRevealed(true),
        });
      },
      { threshold: 0.25 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, [mounted]);

  React.useEffect(() => {
    if (!revealed) return;
    playActive(activeIndex);
  }, [revealed, activeIndex, playActive]);

  const attack = ATTACKS[activeIndex] ?? ATTACKS[0]!;

  const onPointerMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion.current) return;
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mql.matches) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 2 - 1;
    const py = ((e.clientY - r.top) / r.height) * 2 - 1;
    el.style.setProperty("--px", String(px));
    el.style.setProperty("--py", String(py));
  }, []);

  const onPointerLeave = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }, []);

  return (
    <section
      ref={sectionRef}
      id="security"
      className="attack-coverage scroll-mt-24 border-t border-border bg-page py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Attack coverage</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
            PromptShield is built to detect the attacks that matter most.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-[72px] lg:items-start">
          <ul
            ref={listRef}
            className="attack-list"
            aria-label="Attack coverage"
          >
            {ATTACKS.map((a, index) => {
              const isActive = index === activeIndex;
              return (
                <li key={a.id} className={isActive ? "attack-row attack-row--active" : "attack-row"}>
                  <button
                    type="button"
                    aria-expanded={isActive}
                    aria-controls={`attack-panel-${a.id}`}
                    onClick={() => goTo(index)}
                    onPointerEnter={() => handleRowHover(index)}
                    onFocus={() => {
                      if (index !== activeIndex) goTo(index);
                    }}
                    onKeyDown={handleRowKeyDown}
                    className="attack-row__button"
                  >
                    <span className="attack-row__index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="attack-row__title">{a.title}</span>
                  </button>
                  <div className="attack-row__mobile" id={`attack-panel-${a.id}-mobile`}>
                    <p className="attack-row__desc attack-row__desc--mobile">{a.description}</p>
                    <div className="attack-row__sheet attack-row__sheet--mobile">
                      <p className="attack-sheet__label">Incoming prompt</p>
                      <p className="attack-sheet__example">{a.example}</p>
                      <p className="attack-sheet__reason">
                        <span className="attack-sheet__badge">Block + explain.</span> {a.reason}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div
            ref={panelRef}
            className="attack-panel"
            aria-live="polite"
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            style={{ perspective: "1400px" } as React.CSSProperties}
          >
            <div className="attack-panel__tilt">
              <p className="attack-panel__eyebrow">
                <span className="attack-panel__index">{String(activeIndex + 1).padStart(2, "0")}</span>
                <span className="attack-panel__title">{attack.title}</span>
              </p>
              <p className="attack-panel__desc">{attack.description}</p>

              <div
                ref={sheetRef}
                className="attack-sheet"
              >
                <p className="attack-sheet__label">Incoming prompt</p>
                <p className="attack-sheet__example">
                  {typedExample}
                  {!showStamp && typedExample.length < attack.example.length ? (
                    <span className="attack-sheet__caret" aria-hidden="true" />
                  ) : null}
                </p>
                {showStamp ? (
                  <span ref={stampRef} className="attack-stamp">
                    BLOCKED
                  </span>
                ) : null}
              </div>

              <p className="attack-panel__reason">
                <span className="attack-sheet__badge">Block + explain.</span> {attack.reason}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
