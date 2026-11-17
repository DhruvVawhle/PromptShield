"use client"

import * as React from "react"
import Link from "next/link"
import { Copy, Check, Shield, ChevronDown, TrendingUp, ArrowUpRight, AlertTriangle } from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Panel } from "@/components/ui/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { useAuth } from "@/components/auth/AuthProvider"
import { EXAMPLE_PROMPTS, type SecurityDecision, type DemoAnalysisResult } from "@/lib/demo/promptAnalyzer"
import {
  listSecurityEvents,
  subscribeSecurityEvents,
  getPeriodDateRange,
  getPreviousPeriodDateRange,
  computeDashboardStats,
  buildThreatsOverTime,
  buildDecisionsOverTime,
  buildThreatCategories,
  formatRelativeTime,
  type SecurityEventWithId,
} from "@/lib/security-events"

const CHIPS: ReadonlyArray<{ label: string; prompt: string }> = [
  { label: "Safe", prompt: EXAMPLE_PROMPTS[0].text },
  { label: "Injection", prompt: EXAMPLE_PROMPTS[1].text },
  { label: "Jailbreak", prompt: EXAMPLE_PROMPTS[2].text },
  { label: "Sensitive", prompt: EXAMPLE_PROMPTS[3].text },
]


const DECISION_COLORS: Record<string, string> = {
  Allowed: "var(--severity-info)",
  Warned: "var(--severity-high)",
  Sanitized: "var(--severity-medium)",
  Blocked: "var(--severity-critical)",
}

function ToneBadge({ decision }: { decision: SecurityDecision }) {
  const tone = decision === "ALLOW" ? "allow" : decision === "WARN" ? "warn" : decision === "SANITIZE" ? "sanitize" : "block"
  return <StatusBadge tone={tone as never} label={decision} />
}

