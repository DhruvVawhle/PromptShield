"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Search, AlertTriangle, Shield, BarChart3, MessageSquare, Settings, ShieldCheck, History, Activity, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Chat", href: "/chat", icon: MessageSquare },
  { name: "Analyze", href: "/playground", icon: Search },
  { name: "Threats", href: "/incidents", icon: AlertTriangle },
  { name: "Policies", href: "/policies", icon: Shield },
  { name: "Audit Logs", href: "/audit-logs", icon: History },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "System", href: "/system", icon: Activity },
  { name: "Team & Access", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-[56px] items-center px-4">
        <Link href="/" className="text-[13px] font-semibold tracking-[0.08em] text-foreground hover:opacity-80 transition-opacity">
          PROMPTSHIELD
        </Link>
      </div>

      <nav className="flex-1 px-2 py-3">
        <ul className="space-y-1">
          {nav.map((item) => {
            const isActive =
              item.name === "Analyze"
                ? pathname === "/playground" || pathname.startsWith("/playground")
                : pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-[var(--severity-medium-bg)] text-[var(--severity-medium-text)] border border-[var(--severity-medium-border)] shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground border border-transparent hover:translate-x-0.5",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105" aria-hidden="true" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-3 py-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-subtle px-3 py-2.5 shadow-2xs">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold leading-none text-foreground">Security Engineer</span>
            <span className="block mt-1 text-[11px] leading-none text-muted-foreground">AI Security Platform</span>
          </span>
        </div>
      </div>
    </aside>
  )
}
