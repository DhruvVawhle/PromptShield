"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { cn } from "@/lib/utils";

// ── ChartCard ────────────────────────────────────────────────────────────────

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        "corner-shape-[squircle]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

// ── KpiCard ──────────────────────────────────────────────────────────────────

export function KpiCard({
  label,
  value,
  delta,
  good,
  sparkline,
  className,
}: {
  label: string;
  value: string | number;
  delta?: string;
  good?: "up" | "down";
  sparkline?: number[];
  className?: string;
}) {
  const deltaPositive =
    delta !== undefined ? delta.trim().startsWith("+") || delta.trim().startsWith("↑") : undefined;
  const isGood =
    deltaPositive !== undefined && good !== undefined
      ? (deltaPositive && good === "up") || (!deltaPositive && good === "down")
      : undefined;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm corner-shape-[squircle]",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums" data-kpi-value>
          {value}
        </p>
        {delta ? (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              isGood === true
                ? "text-emerald-600"
                : isGood === false
                  ? "text-red-600"
                  : "text-muted-foreground"
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
      {sparkline && sparkline.length > 1 ? (
        <div className="mt-3 h-[36px] w-full" data-sparkline-wrap>
          <Sparkline data={sparkline} />
        </div>
      ) : null}

      {/* Hidden data table for a11y */}
      <table className="sr-only" aria-label={`${label} sparkline data`}>
        <tbody>
          <tr>
            {sparkline?.map((v, i) => (
              <td key={i}>{v}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────

export function Sparkline({
  data,
  color = "var(--chart-1)",
  className,
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className={cn("h-full w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── AreaTrend ────────────────────────────────────────────────────────────────

export function AreaTrend({
  data,
  xKey = "name",
  series,
  height = 180,
}: {
  data: Record<string, unknown>[];
  xKey?: string;
  series: { key: string; label: string; color: string; fillOpacity?: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Area trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              fill={s.color}
              fillOpacity={s.fillOpacity ?? 0.12}
              strokeWidth={1.5}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <table className="sr-only" aria-hidden>
        <thead>
          <tr>
            <th>{xKey}</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{String(row[xKey])}</td>
              {series.map((s) => (
                <td key={s.key}>{String(row[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── BarCompare ───────────────────────────────────────────────────────────────

export function BarCompare({
  data,
  xKey = "name",
  series,
  height = 180,
  stacked,
}: {
  data: Record<string, unknown>[];
  xKey?: string;
  series: { key: string; label: string; color: string }[];
  height?: number;
  stacked?: boolean;
}) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Bar comparison chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              stackId={stacked ? "stack" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only" aria-hidden>
        <thead>
          <tr>
            <th>{xKey}</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{String(row[xKey])}</td>
              {series.map((s) => (
                <td key={s.key}>{String(row[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── DonutBreakdown ───────────────────────────────────────────────────────────

export function DonutBreakdown({
  data,
  height = 180,
  centerLabel,
}: {
  data: { label: string; value: number; color: string }[];
  height?: number;
  centerLabel?: string;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  return (
    <div style={{ height }} className="relative w-full" role="img" aria-label="Donut breakdown chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={72}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-foreground tabular-nums">{total}</span>
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      ) : null}
      <table className="sr-only" aria-hidden>
        <thead>
          <tr>
            <th>Label</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
