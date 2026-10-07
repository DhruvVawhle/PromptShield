"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const SPOTLIGHT_SIZE = "280px"

type SpotlightCardIcon = React.ComponentType<{ className?: string }>

export type SpotlightCardProps = Omit<React.ComponentProps<"div">, "title"> & {
  icon?: SpotlightCardIcon
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  status?: React.ReactNode
  href?: string
  actionLabel?: string
  spotlightColor?: string
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function SpotlightCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  status,
  href,
  actionLabel,
  spotlightColor,
  className,
  ...props
}: SpotlightCardProps) {
  function handlePointerEnter(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return
    event.currentTarget.style.setProperty("--spotlight-opacity", "1")
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - bounds.left}px`)
    event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - bounds.top}px`)
  }

  function handlePointerLeave(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--spotlight-opacity", "0")
  }

  return (
    <div
      data-slot="spotlight-card"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "group/spotlight-card relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out motion-reduce:transition-none",
        "hover:-translate-y-0.5 hover:border-ring hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] motion-reduce:hover:translate-y-0",
        "focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,_var(--ring)_30%,_transparent)] focus-within:ring-0",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[var(--spotlight-opacity,0)] transition-opacity duration-500 ease-out"
        style={
          {
            background: `radial-gradient(${SPOTLIGHT_SIZE} circle at var(--spotlight-x,50%) var(--spotlight-y,50%), color-mix(in srgb, var(--spotlight-color, var(--status-allow)) 18%, transparent), transparent 70%)`,
            ...(spotlightColor ? { "--spotlight-color": spotlightColor } : null),
          } as React.CSSProperties
        }
      />

      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-subtle text-foreground transition-colors duration-300 ease-out group-hover/spotlight-card:border-ring motion-reduce:transition-none">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        {eyebrow ? (
          <span className="text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </span>
        ) : null}
      </div>

      <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground">{title}</h3>

      {description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p> : null}

      {status || href ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
          {status}
          {href ? (
            <ArrowRight
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out group-hover/spotlight-card:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/spotlight-card:translate-x-0"
              aria-hidden="true"
            />
          ) : null}
        </div>
      ) : null}

      {href ? (
        <Link href={href} className="absolute inset-0 rounded-2xl focus-visible:outline-none">
          <span className="sr-only">{actionLabel ?? title}</span>
        </Link>
      ) : null}
    </div>
  )
}