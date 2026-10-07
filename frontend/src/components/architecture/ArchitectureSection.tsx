"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { LAYERS, DECISION_OUTCOMES, DECISION_COLOURS, type Decision } from "./layers";
import "./architecture.css";

gsap.registerPlugin(ScrollTrigger);

const DECISION_ORDER: Decision[] = ["allow", "warn", "sanitize", "block"];

export function ArchitectureSection() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const stackRef = React.useRef<HTMLDivElement>(null);
  const slabRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const nodeRefs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const fillRef = React.useRef<HTMLDivElement>(null);
  const packetRef = React.useRef<HTMLSpanElement>(null);
  const outcomeRef = React.useRef<HTMLParagraphElement>(null);
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const stRef = React.useRef<ScrollTrigger | null>(null);

  const [outcome, setOutcome] = React.useState<Decision>("block");
  const progressRef = React.useRef(0);
  const outcomeRefCurrent = React.useRef<Decision>("block");
  const centersRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    const onFontsReady = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) document.fonts.ready.then(onFontsReady).catch(() => {});
    const onResize = () => {
      measureCenters();
      render(progressRef.current, outcomeRefCurrent.current);
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function measureCenters(): void {
    const slabs = slabRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (slabs.length === 0) return;
    const stackTop = stackRef.current?.offsetTop ?? 0;
    centersRef.current = slabs.map((el) => el.offsetTop + el.offsetHeight / 2 - stackTop);
  }

  function render(progress: number, currentOutcome: Decision): void {
    const n = LAYERS.length;
    const tmax = currentOutcome === "block" ? 6 : 7;
    const t = Math.max(0, Math.min(tmax, progress * 7));
    const activeIndex = Math.floor(t);

    const slabs = slabRefs.current.filter((el): el is HTMLDivElement => el !== null);
    const nodes = nodeRefs.current.filter((el): el is HTMLSpanElement => el !== null);

    for (let i = 0; i < slabs.length; i++) {
      const slab = slabs[i];
      const node = nodes[i];
      if (!slab) continue;
      const isPassed = i < activeIndex;
      const isActive = i === activeIndex;
      slab.dataset.state = isActive ? "active" : isPassed ? "passed" : "future";
      if (node) node.dataset.state = isActive ? "active" : isPassed ? "passed" : "future";
    }

    const fill = fillRef.current;
    const packet = packetRef.current;
    const centers = centersRef.current;
    const outcomeEl = outcomeRef.current;

    if (centers.length === n && fill && packet) {
      const clampedT = Math.max(0, Math.min(tmax - 0.0001, t));
      const seg = Math.min(n - 2, Math.floor(clampedT));
      const local = clampedT - seg;
      const a = centers[seg] ?? 0;
      const b = centers[seg + 1] ?? a;
      const y = a + (b - a) * local;
      fill.style.height = `${y}px`;
      packet.style.transform = `translate(-50%, -50%) translateY(${y}px) translateZ(60px)`;
      const packetColour = t >= 6 ? DECISION_COLOURS[currentOutcome] : "#60a5fa";
      packet.style.background = packetColour;
      packet.style.boxShadow =
        t >= 6 ? `0 0 0 6px ${packetColour}26, 0 0 18px ${packetColour}55` : "0 0 0 6px rgba(96,165,250,0.16)";
    }

    if (outcomeEl) {
      const done = t >= 6;
      const text = done ? DECISION_OUTCOMES[currentOutcome] : "The prompt is still being checked.";
      outcomeEl.textContent = text;
      const opacity = done ? Math.min(1, Math.max(0.35, 0.35 + (t - 6) * 1.5)) : 0.45;
      outcomeEl.style.opacity = String(opacity);
    }

    const llmSlab = slabs[n - 1];
    if (llmSlab) {
      const dim = currentOutcome === "block" && t >= 6;
      llmSlab.style.opacity = dim ? "0.55" : "1";
      let tag = llmSlab.querySelector<HTMLSpanElement>("[data-not-sent]");
      if (dim) {
        if (!tag) {
          tag = document.createElement("span");
          tag.dataset.notSent = "1";
          tag.textContent = "Not sent";
          tag.setAttribute("role", "note");
          tag.style.cssText =
            "display:inline-flex;align-items:center;padding:3px 8px;border-radius:9999px;font-size:11px;font-weight:600;color:#fecaca;background:rgba(248,113,113,0.14);border:1px solid rgba(248,113,113,0.28);margin-left:10px;white-space:nowrap;";
          const nameRow = llmSlab.querySelector("[data-name-row]");
          if (nameRow) nameRow.appendChild(tag);
        }
      } else if (tag) {
        tag.remove();
      }
    }
  }

  const handleOutcome = React.useCallback(
    (d: Decision) => {
      setOutcome(d);
      outcomeRefCurrent.current = d;
      requestAnimationFrame(() => render(progressRef.current, d));
    },
    []
  );

  const onPointerMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mql.matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = sceneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 2 - 1;
    const py = ((e.clientY - r.top) / r.height) * 2 - 1;
    el.style.setProperty("--px", String(px));
    el.style.setProperty("--py", String(py));
  }, []);

  const onPointerLeave = React.useCallback(() => {
    const el = sceneRef.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }, []);

  useGSAP(
    () => {
      const stack = stackRef.current;
      if (!stack) return;

      // Ensure slabs are measured before first render
      measureCenters();
      render(progressRef.current, outcomeRefCurrent.current);

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        render(1, outcomeRefCurrent.current);
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const st = ScrollTrigger.create({
          trigger: stack,
          start: "top 72%",
          end: "bottom 48%",
          onUpdate: (self) => {
            progressRef.current = self.progress;
            render(self.progress, outcomeRefCurrent.current);
          },
          onRefresh: () => {
            measureCenters();
            render(progressRef.current, outcomeRefCurrent.current);
          },
        });

        stRef.current = st;
        return () => {
          st.kill();
          stRef.current = null;
        };
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  // Re-render when outcome changes (chip click)
  React.useEffect(() => {
    render(progressRef.current, outcome);
  }, [outcome]);

  // Initial paint for non-JS / before GSAP attaches
  React.useEffect(() => {
    measureCenters();
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    render(prefersReduced ? 1 : progressRef.current, outcome);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section
      ref={sectionRef}
      id="architecture"
      className="arch-section scroll-mt-24 border-t border-[#1f1f23] bg-[#050505] py-20 text-[#fafafa]"
    >
      <div className="mx-auto max-w-[900px] px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="flex items-center justify-center gap-3 text-[13px] font-medium text-[#8a8a93]">
            <span className="h-px w-[22px] shrink-0 bg-[#26262b]" aria-hidden="true" />
            Architecture
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#fafafa] sm:text-4xl">
            A layered model that keeps security decisions transparent.
          </h2>
        </div>

        <p className="arch-legend mx-auto mt-8 flex max-w-[900px] items-center justify-center gap-6 text-xs text-[#8a8a93]" aria-hidden="true">
          <span className="inline-flex items-center gap-2">
            <span className="arch-legend__swatch arch-legend__swatch--dashed" /> Your stack
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="arch-legend__swatch arch-legend__swatch--solid" /> PromptShield
          </span>
        </p>

        <div ref={sceneRef} className="arch-scene" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <div ref={stackRef} className="arch-stack">
            <div ref={fillRef} className="arch-fill" aria-hidden="true" />
            <span ref={packetRef} className="arch-packet" aria-hidden="true" />

            {LAYERS.map((layer, index) => (
              <div
                key={layer.id}
                ref={(el) => {
                  slabRefs.current[index] = el;
                }}
                data-state="future"
                className={layer.outside ? "arch-slab arch-slab--outside" : "arch-slab"}
              >
                <span
                  ref={(el) => {
                    nodeRefs.current[index] = el;
                  }}
                  data-state="future"
                  className="arch-node"
                  aria-hidden="true"
                />
                <span className="arch-slab__name-row" data-name-row>
                  <span className="arch-slab__name">{layer.name}</span>
                  {layer.role ? <span className="arch-slab__role">{layer.role}</span> : null}
                </span>

                {layer.id === "decision" ? (
                  <div className="arch-decisions" role="group" aria-label="Decision">
                    {DECISION_ORDER.map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={outcome === d}
                        onClick={() => handleOutcome(d)}
                        className="arch-chip"
                        data-decision={d}
                        data-selected={outcome === d ? "true" : "false"}
                        style={
                          outcome === d
                            ? {
                                background: DECISION_COLOURS[d],
                                color: "#0a0a0a",
                                borderColor: DECISION_COLOURS[d],
                              }
                            : undefined
                        }
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <p
          ref={outcomeRef}
          className="arch-outcome mt-8 text-center text-sm leading-6 text-[#a1a1aa]"
          aria-live="polite"
        >
          The prompt is still being checked.
        </p>
        <p className="mt-3 text-center text-xs text-[#8a8a93]">
          Scroll to send a prompt through the layers. Choose a decision to change the outcome.
        </p>
      </div>
    </section>
  );
}
