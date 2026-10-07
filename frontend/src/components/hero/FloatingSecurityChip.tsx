"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type ChipPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const POS: Record<ChipPosition, string> = {
  "top-left": "left-[-6%] top-[10%]",
  "top-right": "right-[-8%] top-[8%]",
  "bottom-left": "left-[-4%] bottom-[18%]",
  "bottom-right": "right-[-6%] bottom-[10%]",
};

export function FloatingSecurityChip({
  label,
  icon,
  position,
  reducedMotion,
  delay = 0,
}: {
  label: string;
  icon: React.ReactNode;
  position: ChipPosition;
  reducedMotion: boolean;
  delay?: number;
}) {
  const hookReduced = useReducedMotion();
  const isReduced = reducedMotion || !!hookReduced;

  return (
    <motion.div
      initial={isReduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.55 + delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("pointer-events-none absolute z-[2] hidden lg:flex", POS[position])}
      aria-hidden="true"
    >
      <motion.div
        animate={isReduced ? undefined : { y: [0, -5, 0] }}
        transition={isReduced ? undefined : { duration: 4.2, repeat: Infinity, ease: "easeInOut", delay }}
        className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 bg-white/10 text-white/85">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90">{label}</span>
      </motion.div>
    </motion.div>
  );
}
