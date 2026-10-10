"use client";

import * as React from "react";
import { Search, RefreshCw, AlertTriangle, ShieldAlert, Ban, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  listSecurityEvents,
  subscribeSecurityEvents,
  getPeriodDateRange,
  formatRelativeTime,
  type SecurityEventWithId,
} from "@/lib/security-events";

function getSeverity(riskScore: number): "Critical" | "High" | "Medium" | "Low" {
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

function getDecisionTone(decision: string): "allow" | "warn" | "sanitize" | "block" {
  const d = decision.toUpperCase();
  if (d === "ALLOW") return "allow";
  if (d === "WARN") return "warn";
  if (d === "SANITIZE") return "sanitize";
  if (d === "BLOCK") return "block";
  return "allow";
}

export function IncidentsClient() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = React.useState<SecurityEventWithId[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [period, setPeriod] = React.useState<"7d" | "30d" | "all">("7d");
  const [severityFilter, setSeverityFilter] = React.useState<string>("All");
  const [decisionFilter, setDecisionFilter] = React.useState<string>("All");
  const [search, setSearch] = React.useState("");

  const [selectedEvent, setSelectedEvent] = React.useState<SecurityEventWithId | null>(null);

  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  React.useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setTimeout(() => {
        setEvents([]);
        setLoading(false);
      }, 0);
      return;
    }

    setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);
    let cancelled = false;

    const { start, end } = period === "all" ? { start: new Date(0), end: new Date() } : getPeriodDateRange(period);

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

  const filteredEvents = React.useMemo(() => {
    return events.filter((ev) => {
      if (severityFilter !== "All" && getSeverity(ev.riskScore) !== severityFilter) return false;
      if (decisionFilter !== "All" && ev.decision !== decisionFilter.toUpperCase()) return false;
      if (search) {
        const s = search.toLowerCase();
        const matchesCategory = ev.threatCategory?.toLowerCase().includes(s);
        const matchesPromptId = ev.promptId.toLowerCase().includes(s);
        const matchesPrompt = ev.prompt?.toLowerCase().includes(s);
        if (!matchesCategory && !matchesPromptId && !matchesPrompt) return false;
      }
      return true;
    });
  }, [events, severityFilter, decisionFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const currentEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  const totalIncidents = events.length;
  const highSeverityCount = events.filter((e) => e.riskScore >= 60).length;
  const blockedCount = events.filter((e) => e.decision === "BLOCK").length;
  const underReviewCount = 0; // Simulated as we don't have explicit incident review status yet.

  const refreshData = () => {
    if (!user?.uid) return;
    setLoading(true);
    const { start, end } = period === "all" ? { start: new Date(0), end: new Date() } : getPeriodDateRange(period);
    listSecurityEvents(user.uid, { startDate: start, endDate: end })
      .then(rows => {
        setEvents(rows);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Incidents</h1>
        <p className="text-sm text-muted-foreground">Investigate detected threats, review security decisions, and track incident outcomes.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-surface-subtle border border-border p-3 rounded-xl">
        <select value={period} onChange={(e) => setPeriod(e.target.value as "7d" | "30d" | "all")} className="bg-surface border border-border text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
        <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }} className="bg-surface border border-border text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select value={decisionFilter} onChange={(e) => { setDecisionFilter(e.target.value); setPage(1); }} className="bg-surface border border-border text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="All">All Decisions</option>
          <option value="Block">Block</option>
          <option value="Sanitize">Sanitize</option>
          <option value="Warn">Warn</option>
          <option value="Allow">Allow</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-surface border border-border text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button onClick={refreshData} className="p-1.5 border border-border bg-surface rounded-md hover:bg-muted text-muted-foreground transition">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Events</span>
          </div>
          <span className="text-2xl font-bold">{loading ? "..." : totalIncidents}</span>
        </Panel>
        <Panel className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">High+ Severity</span>
          </div>
          <span className="text-2xl font-bold">{loading ? "..." : highSeverityCount}</span>
        </Panel>
        <Panel className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-500">
            <Ban className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Blocked</span>
          </div>
          <span className="text-2xl font-bold">{loading ? "..." : blockedCount}</span>
        </Panel>
        <Panel className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-500">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Under Review</span>
          </div>
          <span className="text-2xl font-bold">{loading ? "..." : underReviewCount}</span>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-subtle">
                <th className="px-4 py-3 font-medium text-muted-foreground">Event ID</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Severity</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Decision</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Detected</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-destructive">{error}</td>
                </tr>
              ) : currentEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No security events found matching the criteria.
                  </td>
                </tr>
              ) : (
                currentEvents.map((ev) => {
                  const sev = getSeverity(ev.riskScore);
                  const tone = getSeverityTone(sev);
                  return (
                    <tr key={ev.id} className="border-b border-border hover:bg-surface-subtle/50 transition">
                      <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate">{ev.promptId}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={tone} label={sev} className="px-2 py-0.5 text-[10px]" />
                      </td>
                      <td className="px-4 py-3">{ev.threatCategory || "Uncategorized"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={getDecisionTone(ev.decision)} label={ev.decision} className="px-2 py-0.5 text-[10px]" />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatRelativeTime(ev.timestamp)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setSelectedEvent(ev)} className="text-xs font-medium text-foreground hover:underline">
                          View details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredEvents.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-subtle">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredEvents.length)} of {filteredEvents.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-1 rounded-md hover:bg-surface border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page === pageCount}
                onClick={() => setPage(page + 1)}
                className="p-1 rounded-md hover:bg-surface border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Panel>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-md bg-background border-l border-border h-full shadow-2xl p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Event Details</h2>
              <button onClick={() => setSelectedEvent(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Event ID</p>
                <p className="font-mono text-sm">{selectedEvent.promptId}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Severity</p>
                  <StatusBadge tone={getSeverityTone(getSeverity(selectedEvent.riskScore))} label={getSeverity(selectedEvent.riskScore)} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Decision</p>
                  <StatusBadge tone={getDecisionTone(selectedEvent.decision)} label={selectedEvent.decision} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Risk Score</p>
                  <p className="text-sm">{selectedEvent.riskScore} / 100</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Category</p>
                  <p className="text-sm">{selectedEvent.threatCategory || "Uncategorized"}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Detected</p>
                <p className="text-sm">{selectedEvent.timestamp instanceof Date ? selectedEvent.timestamp.toLocaleString() : selectedEvent.timestamp.toDate().toLocaleString()}</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Original Prompt (Sanitized preview)</p>
                <div className="bg-surface-subtle border border-border p-3 rounded-md">
                  <p className="text-sm font-mono whitespace-pre-wrap break-words">{selectedEvent.prompt || "No prompt content available"}</p>
                </div>
              </div>

              {selectedEvent.sanitizedPrompt && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sanitized Output</p>
                  <div className="bg-surface-subtle border border-border p-3 rounded-md border-dashed">
                    <p className="text-sm font-mono whitespace-pre-wrap break-words text-muted-foreground">{selectedEvent.sanitizedPrompt}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
