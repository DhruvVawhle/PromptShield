"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AnalysisStep } from "@/lib/demo/promptAnalyzer";
import { ShieldCheck, AlertTriangle, RotateCcw, X } from "lucide-react";

const ICON_BY_TONE: Record<string, React.ComponentType<{ className?: string }>> = {
  allow: ShieldCheck,
  warn: AlertTriangle,
  sanitize: RotateCcw,
  block: X,
};

const SEVERITY_CLASS: Record<string, string> = {
  allow: "severity-info",
  warn: "severity-high",
  sanitize: "severity-medium",
  block: "severity-critical",
};

const SEVERITY_ICON_CLASS: Record<string, string> = {
  allow: "severity-icon-info",
  warn: "severity-icon-high",
  sanitize: "severity-icon-medium",
  block: "severity-icon-critical",
};

export function DecisionStep({
  step,
  index,
  reducedMotion,
  delay = 0,
}: {
  step: AnalysisStep;
  index: number;
  reducedMotion: boolean;
  delay?: number;
}) {
  const hookReduced = useReducedMotion();
  const isReduced = reducedMotion || !!hookReduced;
  const Icon = step.tone ? ICON_BY_TONE[step.tone] ?? ShieldCheck : ShieldCheck;
  const cardTone = step.tone ? SEVERITY_CLASS[step.tone] : "secondary-neutral";
  const iconTone = step.tone ? SEVERITY_ICON_CLASS[step.tone] : "severity-icon-low";

  return (
    <motion.div
      initial={isReduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-3 py-2.5",
        step.status === "complete" ? cn("border", cardTone) : "border-slate-200 bg-slate-50/60"
      )}
      role="listitem"
    >
      <span
        className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-semibold", iconTone)}
        aria-hidden="true"
      >
        {step.status === "complete" && step.tone ? <Icon className="h-3.5 w-3.5" /> : String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold leading-5 text-slate-900">{step.label}</span>
        <span className="block text-[12px] leading-5 text-slate-600">{step.result ?? "—"}</span>
      </span>
    </motion.div>
  );
}
