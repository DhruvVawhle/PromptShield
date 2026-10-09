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
import { cn } from "@/lib/utils";

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
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl">
      {/* Page Heading */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          PROMPTSHIELD <ChevronRight className="h-3 w-3" /> Incidents
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Incidents</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Investigate detected threats, review security decisions, and track incident outcomes.
            </p>
          </div>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">Total Events</span>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : totalIncidents}</span>
        </Panel>
        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-destructive">
            <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">High+ Severity</span>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : highSeverityCount}</span>
        </Panel>
        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-amber-500">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <Ban className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">Blocked</span>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : blockedCount}</span>
        </Panel>
        <Panel className="p-5 flex flex-col gap-3 border-primary/10 shadow-sm bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-blue-500">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">Under Review</span>
          </div>
          <span className="text-3xl font-bold text-foreground">{loading ? "..." : underReviewCount}</span>
        </Panel>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-1">
        <select value={period} onChange={(e) => { setPeriod(e.target.value as "7d" | "30d" | "all"); setPage(1); }} className="h-9 bg-card border border-border text-sm rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-sm">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
        <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }} className="h-9 bg-card border border-border text-sm rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-sm">
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select value={decisionFilter} onChange={(e) => { setDecisionFilter(e.target.value); setPage(1); }} className="h-9 bg-card border border-border text-sm rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-sm">
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
            className="w-full h-9 bg-card border border-border text-sm rounded-md pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-ring shadow-sm"
          />
        </div>
        <button onClick={refreshData} className="h-9 w-9 flex items-center justify-center border border-border bg-card rounded-md hover:bg-muted text-muted-foreground transition shadow-sm">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Events Table */}
      <Panel className="overflow-hidden border-primary/10 shadow-sm bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-4 font-medium text-muted-foreground whitespace-nowrap">Event ID</th>
                <th className="px-5 py-4 font-medium text-muted-foreground whitespace-nowrap">Severity</th>
                <th className="px-5 py-4 font-medium text-muted-foreground whitespace-nowrap">Category</th>
                <th className="px-5 py-4 font-medium text-muted-foreground whitespace-nowrap">Decision</th>
                <th className="px-5 py-4 font-medium text-muted-foreground whitespace-nowrap">Detected</th>
                <th className="px-5 py-4 font-medium text-muted-foreground text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Loading events...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-destructive">{error}</td>
                </tr>
              ) : currentEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No security events found matching the criteria.
                  </td>
                </tr>
              ) : (
                currentEvents.map((ev) => {
                  const sev = getSeverity(ev.riskScore);
                  const tone = getSeverityTone(sev);
                  const isHighSeverity = sev === "Critical" || sev === "High";
                  return (
                    <tr 
                      key={ev.id} 
                      className={cn(
                        "border-b border-border hover:bg-muted/30 transition group",
                        isHighSeverity && "bg-destructive/[0.02]"
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {isHighSeverity && <div className="w-1 h-4 rounded-full bg-destructive/60" />}
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px] lg:max-w-[180px]" title={ev.promptId}>
                            {ev.promptId}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={tone} label={sev} className="px-2 py-0.5 text-[11px] font-medium" />
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground">{ev.threatCategory || "Uncategorized"}</td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={getDecisionTone(ev.decision)} label={ev.decision} className="px-2 py-0.5 text-[11px] font-medium" />
                      </td>
                      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{formatRelativeTime(ev.timestamp)}</td>
                      <td className="px-5 py-4 text-right">
                        <button 
                          onClick={() => setSelectedEvent(ev)} 
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                        >
                          Review <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredEvents.length > 0 && pageCount > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, filteredEvents.length)}</span> of <span className="font-medium text-foreground">{filteredEvents.length}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-md bg-card border border-border hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                Page {page}
              </div>
              <button
                disabled={page === pageCount}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-md bg-card border border-border hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Panel>

      {/* Event Details Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-md bg-background border-l border-border h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Event Review</h2>
                <p className="text-xs text-muted-foreground font-mono mt-1">{selectedEvent.promptId}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border border-border">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Severity</p>
                  <StatusBadge tone={getSeverityTone(getSeverity(selectedEvent.riskScore))} label={getSeverity(selectedEvent.riskScore)} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Decision</p>
                  <StatusBadge tone={getDecisionTone(selectedEvent.decision)} label={selectedEvent.decision} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Risk Score</p>
                  <p className="text-sm font-semibold">{selectedEvent.riskScore} / 100</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Category</p>
                  <p className="text-sm font-semibold">{selectedEvent.threatCategory || "Uncategorized"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b border-border pb-2">Analysis Details</h3>
                
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Detected Time</p>
                  <p className="text-sm">{selectedEvent.timestamp instanceof Date ? selectedEvent.timestamp.toLocaleString() : (selectedEvent.timestamp as any).toDate().toLocaleString()}</p>
                </div>
                
                {selectedEvent.policy && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Triggered Policy</p>
                    <p className="text-sm">{selectedEvent.policy}</p>
                  </div>
                )}
                
                {selectedEvent.model && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Target Model</p>
                    <p className="text-sm">{selectedEvent.model}</p>
                  </div>
                )}
                
                {selectedEvent.confidence && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Confidence</p>
                    <p className="text-sm">{(selectedEvent.confidence * 100).toFixed(1)}%</p>
                  </div>
                )}
              </div>

              {(selectedEvent.prompt || selectedEvent.sanitizedPrompt) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b border-border pb-2">Payload Data</h3>
                  
                  {selectedEvent.prompt && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Original Prompt</p>
                      <div className="bg-card border border-border p-3 rounded-md text-sm font-mono whitespace-pre-wrap break-words text-foreground shadow-sm">
                        {selectedEvent.prompt}
                      </div>
                    </div>
                  )}

                  {selectedEvent.sanitizedPrompt && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Sanitized Output</p>
                      <div className="bg-primary/5 border border-primary/20 p-3 rounded-md text-sm font-mono whitespace-pre-wrap break-words text-primary shadow-sm border-dashed">
                        {selectedEvent.sanitizedPrompt}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
