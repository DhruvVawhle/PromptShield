"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Search, AlertTriangle, Shield, BarChart3, MessageSquare, Settings, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analyze", href: "/playground", icon: Search, activeMatch: "/playground" },
  { name: "Threats", href: "/incidents", icon: AlertTriangle },
  { name: "Policies", href: "/policies", icon: Shield },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "AI Chat", href: "/chat", icon: MessageSquare },
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-[var(--severity-medium-bg)] text-[var(--severity-medium-text)] border border-[var(--severity-medium-border)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-3 py-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-subtle px-3 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold leading-none text-foreground">Security Engineer</span>
            <span className="block text-[11px] leading-none text-muted-foreground">AI Security Platform</span>
          </span>
        </div>
      </div>
    </aside>
  )
}
