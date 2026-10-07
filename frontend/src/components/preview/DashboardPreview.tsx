"use client";

import * as React from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ShieldAlert, ShieldX, TriangleAlert } from "lucide-react";
import { ChartCard, AreaTrend, BarCompare, DonutBreakdown, Sparkline } from "@/components/ui/revenue-charts-kpi";
import { PERIODS, CATEGORY_LABELS, type PeriodKey } from "./preview-data";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function DashboardPreview() {
  const [period, setPeriod] = React.useState<PeriodKey>("7d");
  const sectionRef = React.useRef<HTMLElement>(null);
  const windowRef = React.useRef<HTMLDivElement>(null);
  const kpiRowRef = React.useRef<HTMLDivElement>(null);
  const areaWrapRef = React.useRef<HTMLDivElement>(null);
  const barWrapRef = React.useRef<HTMLDivElement>(null);
  const donutWrapRef = React.useRef<HTMLDivElement>(null);
  const eventsRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const data = PERIODS[period];

  const lastIdx = data.detected.length - 1;
  const prevIdx = data.detected.length - 2;
  const threatsDetected = data.detected[lastIdx]!;
  const prevThreats = data.detected[prevIdx]!;
  const threatsDeltaVal = threatsDetected - prevThreats;
  const threatsDelta = `+${threatsDeltaVal} ${data.periodLabel}`;

  const riskNow = data.risk[lastIdx]!;
  const riskPrev = data.risk[prevIdx]!;
  const riskDelta = `+${riskNow - riskPrev} ${data.periodLabel}`;

  const threatTrendData = data.xLabels.map((label, i) => ({
    name: label,
    Detected: data.detected[i],
    Blocked: data.blocked[i],
  }));

  const decisionData = data.xLabels.map((label, i) => ({
    name: label,
    Warn: data.warn[i],
    Sanitize: data.sanitize[i],
    Block: data.blocked[i],
    Allow: data.allow[i],
  }));

  const donutData = CATEGORY_LABELS.map((label, i) => ({
    label,
    value: data.categories[i]!,
    color: ["#0f172a", "#475569", "#94a3b8", "#cbd5e1"][i]!,
  }));

  useGSAP(
    () => {
      if (!mounted || typeof window === "undefined") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const win = windowRef.current;
        if (win) {
          win.style.setProperty("--y", "0px");
          win.style.setProperty("--rx", "0deg");
          win.style.setProperty("--s", "1");
        }
        return;
      }
      const win = windowRef.current;
      if (!win) return;
      const isNarrow = window.matchMedia("(max-width: 900px)").matches;
      const tilt0 = isNarrow ? 14 : 26;

      const render = (progress: number) => {
        const p = clamp01(progress);
        const e = easeOutCubic(clamp01(p / 0.7));
        const rx = tilt0 * (1 - e);
        const y = 50 * (1 - e);
        const s = 0.94 + 0.06 * e;
        win.style.setProperty("--rx", `${rx}deg`);
        win.style.setProperty("--y", `${y}px`);
        win.style.setProperty("--s", String(s));
        const q = easeOutCubic(clamp01((p - 0.45) / 0.45));
        const clipVal = `inset(0 calc(${(1 - q) * 100}%) 0 0)`;
        const areaWrap = areaWrapRef.current;
        const barWrap = barWrapRef.current;
        const donutWrap = donutWrapRef.current;
        if (areaWrap) areaWrap.style.clipPath = clipVal;
        if (barWrap) barWrap.style.clipPath = clipVal;
        if (donutWrap) donutWrap.style.clipPath = q >= 0.98 ? "none" : clipVal;
        const sparkWraps = kpiRowRef.current?.querySelectorAll<HTMLElement>("[data-sparkline-wrap]");
        sparkWraps?.forEach((el) => {
          el.style.clipPath = clipVal;
        });
        const eventRows = eventsRef.current?.querySelectorAll<HTMLElement>("[data-event-row]");
        eventRows?.forEach((el, i) => {
          const threshold = 0.62 + i * 0.1;
          el.style.opacity = q >= threshold ? "1" : "0";
          el.style.transform = q >= threshold ? "translateY(0)" : "translateY(6px)";
        });
        const kpiEls = kpiRowRef.current?.querySelectorAll<HTMLElement>("[data-kpi-count]");
        kpiEls?.forEach((el) => {
          const finalVal = parseInt(el.getAttribute("data-final") ?? "0", 10);
          if (Number.isNaN(finalVal)) return;
          el.textContent = String(Math.round(finalVal * q));
        });
      };

      render(0);
      const st = ScrollTrigger.create({
        trigger: win,
        start: "top 88%",
        end: "top 15%",
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => render(self.progress),
      });
      return () => {
        st.kill();
      };
    },
    { scope: sectionRef, dependencies: [mounted, period] }
  );

  React.useEffect(() => {
    if (!mounted) return;
    const onFontsReady = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) document.fonts.ready.then(onFontsReady).catch(() => {});
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  // Re-apply current scroll progress after period switch
  React.useEffect(() => {
    if (!mounted) return;
    // tick ScrollTrigger so the new period's count reflects current scroll position
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [period, mounted]);

  return (
    <section
      ref={sectionRef}
      className="scroll-mt-24 border-t border-border py-20"
      style={
        {
          ["--chart-1" as string]: "oklch(0.17 0.02 248)",
          ["--chart-2" as string]: "var(--severity-high)",
          ["--chart-3" as string]: "var(--severity-medium)",
          ["--chart-4" as string]: "var(--severity-critical)",
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Preview</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
            A glimpse of the PromptShield security experience.
          </h2>
        </div>

        <div
          ref={windowRef}
          className="mt-10 overflow-visible"
          style={
            {
              perspective: "1800px",
              transformOrigin: "50% 0",
              transform: mounted
                ? "translateY(var(--y, 0px)) rotateX(var(--rx, 0deg)) scale(var(--s, 1))"
                : "none",
            } as React.CSSProperties
          }
        >
          <div className="rounded-[22px] border border-[#d6dfeb] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">Security overview</h3>
              <div className="flex items-center gap-3">
                <div role="radiogroup" aria-label="Time range" className="inline-flex rounded-full border border-border bg-muted p-1">
                  {(["7 days", "4 weeks"] as const).map((label) => {
                    const key: PeriodKey = label === "7 days" ? "7d" : "4w";
                    const selected = period === key;
                    return (
                      <button
                        key={label}
                        role="radio"
                        aria-checked={selected}
                        aria-label={label}
                        onClick={() => setPeriod(key)}
                        className={
                          selected
                            ? "rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <span className="secondary-neutral inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium shadow-none">
                  Example data
                </span>
              </div>
            </div>

            <div ref={kpiRowRef} className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Threats detected</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                    <span data-kpi-count data-final={String(threatsDetected)}>
                      {threatsDetected}
                    </span>
                  </p>
                  <span className="text-xs font-medium tabular-nums text-[var(--severity-critical)]">{threatsDelta}</span>
                </div>
                <div className="mt-3 h-9 w-full overflow-hidden" data-sparkline-wrap>
                  <Sparkline data={data.detected} color="var(--foreground-primary)" />
                </div>
                <table className="sr-only" aria-label="Threats detected sparkline data">
                  <tbody>
                    <tr>
                      {data.detected.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Risk score</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                    <span data-kpi-count data-final={String(riskNow)}>
                      {riskNow}
                    </span>
                    <span className="font-normal text-muted-foreground"> / 100</span>
                  </p>
                  <span className="text-xs font-medium tabular-nums text-[var(--severity-critical)]">{riskDelta}</span>
                </div>
                <div className="mt-3 h-9 w-full overflow-hidden" data-sparkline-wrap>
                  <Sparkline data={data.risk} color="var(--severity-critical)" />
                </div>
                <table className="sr-only" aria-label="Risk score sparkline data">
                  <tbody>
                    <tr>
                      {data.risk.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Decision trend</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">Monitor</p>
                </div>
                <div className="mt-3 h-9 w-full overflow-hidden" data-sparkline-wrap>
                  <Sparkline data={data.blocked} color="var(--foreground-muted)" />
                </div>
                <table className="sr-only" aria-label="Decision trend sparkline data">
                  <tbody>
                    <tr>
                      {data.blocked.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Threats over time" subtitle="Detected and blocked">
                <div ref={areaWrapRef}>
                  <AreaTrend
                    data={threatTrendData}
                    xKey="name"
                    series={[
                      { key: "Detected", label: "Detected", color: "var(--foreground-primary)", fillOpacity: 0.06 },
                      { key: "Blocked", label: "Blocked", color: "var(--severity-critical)", fillOpacity: 0.07 },
                    ]}
                    height={180}
                  />
                </div>
              </ChartCard>
              <ChartCard title="Decisions" subtitle="Interventions by outcome">
                <div ref={barWrapRef}>
                  <BarCompare
                    data={decisionData}
                    xKey="name"
                    series={[
                      { key: "Warn", label: "Warn", color: "var(--severity-high)" },
                      { key: "Sanitize", label: "Sanitize", color: "var(--severity-medium)" },
                      { key: "Block", label: "Block", color: "var(--severity-critical)" },
                    ]}
                    height={180}
                    stacked
                  />
                </div>
              </ChartCard>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Threat categories" subtitle="By attack vector">
                <div ref={donutWrapRef}>
                  <DonutBreakdown data={donutData} height={200} centerLabel="Total" />
                </div>
              </ChartCard>
              <div ref={eventsRef} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">Sample events</h3>
                <p className="mt-1 text-xs text-muted-foreground">Recent blocked and flagged prompts</p>
                <div className="mt-4 space-y-3">
                  {[
                    { type: "Prompt injection", severity: "Critical", decision: "Block", Icon: ShieldX, iconClass: "severity-icon-critical", badgeClass: "severity-critical" },
                    { type: "Sensitive extraction", severity: "High", decision: "Warn", Icon: TriangleAlert, iconClass: "severity-icon-high", badgeClass: "severity-high" },
                    { type: "Jailbreak attempt", severity: "Medium", decision: "Sanitize", Icon: ShieldAlert, iconClass: "severity-icon-medium", badgeClass: "severity-medium" },
                  ].map((ev) => (
                    <div
                      key={ev.type}
                      data-event-row
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5"
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${ev.iconClass}`} aria-hidden="true">
                        <ev.Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize text-foreground">{ev.type}</p>
                        <p className="text-xs capitalize text-muted-foreground">{ev.severity}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${ev.badgeClass}`}>{ev.decision}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">Example data, not a live analysis.</p>
        <p className="mt-2 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Open dashboard <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
