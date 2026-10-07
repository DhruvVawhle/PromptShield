"use client"

import * as React from "react"
import { IBM_Plex_Mono } from "next/font/google"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { useLenis } from "lenis/react"
import { CAPABILITIES, PIPELINE } from "./capabilities"
import { AnalysisView, DetectionView, DecisionView } from "./capabilities-panels"
import { cn } from "@/lib/utils"

gsap.registerPlugin(useGSAP, ScrollTrigger)

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
})

const SNAP = [0.3067, 0.64, 0.9733] as const

export function CapabilitiesSection() {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const sectionRef = React.useRef<HTMLElement>(null)
  const railRef = React.useRef<HTMLDivElement>(null)
  const mainRef = React.useRef<HTMLDivElement>(null)
  const tabWrapRef = React.useRef<HTMLDivElement>(null)
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const progressRefs = React.useRef<HTMLSpanElement[]>([])
  const panelRef = React.useRef<HTMLDivElement>(null)
  const lenis = useLenis()

  const [mounted, setMounted] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(0)
  const [mobileIdx, setMobileIdx] = React.useState(0)
  const activeIdxRef = React.useRef(0)
  const localRef = React.useRef(0)
  const stRef = React.useRef<ScrollTrigger | null>(null)
  const numberRef = React.useRef<HTMLSpanElement>(null)
  const barRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  React.useEffect(() => {
    if (!mounted) return
    const onFontsReady = () => ScrollTrigger.refresh()
    if (document.fonts?.ready) document.fonts.ready.then(onFontsReady).catch(() => {})
    const onResize = () => ScrollTrigger.refresh()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [mounted])

  const getSegmentAndLocal = React.useCallback((p: number) => {
    const clipped = Math.min(0.9999, p) * 3
    const segment = Math.min(2, Math.floor(clipped))
    const local = clipped - segment
    return { segment, local }
  }, [])

  const goToSnap = React.useCallback(
    (idx: number) => {
      const st = stRef.current
      if (!st) return
      const start = st.start
      const end = st.end
      const target = start + (end - start) * SNAP[idx]!
      const wrappedLenis = lenis as unknown as { scrollTo?: (t: number, o?: unknown) => void } | null
      if (wrappedLenis?.scrollTo) wrappedLenis.scrollTo(target, { duration: 0.9 })
      else window.scrollTo({ top: target, behavior: "smooth" })
    },
    [lenis]
  )

  const handleTabKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const n = CAPABILITIES.length
      let next = activeIdx
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault()
        next = (activeIdx + 1) % n
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault()
        next = (activeIdx - 1 + n) % n
      } else if (e.key === "Home") {
        e.preventDefault()
        next = 0
      } else if (e.key === "End") {
        e.preventDefault()
        next = n - 1
      } else return
      if (next !== activeIdx) {
        if (mounted) goToSnap(next)
        else setMobileIdx(next)
      }
    },
    [activeIdx, goToSnap, mounted]
  )

  useGSAP(
    () => {
      if (!mounted) return
      const section = sectionRef.current
      const wrap = wrapRef.current
      const rail = railRef.current
      const main = mainRef.current
      if (!section || !wrap || !rail || !main) return

      const mm = gsap.matchMedia()
      mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
        const st = ScrollTrigger.create({
          trigger: wrap,
          start: "top 72px",
          end: () => `+=${window.innerHeight * 3}`,
          pin: true,
          scrub: 0.4,
          snap: {
            snapTo: SNAP as unknown as number[],
            duration: { min: 0.25, max: 0.6 },
            delay: 0.12,
            ease: "power1.inOut",
          },
          onUpdate: (self) => {
            const { segment, local } = getSegmentAndLocal(self.progress)
            localRef.current = local
            if (segment !== activeIdxRef.current) {
              activeIdxRef.current = segment
              setActiveIdx(segment)
            }
            const activeCap = CAPABILITIES[activeIdxRef.current]
            applyLocalProgress(activeCap?.id ?? CAPABILITIES[0]!.id, local)
          },
        })
        stRef.current = st
        const init = getSegmentAndLocal(st.progress)
        activeIdxRef.current = init.segment
        setActiveIdx(init.segment)
        applyLocalProgress(CAPABILITIES[init.segment]!.id, init.local)
        return () => {
          st.kill()
          stRef.current = null
        }
      })
      return () => mm.revert()
    },
    { scope: sectionRef }
  )

  function applyLocalProgress(capId: string, local: number) {
    const tabs = tabWrapRef.current?.querySelectorAll<HTMLElement>("[data-cap-tab]")
    tabs?.forEach((el) => {
      const id = el.getAttribute("data-cap-tab")
      const isActive = id === capId
      const pr = el.querySelector<HTMLElement>("[data-cap-progress]")
      if (!pr) return
      if (!isActive) pr.style.transform = "scaleY(0)"
      else pr.style.transform = `scaleY(${local})`
    })
    if (numberRef.current) {
      const num = Math.round(local * 92)
      numberRef.current.textContent = `${num} / 100`
    }
    if (barRef.current) {
      barRef.current.style.width = `${Math.round(local * 92)}%`
    }
  }

  React.useEffect(() => {
    if (!mounted) return
    const mql = window.matchMedia("(min-width: 901px) and (prefers-reduced-motion: no-preference)")
    if (!mql.matches) return
    const activeCap = CAPABILITIES[activeIdx]
    if (!activeCap) return
    applyLocalProgress(activeCap.id, localRef.current)
  }, [activeIdx, mounted])

  const isPinned = mounted && typeof window !== "undefined" && window.matchMedia("(min-width: 901px)").matches !== false

  const renderPanelContent = React.useCallback(
    (cap: (typeof CAPABILITIES)[number], progress: number) => {
      if (cap.id === "analyze") return <AnalysisView progress={progress} />
      if (cap.id === "detect") return <DetectionView progress={progress} />
      return <DecisionView progress={progress} />
    },
    []
  )

  const activeCap = CAPABILITIES[activeIdx] ?? CAPABILITIES[0]!
  const mobileCap = CAPABILITIES[mobileIdx] ?? CAPABILITIES[0]!

  const localForRender = mounted
    ? localRef.current
    : 1

  return (
    <section
      ref={sectionRef}
      id="detection"
      data-mounted={mounted ? "true" : "false"}
      className={`scroll-mt-24 border-t border-border bg-page py-16 sm:py-20 ${plexMono.variable}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <span className="h-px w-[22px] shrink-0 bg-border" aria-hidden="true" />
              Capabilities
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
              Defense built for modern AI applications.
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-[#465266] lg:text-right">
            Every prompt is analyzed, scored, and checked against policy before your model sees it.
          </p>
        </div>
      </div>

      <div ref={wrapRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {PIPELINE.map((stage, i) => {
            const pillActive =
              (stage === "Prompt" && activeCap.railIndex >= 0) ||
              (stage === "Analyze" && activeCap.railIndex >= 1) ||
              (stage === "Detect" && activeCap.railIndex >= 2) ||
              (stage === "Decide" && activeCap.railIndex >= 4) ||
              (stage === "Protect" && activeCap.railIndex >= 4)
            const isNow =
              (activeCap.railIndex === 1 && stage === "Analyze") ||
              (activeCap.railIndex === 2 && stage === "Detect") ||
              (activeCap.railIndex === 4 && (stage === "Decide" || stage === "Protect"))

            return (
              <button
                key={stage}
                type="button"
                onClick={() => {
                  const idx = stage === "Prompt" ? 0 : stage === "Analyze" ? 0 : stage === "Detect" ? 1 : 2
                  if (mounted && window.matchMedia("(min-width: 901px)").matches) goToSnap(idx)
                  else setMobileIdx(idx)
                }}
                className={
                  isNow
                    ? "rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                    : pillActive
                      ? "rounded-full border border-foreground/20 bg-foreground px-3 py-1 text-xs font-medium text-background"
                      : "rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                }
              >
                {stage}
              </button>
            )
          })}
        </div>

        <div
          ref={mainRef}
          className="mt-8 grid gap-6 lg:grid-cols-[5fr_7fr] lg:items-start"
        >
          <div
            ref={tabWrapRef}
            role="tablist"
            aria-label="Capabilities"
            onKeyDown={handleTabKeyDown}
            className="flex flex-col gap-0"
          >
            {CAPABILITIES.map((cap, idx) => {
              const isActive = mounted ? idx === activeIdx : idx === mobileIdx
              return (
                <button
                  key={cap.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el
                  }}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  type="button"
                  data-cap-tab={cap.id}
                  onClick={() => {
                    if (mounted && window.matchMedia("(min-width: 901px)").matches) goToSnap(idx)
                    else setMobileIdx(idx)
                  }}
                  className={cn(
                    "relative flex flex-col gap-2 border-l-2 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                    isActive ? "border-foreground" : "border-border"
                  )}
                >
                  <span
                    data-cap-progress
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-0.5 origin-top bg-foreground"
                    style={{ transform: isActive ? `scaleY(${localForRender})` : "scaleY(0)", transformOrigin: "top" }}
                  />
                  <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {String(idx + 1).padStart(2, "0")} / {cap.stage}
                  </span>
                  <span className="text-2xl font-semibold tracking-[-0.02em] text-foreground">{cap.title}</span>
                  <span className={isActive ? "grid grid-rows-[1fr] overflow-hidden transition-[grid-template-rows] duration-300" : "grid grid-rows-[0fr] overflow-hidden transition-[grid-template-rows] duration-300"}>
                    <span className="overflow-hidden">
                      <span className="mt-2 block text-sm leading-6 text-[#465266]">{cap.description}</span>
                      <span className="mt-3 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {cap.tag}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div
            ref={panelRef}
            role="tabpanel"
            aria-live="polite"
            className="min-h-[350px] rounded-[14px] border border-border bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Security flow</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {(mounted ? activeCap : mobileCap).title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(mounted ? activeCap : mobileCap).subtitle}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Protected</span>
            </div>

            <div className="mt-6">
            {(() => {
              const cap = mounted ? activeCap : mobileCap
              if (!mounted) return renderPanelContent(cap, 1)
              const matches =
                typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
              const p = matches ? 1 : localRef.current || (cap.id === activeCap.id ? 0.92 : 0)
              return renderPanelContent(cap, p)
            })()}
          </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground">Outcome</p>
              <p className="text-sm font-semibold text-emerald-600">Protected request path</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[#465266]">
          <span className="hidden lg:inline">Scroll to move the prompt through each capability. </span>
          Illustrative security flow, not a live analysis.
        </p>
      </div>
    </section>
  )
}


