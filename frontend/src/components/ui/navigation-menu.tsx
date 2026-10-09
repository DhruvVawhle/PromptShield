"use client";

import * as React from "react";
import Link from "next/link";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Menu, Moon, Sun, X, LogOut, User, Settings, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { FlowButton } from "@/components/ui/flow-button";
import {
  ProductMenu,
  ProductAccordion,
  ResourcesMenu,
  ResourcesAccordion,
} from "@/components/layout/ResourcesMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { initialsFromName } from "@/lib/user-profile";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserProfile } from "@/lib/user-profile";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const MOBILE_MENU_ID = "promptshield-public-mobile-navigation";

export interface NavigationMenuItem {
  label: string;
  href: string;
  /** Element id of the section this item targets, used for the active state. */
  sectionId?: string;
}

export interface NavigationMenuProps {
  items: readonly NavigationMenuItem[];
  brand?: { label: string; href: string };
  className?: string;
  activePath?: string;
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  onSignOut: () => Promise<void>;
}

function ThemeToggle({ onLightSection }: { onLightSection?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    React.useCallback(() => true, []),
    React.useCallback(() => false, []),
  );
  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-[26px] w-[52px] shrink-0 items-center rounded-full border px-[2px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        onLightSection
          ? "border-border bg-muted focus-visible:ring-ring focus-visible:ring-offset-page"
          : "border-white/15 bg-black hover:border-white/25 focus-visible:ring-white/40 focus-visible:ring-offset-black"
      )}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-[6px]" aria-hidden="true">
        <Sun className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isDark ? (onLightSection ? "text-muted-foreground" : "text-white/35") : (onLightSection ? "text-foreground" : "text-white"))} />
        <Moon className={cn("h-3 w-3 shrink-0 transition-colors", isDark ? (onLightSection ? "text-foreground" : "text-white") : (onLightSection ? "text-muted-foreground" : "text-white/35"))} />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ease-out",
          onLightSection ? "bg-background" : "bg-white",
          isDark ? "translate-x-[26px]" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function NavigationMenu({
  items,
  brand,
  className,
  activePath,
  user,
  profile,
  loading,
  onSignOut,
}: NavigationMenuProps) {
  const reducedMotion = useReducedMotion();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [currentSection, setCurrentSection] = React.useState<string | null>(null);
  const [isOnHero, setIsOnHero] = React.useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const firstItemRef = React.useRef<HTMLAnchorElement>(null);

  const brandLabel = brand?.label ?? "PromptShield";
  const brandHref = brand?.href ?? "#home";

  const isAuthenticated = !loading && !!user;
  const displayName = profile?.name ?? user?.displayName ?? user?.email?.split("@")[0] ?? "User";
  const email = profile?.email ?? user?.email ?? "";
  const photoURL = profile?.photoURL ?? user?.photoURL ?? null;
  const showSkeleton = loading && !user;

  const sectionIds = React.useMemo(
    () => items.map((item) => item.sectionId).filter((id): id is string => Boolean(id)),
    [items],
  );

  React.useEffect(() => {
    if (sectionIds.length === 0) return;

    const targets = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setCurrentSection(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sectionIds]);

  React.useEffect(() => {
    const hero = document.getElementById("home");
    if (!hero) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsOnHero(entry ? entry.isIntersecting : true),
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" },
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => firstItemRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const handleChange = () => {
      if (query.matches) setOpen(false);
    };

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const indicatorLabel = hovered ?? null;
  const onLightSection = !isOnHero;

  const handleSignOut = async () => {
    await onSignOut();
    router.push("/");
    router.refresh();
    setProfileMenuOpen(false);
    setOpen(false);
  };

  return (
    <header className={cn("fixed inset-x-0 top-0 z-[60]", className)}>
      <div
        className={cn(
          "border-b py-3 transition-colors duration-300",
          onLightSection
            ? "border-border/70 bg-page/90 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl"
            : "border-white/10 bg-[rgba(8,10,14,0.72)] shadow-[0_12px_30px_-28px_rgba(0,0,0,0.65)] backdrop-blur-xl",
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href={brandHref}
            aria-label={`${brandLabel} home`}
            className={cn(
              "group flex shrink-0 items-center rounded-lg text-[15px] font-semibold uppercase tracking-[-0.055em] transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              onLightSection
                ? "text-foreground focus-visible:ring-ring focus-visible:ring-offset-page"
                : "text-white focus-visible:ring-white focus-visible:ring-offset-black",
            )}
            style={{ fontWeight: 600 }}
          >
            PROMPTSHIELD
          </Link>

          <LayoutGroup id="promptshield-public-nav">
            <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
              {items.map((item) => {
                if (item.label === "Product") {
                  return (
                    <div key={item.label} className="relative flex items-center">
                      <ProductMenu />
                    </div>
                  );
                }
                if (item.label === "Resources") {
                  return (
                    <div key={item.label} className="relative flex items-center">
                      <ResourcesMenu />
                    </div>
                  );
                }
                const routePath: string = activePath ?? "";
                const isRouteActive = routePath.length > 0 && (
                  routePath === item.href ||
                  (item.href !== "/" && item.href !== "/#resources" && routePath.startsWith(item.href))
                );
                const isActive = isRouteActive || (Boolean(item.sectionId) && item.sectionId === currentSection);
                const showsIndicator = indicatorLabel === item.label || (!indicatorLabel && isActive);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={isActive ? "true" : undefined}
                    onMouseEnter={() => setHovered(item.label)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(item.label)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      "relative rounded-md px-3 py-2 text-[14px] font-medium leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      onLightSection
                        ? "focus-visible:ring-ring focus-visible:ring-offset-page"
                        : "focus-visible:ring-white focus-visible:ring-offset-black",
                      isActive
                        ? onLightSection
                          ? "text-foreground"
                          : "text-white"
                        : onLightSection
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-white hover:text-white",
                    )}
                  >
                    {item.label}
                    {showsIndicator ? (
                      <motion.span
                        layoutId="promptshield-nav-indicator"
                        aria-hidden="true"
                        className={cn("absolute inset-x-2 -bottom-0.5 h-px", onLightSection ? "bg-foreground/45" : "bg-white/70")}
                        transition={reducedMotion ? { duration: 0 } : { duration: 0.34, ease: EASE }}
                      />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </LayoutGroup>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <ThemeToggle onLightSection={onLightSection} />
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 items-center gap-2 rounded-full px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                        onLightSection
                          ? "bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-ring focus-visible:ring-offset-page"
                          : "bg-white/5 hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-black"
                      )}
                      aria-label={showSkeleton ? "Loading user" : displayName}
                      aria-expanded={profileMenuOpen}
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    >
                      {showSkeleton ? (
                        <span className="h-7 w-7 animate-pulse rounded-full bg-white/20" aria-hidden="true" />
                      ) : photoURL ? (
                        <img src={photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                          {initialsFromName(displayName)}
                        </span>
                      )}
                      <span className="hidden max-w-[10ch] truncate text-sm font-medium sm:inline">
                        {showSkeleton ? "…" : displayName}
                      </span>
                      <ChevronDown className={cn("hidden h-3.5 w-3.5 sm:block", onLightSection ? "text-muted-foreground" : "text-white/70")} aria-hidden="true" />
                    </button>
                  }
                />
                <DropdownMenuContent align="end" className="w-64 bg-slate-900 border-slate-800">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="truncate text-sm font-medium text-white">{displayName}</p>
                    <p className="truncate text-xs text-slate-400">{email || "—"}</p>
                  </div>
                  <DropdownMenuItem onClick={() => { router.push("/dashboard"); setProfileMenuOpen(false); }}>
                    <User className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { router.push("/settings"); setProfileMenuOpen(false); }}>
                    <Settings className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="border-slate-800" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-400 focus-visible:text-red-400"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    "rounded-lg px-3 py-2 text-[14px] font-medium leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    onLightSection
                      ? "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-page"
                      : "text-white/70 hover:bg-white/10 hover:text-white focus-visible:ring-white focus-visible:ring-offset-black",
                  )}
                >
                  Sign In
                </Link>
                <FlowButton text="Try PromptShield" href="/login" variant={onLightSection ? "dark" : "light"} />
              </>
            )}
          </div>

          <button
            ref={triggerRef}
            type="button"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls={MOBILE_MENU_ID}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:hidden",
              onLightSection
                ? "border-border bg-surface/60 text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-page"
                : "border-white/20 bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white focus-visible:ring-offset-black",
            )}
          >
            {open ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="public-mobile-menu"
              id={MOBILE_MENU_ID}
              initial={reducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
              animate={reducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
              exit={reducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: EASE }}
              className={cn("overflow-hidden border-t md:hidden", onLightSection ? "border-border/60" : "border-white/10")}
            >
              <nav
                aria-label="Mobile"
                className="mx-auto flex w-full max-w-7xl flex-col gap-1 overflow-x-hidden px-4 pb-5 pt-4 sm:px-6"
              >
                {items.map((item, index) => {
                  if (item.label === "Product") {
                    return (
                      <motion.div
                        key={item.label}
                        initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reducedMotion ? { duration: 0 } : { duration: 0.26, ease: EASE, delay: 0.04 * index }}
                      >
                        <ProductAccordion />
                      </motion.div>
                    );
                  }
                  if (item.label === "Resources") {
                    return (
                      <motion.div
                        key={item.label}
                        initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reducedMotion ? { duration: 0 } : { duration: 0.26, ease: EASE, delay: 0.04 * index }}
                      >
                        <ResourcesAccordion />
                      </motion.div>
                    );
                  }
                  const mobileRoutePath: string = activePath ?? "";
                  const isMobileRouteActive = mobileRoutePath.length > 0 && (
                    mobileRoutePath === item.href ||
                    (item.href !== "/" && item.href !== "/#resources" && mobileRoutePath.startsWith(item.href))
                  );
                  const isActive = isMobileRouteActive || (Boolean(item.sectionId) && item.sectionId === currentSection);

                  return (
                    <motion.div
                      key={item.label}
                      initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : { duration: 0.26, ease: EASE, delay: 0.04 * index }
                      }
                    >
                      <Link
                        ref={index === 0 && items[0]?.label !== "Resources" ? firstItemRef : undefined}
                        href={item.href}
                        aria-current={isActive ? "true" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page",
                          isActive
                            ? "border-border bg-muted text-foreground"
                            : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {item.label}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </Link>
                    </motion.div>
                  );
                })}

                <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-muted-foreground">Appearance</span>
                    <ThemeToggle onLightSection={onLightSection} />
                  </div>

                  {isAuthenticated ? (
                    <div className="flex flex-col gap-2 border-t border-border/60 pt-4 mt-3">
                      <div className="flex items-center gap-3 rounded-xl bg-slate-950 px-3 py-2">
                        {showSkeleton ? (
                          <span className="h-9 w-9 animate-pulse rounded-full bg-white/20" aria-hidden="true" />
                        ) : photoURL ? (
                          <img src={photoURL} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-[12px] font-semibold text-background">
                            {initialsFromName(displayName)}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-white">{displayName}</p>
                          <p className="truncate text-xs text-slate-400">{email || "—"}</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page"
                      >
                        <User className="h-4 w-4" aria-hidden="true" />
                        Dashboard
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page"
                      >
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium text-red-400 transition-colors duration-200 hover:bg-red-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page"
                      >
                        Sign In
                      </Link>
                      <FlowButton
                        text="Try PromptShield"
                        href="/login"
                        className="w-full justify-center"
                        onClick={() => setOpen(false)}
                      />
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}