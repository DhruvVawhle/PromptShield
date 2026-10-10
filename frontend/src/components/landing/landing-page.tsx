"use client"

import * as React from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronDown,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { FlowButton } from "@/components/ui/flow-button"
import { SecurityCapabilities } from "./security-capabilities"
import { DashboardPreview } from "@/components/preview/DashboardPreview"

import { HeroSection } from "@/components/hero/Hero"
import { ProblemSection } from "@/components/problem/ProblemSection"
import { WorkflowSection } from "@/components/workflow/WorkflowSection"
import { AttackCoverage } from "@/components/attack-coverage/AttackCoverage"
import { ArchitectureSection } from "@/components/architecture/ArchitectureSection"

const FAQItems = [
  {
    question: "What is PromptShield?",
    answer:
      "PromptShield is an AI security gateway that analyzes prompts before they reach an LLM, detects suspicious behavior, explains risk, and enforces allow, warn, sanitize, or block decisions.",
  },
  {
    question: "What is prompt injection?",
    answer:
      "Prompt injection is an attack where malicious instructions are inserted into a prompt to manipulate an AI system into ignoring its intended rules, revealing sensitive information, or performing unintended actions.",
  },
  {
    question: "How does PromptShield detect attacks?",
    answer:
      "PromptShield analyzes prompts for malicious intent, suspicious patterns, policy violations, and known attack techniques before allowing them to reach the target AI model.",
  },
  {
    question: "What happens when a prompt is blocked?",
    answer:
      "PromptShield prevents the unsafe request from reaching the LLM and records an explainable security decision so the application can understand why the request was blocked.",
  },
  {
    question: "Can PromptShield sanitize prompts?",
    answer:
      "Yes. PromptShield can sanitize potentially unsafe content when appropriate instead of completely blocking the request, allowing safer input to continue through the AI pipeline.",
  },
  {
    question: "What does the risk score represent?",
    answer:
      "The risk score represents the estimated security risk associated with a prompt based on detected threats, suspicious behavior, and policy violations.",
  },
  {
    question: "Can PromptShield work with different LLM providers?",
    answer:
      "Yes. PromptShield is designed as an AI security gateway and can sit between applications and different LLM providers without requiring the application to be tied to a single model provider.",
  },
  {
    question: "Does PromptShield store prompts?",
    answer:
      "PromptShield should follow the application's configured privacy and logging policies. Prompt content should only be retained when required by the configured security, debugging, or analytics workflow.",
  },
  {
    question: "Can PromptShield be integrated into an existing AI application?",
    answer:
      "Yes. PromptShield is designed to integrate between an existing application and its AI/LLM provider, allowing security analysis and policy enforcement without rebuilding the application's core AI functionality.",
  },
] as const

export function HowItWorks() {
  return <WorkflowSection />
}

function ThreatCategories() {
  return <AttackCoverage />;
}

function ProductPreview() {
  return <DashboardPreview />;
}

function FAQSection() {
  const [openIndex, setOpenIndex] = React.useState(0);

  return (
    <section id="resources" className="scroll-mt-24 border-t border-border bg-page py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:gap-8 xl:gap-10">
          <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
            <div className="p-6 sm:p-7 lg:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">FAQS</p>
              <h2 className="mt-3 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[30px] lg:text-[32px]">
                Everything you need to know about PromptShield
              </h2>
              <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
                Can&apos;t find what you&apos;re looking for? Reach out to our{" "}
                <span className="font-semibold text-foreground">security team</span> for assistance.{" "}
                <span aria-hidden="true">→</span>
              </p>
            </div>
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/faq-workspace.svg"
                  alt="Minimal workspace preview"
                  width={640}
                  height={420}
                  className="h-auto w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {FAQItems.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={item.question}
                  className="overflow-hidden rounded-2xl border border-border bg-surface text-left transition-colors"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                  >
                    <span className="min-w-0 flex-1 text-[15px] font-medium leading-6 text-foreground sm:text-base">{item.question}</span>
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle text-muted-foreground"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`} />
                    </span>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 pt-0 text-sm leading-7 text-muted-foreground sm:px-6">{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="border-t border-border bg-page py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface px-5 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:rounded-[32px] sm:px-8 sm:py-14 lg:rounded-[38px] lg:px-12 lg:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:32px_32px] text-foreground"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.04),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_70%)]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-10 hidden select-none flex-col gap-3 xl:flex xl:left-6 2xl:left-8"
          >
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-[168px] rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-subtle text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="mt-2.5 text-[12px] font-semibold leading-none text-foreground">Prompt Analysis</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Detect malicious intent</p>
            </motion.div>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="ml-6 w-[168px] rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-subtle text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="mt-2.5 text-[12px] font-semibold leading-none text-foreground">Risk Detection</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Analyze &amp; score</p>
            </motion.div>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-10 hidden select-none flex-col items-end gap-3 xl:flex xl:right-6 2xl:right-8"
          >
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.26 }}
              className="flex w-[176px] items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-sm"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-subtle text-muted-foreground">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold leading-none text-foreground">Shield</span>
                <span className="mt-1 block text-[11px] leading-none text-muted-foreground">Protected</span>
              </span>
            </motion.div>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.38 }}
              className="mr-4 flex w-[152px] flex-col gap-2 rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-sm"
            >
              <span className="h-1.5 w-12 rounded-full bg-border" aria-hidden="true" />
              <span className="h-1.5 w-full rounded-full bg-border" aria-hidden="true" />
              <span className="h-1.5 w-3/4 rounded-full bg-border" aria-hidden="true" />
              <span className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                Verified request
              </span>
            </motion.div>
          </div>

          <div className="relative z-10 mx-auto max-w-[760px] text-center">
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            >
              BUILD SAFER AI
            </motion.p>

            <motion.h2
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-4 font-semibold tracking-[-0.05em] text-foreground [font-size:clamp(2.5rem,6vw,4.2rem)] leading-[0.95] sm:[font-size:clamp(2.75rem,5vw,4.8rem)] lg:[font-size:clamp(3.5rem,5vw,5rem)]"
            >
              Detect. Explain. Defend.
            </motion.h2>

            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="mx-auto mt-5 max-w-[720px] text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-7"
            >
              Add a security layer that gives your AI applications the clarity to block risky prompts without
              compromising legitimate workflows.
            </motion.p>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <FlowButton text="Try PromptShield →" href="/login" />
              <Link
                href="/security"
                className="inline-flex h-[44px] items-center justify-center rounded-full border border-border bg-transparent px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Explore Security
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingPageShell() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <HowItWorks />
      <SecurityCapabilities />
      <ThreatCategories />
      <ArchitectureSection />
      <ProductPreview />
      <FAQSection />
      <FinalCTA />
    </>
  );
}

export function LandingPage() {
  const [mobileCtaVisible, setMobileCtaVisible] = React.useState(true)

  return (
    <main className="bg-page text-foreground">
      <LandingPageShell />
      {mobileCtaVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-page/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-12px_28px_rgba(15,23,42,0.08)] md:hidden backdrop-blur-sm">
          <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
            <FlowButton
              text="Try PromptShield"
              href="/login"
              className="flex-1 justify-center"
            />
            <button
              type="button"
              aria-label="Dismiss mobile call to action"
              onClick={() => setMobileCtaVisible(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-subtle text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
