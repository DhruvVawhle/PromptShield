"use client"

import * as React from "react"
import Link from "next/link"
import { Copy, Check, Shield, ChevronDown, TrendingUp, ArrowUpRight } from "lucide-react"
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
import { analyzePrompt, EXAMPLE_PROMPTS, type SecurityDecision } from "@/lib/demo/promptAnalyzer"
import {
  createSecurityEvent,
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

function generatePromptId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

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
  const [result, setResult] = React.useState(() => analyzePrompt(CHIPS[0].prompt))
  const [copied, setCopied] = React.useState(false)
  const [period, setPeriod] = React.useState<"7d" | "4w" | "30d">("7d")
  const [analyzing, setAnalyzing] = React.useState(false)
  const [analysisError, setAnalysisError] = React.useState<string | null>(null)
  const [events, setEvents] = React.useState<SecurityEventWithId[]>([])
  const [prevEvents, setPrevEvents] = React.useState<SecurityEventWithId[]>([])
  const [dataLoading, setDataLoading] = React.useState(true)
  const [dataError, setDataError] = React.useState<string | null>(null)

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- inferred `user` vs `user?.uid` is equivalent; keep deps minimal
  const runAnalyze = React.useCallback(() => {
    if (analyzing) return
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const r = analyzePrompt(prompt)
      setResult(r)
      const uid = user?.uid
      if (uid) {
        void createSecurityEvent(uid, {
          promptId: generatePromptId(),
          riskScore: r.riskScore,
          threatDetected: r.threats.length > 0,
          threatCategory: r.threats[0]?.category ?? null,
          decision: r.decision,
          policy: r.policy?.name ?? null,
          confidence: null,
          promptLength: prompt.length,
          model: null,
          prompt: r.sanitizedPrompt ?? prompt,
          sanitizedPrompt: r.sanitizedPrompt ?? null,
        }).catch((error) => {
          console.error("Failed to persist security event:", error)
          setAnalysisError("Analysis completed, but the event could not be saved. Check Firestore connectivity and security rules.")
        })
      }
    } catch (error) {
      console.error("Failed to analyze prompt:", error)
      setAnalysisError("Analysis failed. Please try again.")
    } finally {
      setAnalyzing(false)
    }
  }, [analyzing, prompt, user?.uid])

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
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Analyze a Prompt</p>
            <p className="mt-1 max-w-[32ch] text-[13px] leading-5 text-muted-foreground">Test a prompt for security risks before it reaches the model.</p>
          </div>

          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Analyze a Prompt</span>
            <span className="text-right">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Risk Score</span>
              <span className="text-[22px] font-bold leading-none tracking-tight text-foreground">
                {result.riskScore} <span className="text-[13px] font-medium text-muted-foreground">/ 100</span>
              </span>
            </span>
          </div>

          <Panel className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">User Prompt</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={onKeyDown}
              rows={3}
              className="mt-2 min-h-[96px] w-full resize-y rounded-xl border border-border bg-surface-subtle px-3 py-3 text-[13px] leading-6 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Summarize this quarterly report in three bullet points."
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
                      ? "rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
                      : "rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
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
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Security Pipeline</p>
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
                    <span className="text-center text-[10px] font-semibold uppercase leading-3 tracking-[0.08em] text-muted-foreground">
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

          <Panel className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Security Decision</p>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sanitized Prompt</p>
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
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-foreground">Security Overview</h2>
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
            <Panel className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Threats Detected</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-2xl font-semibold tracking-tight text-foreground">{dataLoading ? "—" : stats.threatsDetected}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <TrendingUp className="h-3 w-3" /> {dataLoading ? "—" : (threatsDelta ?? "—")}
                </span>
              </div>
              <div className="mt-3 flex justify-end">
                <MiniSpark color="var(--severity-critical)" />
              </div>
            </Panel>
            <Panel className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Avg Risk Score</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-2xl font-semibold tracking-tight text-foreground">
                  {dataLoading ? "—" : stats.avgRiskScore} <span className="text-sm font-medium text-muted-foreground">/ 100</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <TrendingUp className="h-3 w-3" /> {dataLoading ? "—" : (riskDelta ?? "—")}
                </span>
              </div>
              <div className="mt-3 flex justify-end">
                <MiniSpark color="var(--severity-high)" />
              </div>
            </Panel>
            <Panel className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Decision Trend</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-[13px] font-medium text-foreground">{dataLoading ? "—" : decisionTrendLabel}</span>
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
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total</span>
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
                {recentEvents.map((ev) => (
                  <li key={ev.id} className="rounded-xl border border-border bg-surface-subtle px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">{ev.threatCategory ?? "No threat"}</span>
                      <StatusBadge tone={(ev.decision === "BLOCK" ? "block" : ev.decision === "WARN" ? "warn" : ev.decision === "SANITIZE" ? "sanitize" : "allow") as never} label={ev.decision} className="px-2 py-0.5 text-[10px]" />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Risk {ev.riskScore}/100 · {ev.promptLength} chars</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">{formatRelativeTime(ev.timestamp)}</p>
                  </li>
                ))}
              </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
