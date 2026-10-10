"use client"

import * as React from "react"
import {
  siClaude,
  siCursor,
  siDeepseek,
  siGithubcopilot,
  siGooglegemini,
  siHuggingface,
  siLangchain,
  siMeta,
  siMistralai,
  siOllama,
  siPerplexity,
} from "simple-icons"
import type { SimpleIcon } from "simple-icons"
import { SplitTextReveal } from "@/components/animations/split-text-reveal"

const OPENAI_PATH =
  "M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z"

type BrandIcon = {
  name: string
  title: string
  path: string
  background: string
  foreground: string
  darkTile?: boolean
}

function brandFromSimpleIcon(icon: SimpleIcon, name: string): BrandIcon {
  const background = `#${icon.hex}`
  const luminance = relativeLuminance(icon.hex)
  const darkTile = luminance < 0.05
  return {
    name,
    title: icon.title,
    path: icon.path,
    background: darkTile ? "#0b0b0d" : background,
    foreground: darkTile || luminance < 0.4 ? "#ffffff" : "#111111",
    darkTile,
  }
}

function relativeLuminance(hex: string): number {
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  })
  const [r, g, b] = channels as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ICONS: BrandIcon[] = [
  brandFromSimpleIcon(siClaude, "Claude"),
  { name: "OpenAI", title: "OpenAI", path: OPENAI_PATH, background: "#ffffff", foreground: "#111111" },
  brandFromSimpleIcon(siGooglegemini, "Google Gemini"),
  brandFromSimpleIcon(siGithubcopilot, "GitHub Copilot"),
  brandFromSimpleIcon(siCursor, "Cursor"),
  brandFromSimpleIcon(siPerplexity, "Perplexity"),
  brandFromSimpleIcon(siMistralai, "Mistral AI"),
  brandFromSimpleIcon(siHuggingface, "Hugging Face"),
  brandFromSimpleIcon(siLangchain, "LangChain"),
  brandFromSimpleIcon(siOllama, "Ollama"),
  brandFromSimpleIcon(siDeepseek, "DeepSeek"),
  brandFromSimpleIcon(siMeta, "Meta"),
]

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
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Capabilities</p>
            <SplitTextReveal
              as="h2"
              type="words"
              start="top 85%"
              delay={0.08}
              duration={1}
              stagger={0.06}
              y={40}
              className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl lg:text-[2.9rem] lg:leading-[1.04]"
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
                      <span className="mt-2.5 inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
