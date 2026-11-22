"use client";

import * as React from "react";
import {
  FileText,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  AlertCircle,
  X,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  fetchAuditLogs,
  verifyAuditLogsIntegrity,
  getAuditActionTone,
  formatAuditActionLabel,
  VALID_AUDIT_ACTIONS,
  type AuditLogItem,
} from "@/lib/audit-logs";
import { cn } from "@/lib/utils";

export function AuditLogsClient() {
  const { user, loading: authLoading } = useAuth();

  const [logs, setLogs] = React.useState<AuditLogItem[]>([]);
  const [verifying, setVerifying] = React.useState(false);
  const [verifyResult, setVerifyResult] = React.useState<{
    verified: boolean;
    totalRecords: number;
    validCount: number;
    details?: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = React.useState<string>("ALL");
  const [search, setSearch] = React.useState<string>("");

  // Pagination cursors
  const [cursorHistory, setCursorHistory] = React.useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = React.useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);

  // Selected Log for Inspection
  const [selectedLog, setSelectedLog] = React.useState<AuditLogItem | null>(null);

  const loadLogs = React.useCallback(
    async (cursor?: string) => {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetchAuditLogs({
          action: actionFilter !== "ALL" ? actionFilter : undefined,
          cursor,
          limit: 20,
        });

        setLogs(response.logs);
        setHasMore(response.pagination.hasMore);
        setNextCursor(response.pagination.nextCursor);
      } catch (err: any) {
        setError(err.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    },
    [user, actionFilter]
  );

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      queueMicrotask(() => {
        setLogs([]);
        setLoading(false);
      });
      return;
    }

    queueMicrotask(() => {
      setCursorHistory([]);
      setCurrentCursor(undefined);
      loadLogs(undefined);
    });
  }, [authLoading, user, actionFilter, loadLogs]);

  const handleVerifyIntegrity = async () => {
    try {
      setVerifying(true);
      const res = await verifyAuditLogsIntegrity();
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyResult({
        verified: false,
        totalRecords: logs.length,
        validCount: 0,
        details: err.message || "Cryptographic integrity verification failed",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, currentCursor || ""]);
    setCurrentCursor(nextCursor);
    loadLogs(nextCursor);
  };

  const handlePrevPage = () => {
    if (cursorHistory.length === 0) return;
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    setCurrentCursor(prevCursor || undefined);
    loadLogs(prevCursor || undefined);
  };

  const filteredLogs = React.useMemo(() => {
    if (!search.trim()) return logs;
    const query = search.toLowerCase();
    return logs.filter(
      (log) =>
        log.id.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        JSON.stringify(log.details).toLowerCase().includes(query)
    );
  }, [logs, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Audit Logs
            </h1>
            <StatusBadge label="Immutable Log" tone="allow" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cryptographically recorded log of system events, operator actions, and guardrail decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyIntegrity}
            disabled={verifying}
            className="gap-2"
          >
            <ShieldCheck className={cn("h-4 w-4 text-emerald-600 dark:text-emerald-400", verifying && "animate-spin")} />
            Verify HMAC Chain
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLogs(currentCursor)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {verifyResult ? (
        <Panel
          className={cn(
            "p-4 border",
            verifyResult.verified ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {verifyResult.verified ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  {verifyResult.verified ? "Cryptographic Chain Verified" : "Integrity Anomaly Detected"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{verifyResult.details}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVerifyResult(null)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Panel>
      ) : null}

      {/* Filter Toolbar */}
      <Panel className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter current view by ID or keyword..."
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Action Select */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Actions</option>
                {VALID_AUDIT_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {formatAuditActionLabel(action)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Panel>

      {/* Error Banner */}
      {error && (
        <Panel className="border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <div className="flex-1 font-medium">{error}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLogs(currentCursor)}
              className="border-red-500/30 text-red-300 hover:bg-red-500/20"
            >
              Retry
            </Button>
          </div>
        </Panel>
      )}

      {/* Logs Table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Summary & Target</th>
                <th className="px-4 py-3 font-semibold">Log ID</th>
                <th className="px-4 py-3 font-semibold text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
                    Loading audit records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const tone = getAuditActionTone(log.action);
                  const label = formatAuditActionLabel(log.action);

                  return (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge label={label} tone={tone} />
                          {log.recordHash ? (
                            <span title="HMAC-SHA256 signature intact" className="text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs font-mono text-foreground/90 max-w-md truncate">
                        {log.details.reason
                          ? log.details.reason
                          : log.details.name
                          ? `Policy: ${log.details.name}`
                          : log.details.policyId
                          ? `Policy ID: ${log.details.policyId}`
                          : log.details.decision
                          ? `Decision: ${log.details.decision}`
                          : JSON.stringify(log.details)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-muted-foreground">
                        {log.id.substring(0, 12)}...
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-8 w-8 p-0"
                          title="Inspect Details"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground">{filteredLogs.length}</span> records
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={cursorHistory.length === 0 || loading}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasMore || loading}
              className="gap-1 text-xs"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Panel>

      {/* Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Panel className="w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden bg-background border-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  Audit Record Details
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-1">Action</span>
                  <StatusBadge
                    label={formatAuditActionLabel(selectedLog.action)}
                    tone={getAuditActionTone(selectedLog.action)}
                  />
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Recorded At</span>
                  <span className="font-mono text-foreground">
                    {new Date(selectedLog.timestamp).toISOString()}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1">Document ID</span>
                  <span className="font-mono text-foreground text-xs break-all">
                    {selectedLog.id}
                  </span>
                </div>

                {selectedLog.recordHash ? (
                  <div className="col-span-2 space-y-2 rounded-lg border border-border/80 bg-background/50 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Cryptographic HMAC-SHA256 Integrity Record
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Record SHA-256: </span>
                        <code className="font-mono text-foreground break-all">{selectedLog.recordHash}</code>
                      </div>
                      {selectedLog.previousHash ? (
                        <div>
                          <span className="text-muted-foreground">Previous Hash: </span>
                          <code className="font-mono text-foreground break-all">{selectedLog.previousHash}</code>
                        </div>
                      ) : null}
                      {selectedLog.signature ? (
                        <div>
                          <span className="text-muted-foreground">Signature: </span>
                          <code className="font-mono text-foreground break-all">{selectedLog.signature.slice(0, 32)}...</code>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <span className="text-muted-foreground text-xs block mb-1">Payload Metadata</span>
                <pre className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground/90 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="border-t border-border px-6 py-3 bg-muted/20 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
