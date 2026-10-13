"use client";

import * as React from "react";
import {
  Activity,
  RefreshCw,
  Database,
  Shield,
  Zap,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Info,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  fetchSystemStatus,
  getHealthTone,
  type SystemStatusResponse,
  type DependencyStatus,
} from "@/lib/system-status";
import { cn } from "@/lib/utils";

function getDependencyIcon(category: DependencyStatus["category"]) {
  switch (category) {
    case "database":
      return Database;
    case "security_engine":
      return Shield;
    case "cache":
      return Zap;
    case "gateway":
      return Server;
    default:
      return Cpu;
  }
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function SystemClient() {
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = React.useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadStatus = React.useCallback(
    async (fresh = false) => {
      if (!user) return;
      if (fresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetchSystemStatus(fresh);
        setData(response);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load system diagnostics.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  React.useEffect(() => {
    if (authLoading || !user) return;
    void loadStatus(false);
  }, [user, authLoading, loadStatus]);

  if (authLoading) {
    return (
      <div className="space-y-6">
        <Panel className="p-8 text-center text-muted-foreground animate-pulse">
          Authenticating session...
        </Panel>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Panel className="p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Shield className="h-10 w-10 text-muted-foreground" />
            <h3 className="text-base font-medium text-foreground">Authentication Required</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Please sign in to view PromptShield runtime diagnostics and platform health.
            </p>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              System Diagnostics
            </h1>
            {data && (
              <StatusBadge
                tone={getHealthTone(data.status)}
                label={data.status.toUpperCase()}
              />
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time health telemetry, infrastructure connectivity, and AI security runtime verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStatus(true)}
            disabled={loading || refreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", (loading || refreshing) && "animate-spin")} />
            {refreshing ? "Checking..." : "Run Diagnostics"}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Panel className="border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-sm font-medium">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStatus(true)}
              className="text-red-400 border-red-500/30 hover:bg-red-500/20"
            >
              Retry
            </Button>
          </div>
        </Panel>
      )}

      {/* Degraded / Outage Banner */}
      {data && data.status !== "healthy" && (
        <Panel
          className={cn(
            "p-4 border",
            data.status === "degraded"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          )}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold">
                {data.status === "degraded"
                  ? "Platform Operational in Degraded Mode"
                  : "Critical Platform Outage Detected"}
              </div>
              <div className="text-xs text-muted-foreground">
                {data.status === "degraded"
                  ? "Core prompt protection and rule enforcement remain active. One or more auxiliary services (rate-limiter or AI gateway) are reporting degraded readiness or fallback configurations."
                  : "Critical core dependencies (database or security rule evaluator) are unreachable. Review infrastructure configuration immediately."}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Overall Status Card */}
        <Panel className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            <span>Platform Status</span>
            <Activity className="h-4 w-4" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {loading && !data ? (
              <div className="h-7 w-24 bg-muted/20 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold tracking-tight capitalize">
                {data?.status ?? "Unknown"}
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {data ? `Last checked: ${new Date(data.timestamp).toLocaleTimeString()}` : "Awaiting check"}
          </div>
        </Panel>

        {/* Process Uptime Card */}
        <Panel className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            <span>Process Uptime</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {loading && !data ? (
              <div className="h-7 w-20 bg-muted/20 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold tracking-tight">
                {data ? formatUptime(data.liveness.uptimeSeconds) : "—"}
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {data ? `Node ${data.liveness.nodeVersion}` : "Runtime"}
          </div>
        </Panel>

        {/* Environment Card */}
        <Panel className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            <span>Environment</span>
            <Cpu className="h-4 w-4" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {loading && !data ? (
              <div className="h-7 w-24 bg-muted/20 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold tracking-tight uppercase">
                {data?.liveness.environment ?? "—"}
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Next.js Production Runtime
          </div>
        </Panel>

        {/* Readiness Count Card */}
        <Panel className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            <span>Dependencies</span>
            <Server className="h-4 w-4" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {loading && !data ? (
              <div className="h-7 w-16 bg-muted/20 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold tracking-tight">
                {data
                  ? `${data.readiness.dependencies.filter((d) => d.status === "healthy").length} / ${data.readiness.dependencies.length}`
                  : "—"}
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Services Online
          </div>
        </Panel>
      </div>

      {/* Dependencies Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Infrastructure & Dependency Readiness
          </h2>
          <span className="text-xs text-muted-foreground">
            Bounded timeouts (≤ 3000ms) with zero side-effect health probes
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {loading && !data ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Panel key={i} className="p-5 space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 bg-muted/20 rounded" />
                  <div className="h-5 w-16 bg-muted/20 rounded" />
                </div>
                <div className="h-4 w-48 bg-muted/20 rounded" />
                <div className="h-3 w-24 bg-muted/20 rounded" />
              </Panel>
            ))
          ) : (
            data?.readiness.dependencies.map((dep) => {
              const Icon = getDependencyIcon(dep.category);
              return (
                <Panel
                  key={dep.name}
                  className="p-5 flex flex-col justify-between transition-colors hover:border-border/80"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg border",
                            dep.status === "healthy" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                            dep.status === "degraded" && "bg-amber-500/10 border-amber-500/20 text-amber-400",
                            dep.status === "unhealthy" && "bg-red-500/10 border-red-500/20 text-red-400"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              {dep.name}
                            </h3>
                            {dep.required && (
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">
                            Category: {dep.category.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <StatusBadge
                        tone={getHealthTone(dep.status)}
                        label={dep.status.toUpperCase()}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {dep.message}
                    </p>

                    {dep.details && Object.keys(dep.details).length > 0 && (
                      <div className="bg-muted/10 border border-border/40 rounded p-2 text-xs text-muted-foreground space-y-1">
                        {Object.entries(dep.details).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center text-[11px]">
                            <span className="font-mono text-muted-foreground/80">{k}:</span>
                            <span className="font-mono text-foreground">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Probe latency:{" "}
                      <span className="font-mono text-foreground font-medium">
                        {dep.latencyMs}ms
                      </span>
                    </span>
                    <span className="text-[11px]">
                      Checked {new Date(dep.lastChecked).toLocaleTimeString()}
                    </span>
                  </div>
                </Panel>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
