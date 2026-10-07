"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import { Copy, Check, X, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzePrompt, EXAMPLE_PROMPTS, type DemoAnalysisResult, type SecurityDecision } from "@/lib/demo/promptAnalyzer";
import { DecisionStep } from "./DecisionStep";

const DECISION_META: Record<SecurityDecision, { icon: React.ComponentType<{ className?: string }>; label: string; tone: "allow" | "warn" | "sanitize" | "block" }> = {
  ALLOW: { icon: ShieldCheck, label: "Allowed", tone: "allow" },
  WARN: { icon: AlertTriangle, label: "Warning", tone: "warn" },
  SANITIZE: { icon: RotateCcw, label: "Sanitized", tone: "sanitize" },
  BLOCK: { icon: X, label: "Blocked", tone: "block" },
};

export function SecurityDecisionView({ reducedMotion, compact = false }: { reducedMotion: boolean; compact?: boolean }) {
  const [prompt, setPrompt] = React.useState(EXAMPLE_PROMPTS[0].text);
  const [analysis, setAnalysis] = React.useState<DemoAnalysisResult>(() => analyzePrompt(EXAMPLE_PROMPTS[0].text));
  const [copied, setCopied] = React.useState(false);
  const isReducedHook = useReducedMotion();
  const isReduced = reducedMotion || !!isReducedHook;

  const onPromptChange = React.useCallback(
    (next: string) => {
      setPrompt(next);
      setAnalysis(analyzePrompt(next));
      setCopied(false);
    },
    []
  );

  const onExample = React.useCallback(
    (text: string) => {
      onPromptChange(text);
    },
    [onPromptChange]
  );

  const tone = DECISION_META[analysis.decision].tone;
  const Icon = DECISION_META[analysis.decision].icon;

  const sanitizedText =
    analysis.sanitizedPrompt != null
      ? analysis.sanitizedPrompt
      : analysis.decision === "BLOCK"
        ? "Blocked. Nothing was forwarded."
        : "—";

  const canCopy = analysis.sanitizedPrompt != null || analysis.decision === "BLOCK";

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Security decision</h3>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Risk Score</p>
          <p className="tabular-nums text-[22px] font-bold leading-none tracking-[-0.02em] text-slate-900">
            {analysis.riskScore}
            <span className="text-[13px] font-medium text-slate-400">/100</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <label htmlFor="ps-demo-prompt" className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          USER PROMPT
        </label>
        <textarea
          id="ps-demo-prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={compact ? 2 : 3}
          className="mt-2 min-h-[64px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13.5px] leading-6 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-300"
          placeholder="Summarize this article in three bullet points."
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example prompts">
        {EXAMPLE_PROMPTS.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => onExample(ex.text)}
            aria-pressed={ex.text === prompt}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] transition-colors",
              ex.text === prompt
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">AI GUARD</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
              tone === "allow" && "severity-info",
              tone === "warn" && "severity-high",
              tone === "sanitize" && "severity-medium",
              tone === "block" && "severity-critical"
            )}
          >
            <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full border", tone === "allow" && "severity-icon-info", tone === "warn" && "severity-icon-high", tone === "sanitize" && "severity-icon-medium", tone === "block" && "severity-icon-critical")}>
              <Icon className="h-3 w-3" aria-hidden="true" />
            </span>
            {DECISION_META[analysis.decision].label}
          </span>
        </div>

        <div className="mt-3 grid gap-2" role="list" aria-label="Security analysis steps">
          {analysis.steps.map((step, i) => (
            <DecisionStep key={step.id} step={step} index={i} reducedMotion={isReduced} delay={i * 0.06} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">SANITIZED PROMPT</span>
          {canCopy && (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(sanitizedText);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label={copied ? "Copied" : "Copy sanitized prompt"}
            >
              {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        <p className="mt-2 min-h-6 whitespace-pre-wrap break-words rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 font-mono text-[12.5px] leading-5 text-slate-700">
          {sanitizedText}
        </p>
      </div>

      <p className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] leading-5 text-slate-600">{analysis.reasoning}</p>
    </div>
  );
}
