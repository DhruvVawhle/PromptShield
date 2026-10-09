"use client";

import * as React from "react";
import { 
  Activity, ShieldAlert, BarChart3, ShieldBan, RefreshCw, ChevronRight, 
  Search, Info 
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  subscribeSecurityEvents,
  getPeriodDateRange,
  computeDashboardStats,
  buildThreatsOverTime,
  buildDecisionsOverTime,
  buildThreatCategories,
  formatRelativeTime,
  type SecurityEventWithId,
} from "@/lib/security-events";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DECISION_COLORS = {
  ALLOW: "var(--severity-allow, #10b981)",
  WARN: "var(--severity-warn, #f59e0b)",
  SANITIZE: "var(--severity-info, #3b82f6)",
  BLOCK: "var(--severity-critical, #ef4444)",
};

function getDecisionTone(decision: string): "allow" | "warn" | "sanitize" | "block" {
  switch (decision.toUpperCase()) {
    case "ALLOW": return "allow";
    case "WARN": return "warn";
    case "SANITIZE": return "sanitize";
    case "BLOCK": return "block";
    default: return "allow";
  }
}

function getSeverity(riskScore: number): string {
  if (riskScore >= 80) return "Critical";
  if (riskScore >= 60) return "High";
  if (riskScore >= 40) return "Medium";
  return "Low";
}

function getSeverityTone(severity: string): "critical" | "high" | "medium" | "low" | "info" {
  switch (severity) {
    case "Critical": return "critical";
    case "High": return "high";
    case "Medium": return "medium";
    case "Low": return "info";
    default: return "low";
  }
}

