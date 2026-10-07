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
        "rounded-xl border border-border bg-surface shadow-[0_1px_0_rgba(15,23,42,0.02)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
