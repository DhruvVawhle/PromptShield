"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { FileText, ShieldCheck, Settings } from "lucide-react";
import { FlowButton } from "@/components/ui/flow-button";
import AetherRibbonMesh from "@/components/ui/aether-ribbon-mesh";
import GatewayFlow from "@/components/ui/gateway-flow";
import { ProductPreview } from "./ProductPreview";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function HeroSection() {
  const reducedMotion = useReducedMotion();
  const targetRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });
  


  const heroY = useTransform(scrollYProgress, [0, 1], [0, 72]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.7]);
  const accentY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  const fadeUp = reducedMotion
    ? { initial: false as const, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: EASE },
      };

  return (
    <section
      ref={targetRef}
      id="home"
      className="relative overflow-hidden border-b border-white/10 bg-black pb-14 pt-24 sm:pb-14 sm:pt-28 lg:pb-24 lg:pt-28"
    >
      <div className="absolute inset-0 bg-black" aria-hidden="true" />
      <div
        className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:64px_64px]"
        aria-hidden="true"
      />
      <motion.div
        aria-hidden="true"
        style={reducedMotion ? undefined : { y: accentY, opacity: heroOpacity }}
        className="pointer-events-none absolute inset-x-0 top-[-12%] mx-auto h-[420px] max-w-5xl rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.18),_transparent_56%)] blur-3xl"
      />
      <div className="absolute inset-0 opacity-40" aria-hidden="true">
        <AetherRibbonMesh embedded />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-100" aria-hidden="true">
        <GatewayFlow mode="dark" density={0.95} speed={0.7} opacity={0.9} className="h-full w-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 max-[860px]:grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 xl:gap-16">
          <motion.div
            {...fadeUp}
            style={reducedMotion ? undefined : { y: heroY, opacity: heroOpacity }}
            className="max-w-[34rem] pr-0 lg:pr-4"
            transition={{ ...(fadeUp.transition ?? {}), delay: 0.08 }}
          >
            <h1
              style={{ fontSize: "clamp(52px, 6.9vw, 104px)", fontWeight: 600, lineHeight: 0.9, letterSpacing: "-0.05em" }}
              className="mt-7 uppercase text-white"
            >
              <span className="block">BUILD</span>
              <span className="block">SAFER AI.</span>
            </h1>

            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22, ease: EASE }}
              className="mt-5 max-w-[580px] text-[18px] leading-[1.6] text-zinc-300"
            >
              PromptShield analyzes prompts, detects threats, applies security policies, and controls what reaches your AI
              models.
            </motion.p>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <FlowButton text="Try PromptShield" href="/login" />
              <a
                href="/security"
                className="inline-flex h-11 min-w-[168px] items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur transition-colors duration-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Explore Security
              </a>
            </motion.div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.38, ease: EASE }}
              className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-sm text-zinc-400"
              aria-label="PromptShield capabilities"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                Prompt analysis
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                Threat detection
              </span>
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                Policy control
              </span>
            </motion.div>
          </motion.div>

          <HeroPreviewArea reducedMotion={reducedMotion ?? false} heroY={heroY} />
        </div>
      </div>
    </section>
  );
}

function HeroPreviewArea({
  reducedMotion,
  heroY,
}: {
  reducedMotion: boolean;
  heroY: ReturnType<typeof useTransform<number, number>>;
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: 24, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      style={reducedMotion ? undefined : ({ y: heroY } as unknown as React.CSSProperties)}
      transition={{ duration: 0.85, delay: 0.22, ease: EASE }}
      className="relative lg:-ml-1"
      id="hero-card-anchor"
    >
      <div className="absolute inset-x-12 -bottom-10 h-28 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
      <ProductPreview reducedMotion={reducedMotion} />
    </motion.div>
  );
}