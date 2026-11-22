"use client";

import * as React from "react";
import Link from "next/link";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Menu, Moon, Sun, X, LogOut, User, Settings, ChevronDown, LayoutDashboard } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useLenis } from "lenis/react";

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

function ThemeToggle({ onLightSection = false }: { onLightSection?: boolean } = {}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isDark = mounted
    ? resolvedTheme === "dark"
    : typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-[28px] w-[54px] shrink-0 items-center rounded-full border px-[2px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isDark
          ? "border-white/20 bg-white/10 hover:bg-white/15 focus-visible:ring-white focus-visible:ring-offset-black"
          : onLightSection
          ? "border-foreground/20 bg-background/80 hover:bg-background focus-visible:ring-ring focus-visible:ring-offset-background"
          : "border-border bg-muted/80 hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-page"
      )}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-[7px]" aria-hidden="true">
        <Sun className={cn("h-3.5 w-3.5 shrink-0 transition-colors duration-200", isDark ? "text-white/40" : "text-amber-500 fill-amber-500/20")} />
        <Moon className={cn("h-3.5 w-3.5 shrink-0 transition-colors duration-200", isDark ? "text-indigo-400 fill-indigo-400/20" : "text-muted-foreground/60")} />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ease-out",
          isDark ? "translate-x-[24px] bg-white text-black" : "translate-x-0 bg-surface text-foreground shadow-xs"
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
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const firstItemRef = React.useRef<HTMLAnchorElement>(null);

  const brandLabel = brand?.label ?? "PromptShield";
  const brandHref = brand?.href ?? "/";
  const lenis = useLenis();

  const handleBrandClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      setOpen(false);
      const targetHref = brandHref;
      const currentPath = activePath ?? (typeof window !== "undefined" ? window.location.pathname : "");
      const isTargetingHome = targetHref === "/" || targetHref === "#home" || targetHref === "";

      if (isTargetingHome && (currentPath === "/" || currentPath === "")) {
        e.preventDefault();
        const wrappedLenis = lenis as unknown as {
          scrollTo?: (target: number | HTMLElement, options?: { duration?: number; offset?: number }) => void;
        } | null;
        if (wrappedLenis?.scrollTo) {
          wrappedLenis.scrollTo(0, { duration: 1.1 });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        if (typeof window !== "undefined" && window.location.hash) {
          window.history.pushState(null, "", "/");
        }
      } else {
        router.push(targetHref.startsWith("#") ? "/" + targetHref : targetHref);
      }
    },
    [activePath, brandHref, lenis, router]
  );

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

  const { resolvedTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isDark = mounted
    ? resolvedTheme === "dark"
    : typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;
  const indicatorLabel = hovered ?? null;
  const onLightSection = !isDark;

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
          "border-b py-3 transition-colors duration-200",
          onLightSection
            ? "border-border/80 bg-page/92 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.12)] backdrop-blur-xl"
            : "border-white/10 bg-[rgba(8,10,14,0.85)] shadow-[0_12px_30px_-28px_rgba(0,0,0,0.65)] backdrop-blur-xl",
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href={brandHref}
            onClick={handleBrandClick}
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
                      <ProductMenu onLightSection={onLightSection} />
                    </div>
                  );
                }
                if (item.label === "Resources") {
                  return (
                    <div key={item.label} className="relative flex items-center">
                      <ResourcesMenu onLightSection={onLightSection} />
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
                        "flex h-8 items-center gap-2 rounded-full border px-3 py-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                        onLightSection
                          ? "border-border bg-surface text-foreground hover:bg-surface-subtle shadow-xs focus-visible:ring-ring focus-visible:ring-offset-page"
                          : "border-white/20 bg-white/10 hover:bg-white/15 text-white focus-visible:ring-white focus-visible:ring-offset-black"
                      )}
                      aria-label={showSkeleton ? "Loading user" : displayName}
                      aria-expanded={profileMenuOpen}
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    >
                      {showSkeleton ? (
                        <span className="h-6 w-6 animate-pulse rounded-full bg-muted/40" aria-hidden="true" />
                      ) : photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoURL} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border" />
                      ) : (
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
                          onLightSection
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-white/20 text-white border border-white/30"
                        )}>
                          {initialsFromName(displayName)}
                        </span>
                      )}
                      <span className={cn(
                        "hidden max-w-[12ch] truncate text-sm font-medium sm:inline",
                        onLightSection ? "text-foreground" : "text-white"
                      )}>
                        {showSkeleton ? "…" : displayName}
                      </span>
                      <ChevronDown className={cn("hidden h-3.5 w-3.5 sm:block transition-transform duration-200", onLightSection ? "text-muted-foreground" : "text-white/80", profileMenuOpen && "rotate-180")} aria-hidden="true" />
                    </button>
                  }
                />
                <DropdownMenuContent align="end" className="w-64 border border-border bg-popover text-popover-foreground shadow-2xl p-1.5">
                  <div className="px-3.5 py-2.5 mb-1 rounded-lg border-b border-border/80 bg-surface-subtle/80">
                    <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground font-normal">{email || "—"}</p>
                  </div>
                  <DropdownMenuItem onClick={() => { router.push("/dashboard"); setProfileMenuOpen(false); }} className="cursor-pointer text-foreground hover:bg-muted hover:text-foreground">
                    <LayoutDashboard className="mr-2.5 h-4 w-4 shrink-0 text-foreground/75 group-hover/dropdown-menu-item:text-foreground" aria-hidden="true" />
                    <span className="font-medium text-foreground">Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { router.push("/profile"); setProfileMenuOpen(false); }} className="cursor-pointer text-foreground hover:bg-muted hover:text-foreground">
                    <User className="mr-2.5 h-4 w-4 shrink-0 text-foreground/75 group-hover/dropdown-menu-item:text-foreground" aria-hidden="true" />
                    <span className="font-medium text-foreground">Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { router.push("/settings"); setProfileMenuOpen(false); }} className="cursor-pointer text-foreground hover:bg-muted hover:text-foreground">
                    <Settings className="mr-2.5 h-4 w-4 shrink-0 text-foreground/75 group-hover/dropdown-menu-item:text-foreground" aria-hidden="true" />
                    <span className="font-medium text-foreground">Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    variant="destructive"
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                    <span className="font-medium text-destructive">Sign out</span>
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
              className={cn("overflow-hidden border-t md:hidden backdrop-blur-2xl", onLightSection ? "border-border/80 bg-page/98 text-foreground" : "border-white/10 bg-[#080a0e]/95 text-white")}
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
                      <div className="flex items-center gap-3 rounded-xl bg-surface-subtle border border-border px-3 py-2.5">
                        {showSkeleton ? (
                          <span className="h-9 w-9 animate-pulse rounded-full bg-muted" aria-hidden="true" />
                        ) : photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoURL} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 text-[12px] font-semibold">
                            {initialsFromName(displayName)}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">{email || "—"}</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page"
                      >
                        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                        Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page"
                      >
                        <User className="h-4 w-4" aria-hidden="true" />
                        Profile
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