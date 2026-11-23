import * as React from "react"

import { cn } from "@/lib/utils"

export const Panel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(function Panel({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-surface shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:border-t-white/10 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_2px_12px_-2px_rgba(0,0,0,0.35)] transition-[border-color,background-color,box-shadow] duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
Panel.displayName = "Panel";
