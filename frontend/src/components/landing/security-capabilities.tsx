"use client"

import * as React from "react"
import { SplitTextReveal } from "@/components/animations/split-text-reveal"
import { BRAND_ICONS as ICONS, type BrandIcon } from "./brand-icons"

const CAPABILITIES = [
  {
    index: "01",
    title: "Prompt Analysis",
    description:
      "Normalize every prompt, inspect its structure, and explain why it received its risk classification before execution.",
    tag: "Risk score 0\u2013100",
  },
  {
    index: "02",
    title: "Threat Detection",
    description:
      "Detect prompt injection, jailbreak attempts, instruction manipulation, obfuscation, and suspicious instructions.",
    tag: "Injection coverage",
  },
  {
    index: "03",
    title: "Security Decision",
    description:
      "Allow, warn, sanitize, or block the request, then enforce guardrails before it reaches the model, provider, or tool layer.",
    tag: "Allow \u00b7 Warn \u00b7 Sanitize \u00b7 Block",
  },
] as const

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(reducedMotionQuery).matches
}

export function SecurityCapabilities() {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    const card = cardRef.current
    if (!card) return
    if (prefersReducedMotion()) {
      setTimeout(() => setInView(true), 0)
      return
    }
    if (typeof IntersectionObserver === "undefined") {
      setTimeout(() => setInView(true), 0)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry || !entry.isIntersecting) return
        setInView(true)
        observer.disconnect()
      },
      { threshold: 0.25 }
    )
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="detection" className="scroll-mt-24 overflow-hidden border-t border-border bg-page">
      <div className="mx-auto box-border w-full max-w-[1120px] px-4 py-12 min-[860px]:px-6 min-[860px]:py-20">
        <div className="grid min-w-0 items-center gap-8 min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] min-[860px]:gap-12">
          <div className="min-w-0">
            <SplitTextReveal
              as="h2"
              type="words"
              start="top 85%"
              delay={0.08}
              duration={1}
              stagger={0.06}
              y={40}
              className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl lg:text-[2.9rem] lg:leading-[1.04]"
            >
              Defense built for modern AI applications.
            </SplitTextReveal>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Every prompt is analyzed, scored, and checked against policy before your model sees it.
            </p>

            <ul className="mt-8 border-t border-border">
              {CAPABILITIES.map((capability) => (
                <li key={capability.index} className="border-b border-border py-5">
                  <div className="flex items-start gap-4">
                    <span className="mt-1 shrink-0 font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground">
                      {capability.index}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">{capability.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{capability.description}</p>
                      <span className="mt-2.5 inline-flex rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {capability.tag}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            ref={cardRef}
            data-in-view={inView ? "true" : "false"}
            className="box-border min-w-0 w-full max-w-full overflow-hidden rounded-[26px] bg-[#1a191e] px-[22px] pb-[22px] pt-[28px] text-white min-[860px]:rounded-[32px] min-[860px]:px-10 min-[860px]:pb-[30px] min-[860px]:pt-11"
          >
            <ul
              aria-label="Agents and models PromptShield can sit in front of"
              className="grid w-full min-w-0 grid-cols-4 gap-[14px] min-[860px]:gap-5"
            >
              {ICONS.map((icon, index) => (
                <li
                  key={icon.name}
                  data-capability-tile
                  style={{ animationDelay: `${index * 70}ms` }}
                  className="relative isolate flex aspect-square min-w-0 w-full items-center justify-center overflow-hidden rounded-[20%] will-change-transform"
                >
                  <span className="sr-only">{icon.name}</span>
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: icon.background, border: icon.darkTile ? "1px solid #34323b" : undefined }}
                    className="absolute inset-0 rounded-[20%]"
                  />
                  <span
                    aria-hidden="true"
                    className="relative z-10 flex h-full w-full shrink-0 items-center justify-center"
                    style={{ color: icon.foreground }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="46%"
                      height="46%"
                      className="h-[46%] w-[46%] max-h-[46%] max-w-[46%] shrink-0"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d={icon.path} />
                    </svg>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 h-px w-full bg-[#3a3841]" aria-hidden="true" />

            <div className="mt-[22px] flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span className="whitespace-nowrap text-[16px] font-semibold tracking-[-0.01em] text-white min-[640px]:text-[19px]">
                Analyze
              </span>
              <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-[#8b8993]" aria-hidden="true" />
              <span className="whitespace-nowrap text-[16px] font-semibold tracking-[-0.01em] text-white min-[640px]:text-[19px]">
                Detect
              </span>
              <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-[#8b8993]" aria-hidden="true" />
              <span className="whitespace-nowrap text-[16px] font-semibold tracking-[-0.01em] text-white min-[640px]:text-[19px]">
                Protect
              </span>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs leading-5 text-muted-foreground">
          Logos are trademarks of their respective owners, shown for illustration only. Not an endorsement or partnership.
        </p>
      </div>
    </section>
  )
}