function MiniSpark({ color }: { color: string }) {
  const d = "M0 12 L8 8 L16 14 L24 6 L32 10 L40 4"
  return (
    <svg viewBox="0 0 40 16" className="h-6 w-16" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function DashboardRoutePage() {
  const { user, loading: authLoading } = useAuth()
  const [prompt, setPrompt] = React.useState(CHIPS[0].prompt)
  const [activeChip, setActiveChip] = React.useState("Safe")
  const [result, setResult] = React.useState<DemoAnalysisResult>({
    decision: "ALLOW",
    riskScore: 0,
    steps: [
      { id: "1", label: "Prompt Received", status: "pending", tone: "allow" },
      { id: "2", label: "Threat Detection", status: "pending", tone: "allow" },
      { id: "3", label: "Policy Evaluation", status: "pending", tone: "allow" },
      { id: "4", label: "Security Decision", status: "pending", tone: "allow" },
    ],
    reasoning: "Enter a prompt and analyze to see the security pipeline.",
    threats: [],
    policy: { id: "allow", name: "Default Allow Policy", description: "No threats detected.", severity: "allow" },
    primaryThreatLabel: null,
  })
  const [copied, setCopied] = React.useState(false)
  const [period, setPeriod] = React.useState<"7d" | "4w" | "30d">("7d")
  const [analyzing, setAnalyzing] = React.useState(false)
  const [analysisError, setAnalysisError] = React.useState<string | null>(null)
  const [events, setEvents] = React.useState<SecurityEventWithId[]>([])
  const [prevEvents, setPrevEvents] = React.useState<SecurityEventWithId[]>([])
  const [tokenAnalysis, setTokenAnalysis] = React.useState<any | null>(null)
  const [dataLoading, setDataLoading] = React.useState(true)
  const [dataError, setDataError] = React.useState<string | null>(null)

  const runAnalyze = React.useCallback(async () => {
    if (analyzing) return
    if (!user) {
      setAnalysisError("Authentication required. Please sign in to analyze prompts.")
      return
    }
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error?.message || errData?.error || `Analysis failed (HTTP ${res.status})`)
      }
      const data = await res.json()
      const threats: { category: string; label: string; policy: string; policyId: string }[] = (data.categories ?? []).map((cat: string) => ({
        category: cat,
        label: cat,
        policy: data.policyApplied?.name ?? "Security Engine",
        policyId: data.policyApplied?.id ?? "sys_default",
      }))
      const riskScore: number = data.riskScore ?? 0
      const decision: SecurityDecision = data.decision ?? "ALLOW"
      const sanitizedPrompt: string | undefined = data.sanitizedPrompt ?? undefined
      const reasoning: string = data.reasoning ?? "Analysis complete."
      const r: DemoAnalysisResult = {
        decision,
        riskScore,
        steps: [
          {
            id: "1",
            label: "Tokenization & Lexical Analysis",
            status: "complete" as const,
            result: `${data.tokenAnalysis?.wordCount ?? prompt.trim().split(/\s+/).length} words tokenized · ${data.latencyMs ?? "—"} ms`,
            tone: decision === "ALLOW" ? "allow" : decision === "WARN" ? "warn" : decision === "SANITIZE" ? "sanitize" : "block",
          },
          {
            id: "2",
            label: "Stemming & Threat Detection",
            status: "complete" as const,
            result:
              threats.length > 0
                ? `${threats[0].category}${data.tokenAnalysis?.flaggedTokens?.length ? ` [stem: ${data.tokenAnalysis.flaggedTokens[0].stem}]` : ""}`
                : "All words & stems verified safe",
            tone: decision === "ALLOW" ? "allow" : decision === "WARN" ? "warn" : decision === "SANITIZE" ? "sanitize" : "block",
          },
          {
            id: "3",
            label: "Policy Evaluation",
            status: "complete" as const,
            result: data.policyApplied?.name ?? "Default Guardrail Policy",
            tone: decision === "ALLOW" ? "allow" : decision === "WARN" ? "warn" : decision === "SANITIZE" ? "sanitize" : "block",
          },
          {
            id: "4",
            label: "Security Decision",
            status: "complete" as const,
            result: `${decision} — ${decision === "ALLOW" ? "Forwarded" : decision === "WARN" ? "Forwarded with flag" : decision === "SANITIZE" ? "Transformed" : "Denied"}`,
            tone: decision === "ALLOW" ? "allow" : decision === "WARN" ? "warn" : decision === "SANITIZE" ? "sanitize" : "block",
          },
        ],
        sanitizedPrompt,
        reasoning,
        threats,
        policy: {
          id: data.policyApplied?.id ?? "sys_default",
          name: data.policyApplied?.name ?? "Default Guardrail Policy",
          description: reasoning,
          severity: decision === "ALLOW" ? "allow" : decision === "WARN" ? "warn" : decision === "SANITIZE" ? "sanitize" : "block",
        },
        primaryThreatLabel: threats[0]?.category ?? null,
        confidence: data.confidence,
      }
      setResult(r)
      setTokenAnalysis(data.tokenAnalysis ?? null)

      // Optimistically update events state so dashboard graphs & counters refresh instantly
      const newEvent: SecurityEventWithId = {
        id: data.requestId || `ev_${Date.now()}`,
        uid: user.uid,
        promptId: data.requestId || `ev_${Date.now()}`,
        timestamp: new Date().toISOString() as any,
        riskScore,
        threatDetected: decision !== "ALLOW" || threats.length > 0,
        threatCategory: threats[0]?.category ?? null,
        decision,
        policy: data.policyApplied?.name ?? "Default Guardrail Policy",
        confidence: data.confidence ?? null,
        promptLength: prompt.length,
        prompt,
        promptSnippet: prompt.length > 300 ? prompt.slice(0, 300) + "..." : prompt,
        model: "promptshield-v1",
        sanitizedPrompt: sanitizedPrompt ?? null,
        status: "OPEN",
      }
      setEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id)])
    } catch (error) {
      console.error("Failed to analyze prompt:", error)
      setAnalysisError(error instanceof Error ? error.message : "Analysis failed. Please try again.")
    } finally {
      setAnalyzing(false)
    }
  }, [analyzing, prompt, user])

  const sanitizedText = React.useMemo(() => {
    if (result.decision === "SANITIZE") return result.sanitizedPrompt ?? "The request has been sanitized to remove malicious instructions."
    if (result.decision === "BLOCK") return "—  Blocked. Nothing was forwarded."
    return "—  No transformation needed."
  }, [result])

  const handleChip = (label: string, text: string) => {
    setActiveChip(label)
    setPrompt(text)
  }

  const onCopy = async () => {
    await navigator.clipboard.writeText(sanitizedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      runAnalyze()
    }
  }

  const steps = result.steps

  React.useEffect(() => {
    if (authLoading) return
    const uid = user?.uid
    if (!uid) {
      React.startTransition(() => {
        setEvents([])
        setPrevEvents([])
        setDataLoading(false)
      })
      return
    }
    React.startTransition(() => {
      setDataLoading(true)
      setDataError(null)
    })
    const { start, end } = getPeriodDateRange(period)
    const prev = getPreviousPeriodDateRange(period)
    let cancelled = false
    let currentUnsubscribe: (() => void) | null = null
    let prevUnsubscribe: (() => void) | null = null
    const onDataError = (error: Error) => {
      if (cancelled) return
      setDataError(error.message)
      setDataLoading(false)
    }
    const safeSubscribe = (fn: () => void) => {
      try {
        fn()
      } catch (error) {
        onDataError(error as Error)
      }
    }
    void listSecurityEvents(uid, { startDate: prev.start, endDate: prev.end })
      .then((rows) => {
        if (!cancelled) setPrevEvents(rows)
      })
      .catch(onDataError)
    safeSubscribe(() => {
      currentUnsubscribe = subscribeSecurityEvents(
        uid,
        { startDate: start, endDate: end },
        (rows) => {
          if (cancelled) return
          setEvents(rows)
          setDataLoading(false)
        },
        onDataError
      )
    })
    safeSubscribe(() => {
      prevUnsubscribe = subscribeSecurityEvents(
        uid,
        { startDate: prev.start, endDate: prev.end },
        (rows) => {
          if (!cancelled) setPrevEvents(rows)
        },
        () => {}
      )
    })
    return () => {
      cancelled = true
      currentUnsubscribe?.()
      prevUnsubscribe?.()
    }
  }, [authLoading, user?.uid, period])

  const stats = React.useMemo(() => computeDashboardStats(events), [events])
  const prevStats = React.useMemo(() => computeDashboardStats(prevEvents), [prevEvents])

  const threatsDelta = React.useMemo(() => {
    if (prevStats.totalAnalyzed === 0 && stats.totalAnalyzed === 0) return null
    if (prevStats.threatsDetected === 0 && stats.threatsDetected === 0) return null
    if (prevStats.threatsDetected === 0) return "+100%"
    const change = ((stats.threatsDetected - prevStats.threatsDetected) / prevStats.threatsDetected) * 100
    if (change === 0) return "0%"
    const sign = change > 0 ? "+" : ""
    return `${sign}${Math.round(change)}%`
  }, [prevStats.threatsDetected, prevStats.totalAnalyzed, stats.threatsDetected, stats.totalAnalyzed])

  const riskDelta = React.useMemo(() => {
    if (prevStats.totalAnalyzed === 0 && stats.totalAnalyzed === 0) return null
    if (prevStats.avgRiskScore === 0 && stats.avgRiskScore === 0) return null
    if (prevStats.avgRiskScore === 0) return "+100%"
    const change = ((stats.avgRiskScore - prevStats.avgRiskScore) / prevStats.avgRiskScore) * 100
    if (change === 0) return "0%"
    const sign = change > 0 ? "+" : ""
    return `${sign}${Math.round(change)}%`
  }, [prevStats.avgRiskScore, prevStats.totalAnalyzed, stats.avgRiskScore, stats.totalAnalyzed])

  const threatsOverTime = React.useMemo(() => buildThreatsOverTime(events, period), [events, period])
  const decisionsOverTime = React.useMemo(() => buildDecisionsOverTime(events, period), [events, period])
  const threatCategories = React.useMemo(() => buildThreatCategories(events), [events])
  const totalCategoryEvents = React.useMemo(() => threatCategories.reduce((sum, c) => sum + c.value, 0), [threatCategories])
  const recentEvents = React.useMemo(() => events.slice(0, 5), [events])
  const hasNoData = !dataLoading && events.length === 0
  const periodLabel = period === "7d" ? "Last 7 days" : period === "4w" ? "Last 4 weeks" : "Last 30 days"

  const decisionTrendLabel = React.useMemo(() => {
    if (stats.totalAnalyzed === 0) return "No activity"
    const { blocked, sanitized, warned } = stats
    if (blocked / stats.totalAnalyzed >= 0.5) return "Critical"
    if ((blocked + sanitized) / stats.totalAnalyzed >= 0.35) return "Elevated"
    if ((blocked + sanitized + warned) / stats.totalAnalyzed >= 0.2) return "Monitor"
    return "Healthy"
  }, [stats])

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr] 2xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Analyze prompt</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Test a prompt for security risks before execution.</p>
            </div>
            <div className="text-right">
              <span className="block text-xs font-medium text-muted-foreground">Risk score</span>
              <span className="text-2xl font-bold leading-none tracking-tight text-foreground tabular-nums">
                {result.riskScore} <span className="text-xs font-normal text-muted-foreground">/ 100</span>
              </span>
            </div>
          </div>

          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-muted-foreground">User prompt</label>
              {activeChip ? (
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Preset: {activeChip}</span>
              ) : (
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">Custom Input</span>
              )}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                setActiveChip("")
              }}
              onKeyDown={onKeyDown}
              rows={3}
              className="mt-2 min-h-[96px] w-full resize-y rounded-xl border border-border bg-surface-subtle px-3 py-3 text-[13px] leading-6 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Type any custom words or prompt to tokenize, stem, and evaluate..."
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {CHIPS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => handleChip(c.label, c.prompt)}
                  aria-pressed={activeChip === c.label}
                  className={
                    activeChip === c.label
                      ? "rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-all duration-150 active:scale-[0.97]"
                      : "rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 active:scale-[0.97]"
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={runAnalyze}
              disabled={analyzing}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              {analyzing ? "Analyzing…" : "Analyze Prompt"}
            </button>
            {analysisError ? (
              <p role="alert" className="mt-2 text-center text-xs leading-5 text-destructive">{analysisError}</p>
            ) : null}
            <p className="mt-2 text-center text-xs text-muted-foreground">Press ⌘ + Enter to analyze</p>
          </Panel>

          <Panel className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Security pipeline</p>
            <div className="mt-4 flex items-start justify-between gap-1">
              {[
                ["Prompt", "Received"],
                ["Threat", "Detection"],
                ["Policy", "Evaluation"],
                ["Security", "Decision"],
              ].map(([a, b], i) => (
                <div key={a} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-foreground" aria-hidden="true" />
                    <span className="text-center text-xs font-medium leading-4 text-muted-foreground">
                      {a}
                      <br />
                      {b}
                    </span>
                  </div>
                  {i < 3 ? <span className="mx-1 h-px flex-1 bg-border" aria-hidden="true" /> : null}
                </div>
              ))}
            </div>
          </Panel>

          {tokenAnalysis && (
            <Panel className="p-4 border-primary/20 bg-card">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Lexical Token & Stem Analysis
                </p>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {tokenAnalysis.wordCount} words · {tokenAnalysis.tokenCount} tokens
                </span>
              </div>
              {tokenAnalysis.flaggedTokens && tokenAnalysis.flaggedTokens.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Flagged Adversarial Roots ({tokenAnalysis.flaggedTokens.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {tokenAnalysis.flaggedTokens.map((f: any, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 font-mono"
                        title={f.reason}
                      >
                        <span className="font-semibold">{f.token}</span>
                        <span className="opacity-70 text-[10px]">[{f.stem}]</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  All {tokenAnalysis.wordCount} words tokenized, stemmed, and verified safe.
                </div>
              )}
              {tokenAnalysis.tokens && tokenAnalysis.tokens.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/60">
                  <p className="text-[11px] text-muted-foreground mb-1.5">Morphological stems evaluated:</p>
                  <div className="flex flex-wrap gap-1">
                    {tokenAnalysis.tokens.slice(0, 16).map((tok: string, idx: number) => {
                      const isFlagged = tokenAnalysis.flaggedTokens?.some((f: any) => f.token === tok);
                      const stem = tokenAnalysis.stemmedTokens?.[idx] ?? tok;
                      return (
                        <span
                          key={idx}
                          className={
                            isFlagged
                              ? "text-[10px] px-1.5 py-0.5 rounded font-mono border bg-destructive/20 text-destructive border-destructive/40 font-semibold"
                              : "text-[10px] px-1.5 py-0.5 rounded font-mono border bg-surface-subtle text-foreground/80 border-border"
                          }
                          title={`Root: ${stem}`}
                        >
                          {tok}
                        </span>
                      );
                    })}
                    {tokenAnalysis.tokens.length > 16 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{tokenAnalysis.tokens.length - 16} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Panel>
          )}

          <Panel className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">Security decision</p>
              <ToneBadge decision={result.decision} />
            </div>
            <div className="mt-4 space-y-2">
              {steps.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-subtle px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">0{idx + 1}</span>
                    {s.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.result ?? "—"}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[13px] leading-6 text-muted-foreground">{result.reasoning}</p>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">Sanitized prompt</p>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-dashed border-border bg-surface-subtle px-3 py-3 font-mono text-xs leading-6 text-foreground">
              {sanitizedText}
            </p>
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Security overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">Overview of detected threats, risk trends, and security decisions.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["7 days", "4 weeks", "30 days"] as const).map((label) => {
                const key = label === "7 days" ? "7d" : label === "4 weeks" ? "4w" : "30d"
                const active = period === key
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPeriod(key as never)}
                    className={
                      active
                        ? "rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background"
                        : "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    }
                  >
                    {label}
                  </button>
                )
              })}
              <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground" aria-live="polite">
                {dataLoading ? "Loading…" : `${stats.totalAnalyzed} analyzed`}
              </span>
            </div>
          </div>

          {dataError ? (
            <Panel className="border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">Could not load dashboard data</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{dataError}. Analysis results still work; saved events will appear once Firestore is reachable.</p>
            </Panel>
          ) : null}

          {hasNoData ? (
            <Panel className="p-6 text-center">
              <p className="text-sm font-semibold text-foreground">No security activity yet</p>
              <p className="mx-auto mt-1 max-w-[42ch] text-sm leading-6 text-muted-foreground">Analyze your first prompt to start building your security overview.</p>
            </Panel>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Panel className="p-4 hover-lift">
              <p className="text-xs font-medium text-muted-foreground">Threats detected</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{dataLoading ? "—" : stats.threatsDetected}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 tabular-nums">
                  <TrendingUp className="h-3 w-3" /> {dataLoading ? "—" : (threatsDelta ?? "—")}
                </span>
              </div>
              <div className="mt-3 flex justify-end">
                <MiniSpark color="var(--severity-critical)" />
              </div>
            </Panel>
            <Panel className="p-4 hover-lift">
              <p className="text-xs font-medium text-muted-foreground">Average risk score</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                  {dataLoading ? "—" : stats.avgRiskScore} <span className="text-xs font-normal text-muted-foreground">/ 100</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 tabular-nums">
                  <TrendingUp className="h-3 w-3" /> {dataLoading ? "—" : (riskDelta ?? "—")}
                </span>
              </div>
              <div className="mt-3 flex justify-end">
                <MiniSpark color="var(--severity-high)" />
              </div>
            </Panel>
            <Panel className="p-4 hover-lift">
              <p className="text-xs font-medium text-muted-foreground">Decision trend</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{dataLoading ? "—" : decisionTrendLabel}</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="mt-3 flex justify-end">
                <MiniSpark color="var(--severity-medium)" />
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Threats over time</h3>
                  <p className="text-xs text-muted-foreground">Detected and blocked</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {periodLabel} <ChevronDown className="h-3 w-3" />
                </span>
              </div>
              <div className="mt-4 h-[180px]">
                {dataLoading ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading activity…</div>
                ) : threatsOverTime.every((p) => p.detected === 0 && p.blocked === 0) ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-xs leading-5 text-muted-foreground">No threats in this period. Analyze a prompt to see activity here.</div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={threatsOverTime} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}
                      labelStyle={{ color: "var(--foreground-primary)", fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="detected" name="Detected" stroke="var(--severity-critical)" fill="var(--severity-critical-bg)" strokeWidth={1.6} />
                    <Area type="monotone" dataKey="blocked" name="Blocked" stroke="var(--severity-medium)" fill="var(--severity-medium-bg)" strokeWidth={1.6} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Decisions</h3>
                  <p className="text-xs text-muted-foreground">Interventions by outcome</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {periodLabel} <ChevronDown className="h-3 w-3" />
                </span>
              </div>
              <div className="mt-4 h-[180px]">
                {dataLoading ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading decisions…</div>
                ) : stats.totalAnalyzed === 0 ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-xs leading-5 text-muted-foreground">No decisions yet. Your ALLOW / WARN / SANITIZE / BLOCK breakdown will appear here.</div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={decisionsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--foreground-muted)" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Allowed" stackId="a" fill={DECISION_COLORS.Allowed} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Warned" stackId="a" fill={DECISION_COLORS.Warned} />
                    <Bar dataKey="Sanitized" stackId="a" fill={DECISION_COLORS.Sanitized} />
                    <Bar dataKey="Blocked" stackId="a" fill={DECISION_COLORS.Blocked} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <Panel className="p-4">
              <h3 className="text-sm font-semibold text-foreground">Threat categories</h3>
              <p className="text-xs text-muted-foreground">By attack vector</p>
              {dataLoading ? (
                <div className="mt-3 flex h-[160px] items-center justify-center text-xs text-muted-foreground">Loading categories…</div>
              ) : threatCategories.length === 0 ? (
                <div className="mt-3 flex h-[160px] items-center justify-center px-6 text-center text-xs leading-5 text-muted-foreground">No threat categories yet. Categories appear here once threats are detected.</div>
              ) : (
              <div className="mt-3 flex gap-4">
                <div className="relative h-[160px] w-[160px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={threatCategories} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={2} stroke="var(--surface)">
                        {threatCategories.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-semibold leading-none text-foreground">{totalCategoryEvents}</span>
                    <span className="text-xs font-medium text-muted-foreground">Total</span>
                  </span>
                </div>
                <ul className="flex-1 space-y-2 py-1">
                  {threatCategories.map((c) => {
                    const pct = totalCategoryEvents === 0 ? "0.0" : ((c.value / totalCategoryEvents) * 100).toFixed(1)
                    return (
                      <li key={c.name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                          <span className="text-foreground">{c.name}</span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {c.value} <span className="text-muted-foreground">({pct}%)</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
              )}
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Recent events</h3>
                  <p className="text-xs text-muted-foreground">Your latest analyzed prompts</p>
                </div>
                <Link href="/incidents" className="text-xs font-medium text-foreground hover:underline">
                  View all →
                </Link>
              </div>
              {dataLoading ? (
                <div className="mt-3 flex items-center justify-center py-8 text-xs text-muted-foreground">Loading events…</div>
              ) : recentEvents.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-surface-subtle px-3 py-8 text-center">
                  <p className="text-xs font-semibold text-foreground">No security activity yet</p>
                  <p className="mx-auto mt-1 max-w-[36ch] text-xs leading-5 text-muted-foreground">Analyze your first prompt to start building your security overview.</p>
                </div>
              ) : (
              <ul className="mt-3 space-y-2.5">
                {recentEvents.map((ev) => {
                  const promptDisplay = ev.prompt || ev.promptSnippet
                  return (
                    <li key={ev.id} className="group rounded-xl border border-border bg-surface-subtle p-3 transition-colors hover:border-border/80 hover:bg-surface">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">{ev.threatCategory ?? "No threat"}</span>
                          <span className="text-[11px] text-muted-foreground">· Risk {ev.riskScore}/100</span>
                        </div>
                        <StatusBadge tone={(ev.decision === "BLOCK" ? "block" : ev.decision === "WARN" ? "warn" : ev.decision === "SANITIZE" ? "sanitize" : "allow") as never} label={ev.decision} className="px-2 py-0.5 text-[10px]" />
                      </div>

                      {promptDisplay ? (
                        <div className="mt-2 rounded-lg bg-surface/80 p-2 border border-border/60">
                          <p className="font-mono text-[11px] leading-relaxed text-foreground/90 line-clamp-2 select-all">
                            &ldquo;{promptDisplay}&rdquo;
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{ev.promptLength} chars</p>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{formatRelativeTime(ev.timestamp)}</span>
                        {promptDisplay && (
                          <button
                            type="button"
                            onClick={() => {
                              setPrompt(promptDisplay)
                              setActiveChip("")
                              window.scrollTo({ top: 0, behavior: "smooth" })
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:underline"
                            title="Load prompt into analyzer"
                          >
                            Analyze again ↗
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
