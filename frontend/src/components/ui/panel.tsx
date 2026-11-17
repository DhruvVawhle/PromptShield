import * as React from "react"

import { cn } from "@/lib/utils"

export function Panel({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:border-t-white/10 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_2px_12px_-2px_rgba(0,0,0,0.35)] transition-[border-color,background-color,box-shadow] duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