export function AnalyticsClient() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = React.useState<SecurityEventWithId[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [period, setPeriod] = React.useState<"7d" | "30d">("7d");

  React.useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    const { start, end } = getPeriodDateRange(period);

    const unsubscribe = subscribeSecurityEvents(
      user.uid,
      { startDate: start, endDate: end },
      (rows) => {
        if (!cancelled) {
          setEvents(rows);
          setLoading(false);
        }
      },
      (err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authLoading, user?.uid, period]);

  const handleRefresh = () => {
    // Just toggle loading to give visual feedback, subscribeSecurityEvents handles live updates
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const stats = React.useMemo(() => computeDashboardStats(events), [events]);
  const threatsOverTime = React.useMemo(() => buildThreatsOverTime(events, period), [events, period]);
  const decisionsOverTime = React.useMemo(() => buildDecisionsOverTime(events, period), [events, period]);
  const threatCategories = React.useMemo(() => buildThreatCategories(events), [events]);
  
  const blockRate = stats.totalAnalyzed > 0 
    ? Math.round((stats.blocked / stats.totalAnalyzed) * 100) 
    : 0;

  const decisionData = [
    { name: "ALLOW", value: stats.allowed, color: DECISION_COLORS.ALLOW },
    { name: "WARN", value: stats.warned, color: DECISION_COLORS.WARN },
    { name: "SANITIZE", value: stats.sanitized, color: DECISION_COLORS.SANITIZE },
    { name: "BLOCK", value: stats.blocked, color: DECISION_COLORS.BLOCK },
  ].filter(d => d.value > 0);

  const highCriticalEvents = events.filter(e => e.riskScore >= 60).length;

  if (!authLoading && !loading && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="bg-primary/5 p-4 rounded-full mb-6">
          <BarChart3 className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">No analytics data yet</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Analyze your first prompt to start tracking security activity and decisions across your AI workflows.
        </p>
        <Link 
          href="/analyze" 
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-6 font-medium hover:bg-primary/90 transition-colors"
        >
          Analyze a prompt
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px]">
      {/* Page Heading & Controls */}
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          PROMPTSHIELD <ChevronRight className="h-3 w-3" /> Analytics
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Security Analytics</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Understand prompt activity, security threats, policy effectiveness, and security decisions across your AI workflows.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value as any)} 
              className="h-10 bg-card border border-border text-sm rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-colors"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <button 
              onClick={handleRefresh} 
              disabled={loading}
              className="h-10 w-10 flex items-center justify-center border border-border bg-card rounded-md hover:bg-muted text-muted-foreground transition shadow-sm disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          Error loading analytics: {error}
        </div>
      )}

      {/* Summary metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider">Total Analyzed</span>
            </div>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : stats.totalAnalyzed.toLocaleString()}</span>
        </Panel>

        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider">Threats Detected</span>
            </div>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : stats.threatsDetected.toLocaleString()}</span>
        </Panel>

        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                <BarChart3 className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider">Avg Risk Score</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{loading ? "..." : stats.avgRiskScore}</span>
            <span className="text-sm text-muted-foreground font-medium">/ 100</span>
          </div>
        </Panel>

        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
                <ShieldBan className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider">Block Rate</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">{loading ? "..." : blockRate}</span>
            <span className="text-xl font-bold text-muted-foreground">%</span>
          </div>
        </Panel>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2 p-6 flex flex-col gap-6 shadow-sm border-primary/10">
          <div>
            <h3 className="text-base font-semibold text-foreground">Security Activity</h3>
            <p className="text-sm text-muted-foreground">Daily prompt analysis and threat detection events.</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={threatsOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "13px" }}
                  itemStyle={{ fontWeight: 500 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                <Line type="monotone" name="Total Prompts" dataKey="detected" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Threats Blocked" dataKey="blocked" stroke="var(--severity-critical)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-6 flex flex-col gap-6 shadow-sm border-primary/10">
          <div>
            <h3 className="text-base font-semibold text-foreground">Decision Distribution</h3>
            <p className="text-sm text-muted-foreground">Enforcement outcomes for analyzed prompts.</p>
          </div>
          <div className="flex-1 min-h-[250px] relative">
            {decisionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionData}
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {decisionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                No decisions yet
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel className="p-6 flex flex-col gap-6 shadow-sm border-primary/10">
          <div>
            <h3 className="text-base font-semibold text-foreground">Threat Categories</h3>
            <p className="text-sm text-muted-foreground">Most frequent attack types detected.</p>
          </div>
          <div className="flex-1 space-y-4">
            {threatCategories.length > 0 ? (
              threatCategories.slice(0, 5).map(cat => {
                const percent = Math.round((cat.value / stats.threatsDetected) * 100);
                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{cat.name}</span>
                      <span className="text-muted-foreground">{cat.value} ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No threats detected in this period
              </div>
            )}
          </div>
        </Panel>

        <Panel className="p-6 flex flex-col gap-6 shadow-sm border-primary/10">
          <div>
            <h3 className="text-base font-semibold text-foreground">Risk Overview</h3>
            <p className="text-sm text-muted-foreground">High-level risk scoring and exposure.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 border border-border rounded-lg flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">High/Critical Risk Events</span>
              <span className="text-3xl font-bold text-destructive">{loading ? "..." : highCriticalEvents}</span>
              <span className="text-xs text-muted-foreground">Score &ge; 60</span>
            </div>
            <div className="p-4 bg-muted/30 border border-border rounded-lg flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Overall Risk Level</span>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge 
                  tone={getSeverityTone(getSeverity(stats.avgRiskScore))} 
                  label={getSeverity(stats.avgRiskScore)} 
                  className="px-3 py-1 font-semibold text-sm" 
                />
              </div>
              <span className="text-xs text-muted-foreground mt-1">Based on {stats.totalAnalyzed} events</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Recent Security Activity Table */}
      <Panel className="overflow-hidden shadow-sm border-primary/10 flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between bg-card">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Security Events</h3>
            <p className="text-sm text-muted-foreground">Latest detected threats and blocked prompts.</p>
          </div>
          <Link href="/incidents" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            View all events <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto bg-card">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Event ID</th>
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Category</th>
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Risk</th>
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Decision</th>
                <th className="px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Time</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Loading recent events...
                    </div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No events recorded in this period.
                  </td>
                </tr>
              ) : (
                events.slice(0, 5).map((ev) => {
                  const sev = getSeverity(ev.riskScore);
                  const tone = getSeverityTone(sev);
                  return (
                    <tr key={ev.id} className="border-b border-border hover:bg-muted/30 transition">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                        {ev.promptId}
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">
                        {ev.threatCategory || "Uncategorized"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{ev.riskScore}</span>
                          <StatusBadge tone={tone} label={sev} className="px-1.5 py-0 text-[10px] uppercase font-bold" />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={getDecisionTone(ev.decision)} label={ev.decision} className="px-2 py-0.5 text-[11px] font-medium" />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {formatRelativeTime(ev.timestamp)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link 
                          href={`/incidents`} 
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
                          title="View Incident Details"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
