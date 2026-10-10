"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Menu, Moon, Search, SunMedium, LogOut, User, Settings, ChevronDown, LayoutDashboard, ChevronRight } from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { initialsFromName } from "@/lib/user-profile"
import { useAuth } from "@/components/auth/AuthProvider"

const appNavItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Analyze", href: "/playground" },
  { label: "Threats", href: "/incidents" },
  { label: "Policies", href: "/policies" },
  { label: "Analytics", href: "/analytics" },
  { label: "AI Chat", href: "/chat" },
  { label: "Settings", href: "/settings" },
]

export function Header() {
  const { setTheme, theme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, profile, profileLoading } = useAuth()
  const { signOut } = useAuth()

  const displayName = profile?.name ?? user?.displayName ?? user?.email?.split("@")[0] ?? "User"
  const email = profile?.email ?? user?.email ?? ""
  const photoURL = profile?.photoURL ?? user?.photoURL ?? null
  const showSkeleton = !user && profileLoading

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="flex h-[56px] items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2 md:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Toggle navigation menu">
                  <Menu className="h-4 w-4" />
                </Button>
              }
            />
            <SheetContent side="left" className="w-[280px] p-0 sm:max-w-none">
              <div className="flex h-[56px] items-center border-b border-border px-4">
                <Link href="/" className="text-[13px] font-semibold tracking-[0.08em] text-foreground hover:opacity-80 transition-opacity">
                  PROMPTSHIELD
                </Link>
              </div>
              <nav className="space-y-1 p-3 text-sm">
                {appNavItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="hidden md:flex items-center">
          <Link href="/" className="text-[13px] font-semibold tracking-[0.08em] text-foreground hover:opacity-80 transition-opacity">
            PROMPTSHIELD
          </Link>
        </div>

        <div className="flex flex-1 justify-center px-2 sm:px-6">
          <div className="relative w-full max-w-[560px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search PromptShield"
              placeholder="Search prompts, incidents, policies..."
              className="h-8 rounded-full border-border bg-surface-subtle pl-9 pr-10 text-[13px] placeholder:text-muted-foreground"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-surface text-[11px] font-medium text-muted-foreground sm:inline-flex">
              /
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Connected
          </span>

          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative h-8 w-8 rounded-full">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Set theme preference" className="h-8 w-8 rounded-full">
                  {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <SunMedium className="h-3.5 w-3.5" />}
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-8 gap-2 rounded-full pl-1 pr-2"
                  aria-label={showSkeleton ? "Loading user" : displayName}
                >
                  {showSkeleton ? (
                    <span className="h-7 w-7 animate-pulse rounded-full bg-muted" aria-hidden="true" />
                  ) : photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                      {initialsFromName(displayName)}
                    </span>
                  )}
                  <span className="hidden max-w-[10ch] truncate text-sm font-medium sm:inline">{showSkeleton ? "…" : displayName}</span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-72 bg-slate-950/90 backdrop-blur-md border-slate-800 shadow-xl">
              <div className="px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-50">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{email || "—"}</p>
              </div>
              <DropdownMenuItem 
                onClick={() => router.push("/dashboard")} 
                className={`px-3 py-2 ${pathname.startsWith("/dashboard") ? "bg-slate-800 text-white" : "text-slate-200 focus:bg-slate-800/50 focus:text-white"}`}
              >
                <LayoutDashboard className="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
                Dashboard
                <DropdownMenuShortcut>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push("/profile")} 
                className={`px-3 py-2 ${pathname.startsWith("/profile") ? "bg-slate-800 text-white" : "text-slate-200 focus:bg-slate-800/50 focus:text-white"}`}
              >
                <User className="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
                Profile
                <DropdownMenuShortcut>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push("/settings")} 
                className={`px-3 py-2 ${pathname.startsWith("/settings") ? "bg-slate-800 text-white" : "text-slate-200 focus:bg-slate-800/50 focus:text-white"}`}
              >
                <Settings className="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
                Settings
                <DropdownMenuShortcut>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="mx-2 bg-slate-800" />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut()
                  router.push("/login")
                  router.refresh()
                }}
                variant="destructive"
                className="px-3 py-2"
              >
                <LogOut className="mr-3 h-4 w-4 shrink-0" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
