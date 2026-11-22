"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MessageLoadingProps {
  className?: string;
  label?: string;
}

export function MessageLoading({ className, label }: MessageLoadingProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 py-1 px-0.5", className)}
      role="status"
      aria-label={label || "Thinking & generating response..."}
    >
      <style>{`
        @keyframes promptshield-dot-bounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          30% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
        .ps-dot-bounce-1 {
          animation: promptshield-dot-bounce 1.1s infinite ease-in-out;
        }
        .ps-dot-bounce-2 {
          animation: promptshield-dot-bounce 1.1s infinite ease-in-out 0.18s;
        }
        .ps-dot-bounce-3 {
          animation: promptshield-dot-bounce 1.1s infinite ease-in-out 0.36s;
        }
      `}</style>
      <span className="h-2 w-2 rounded-full bg-primary ps-dot-bounce-1 shadow-xs" />
      <span className="h-2 w-2 rounded-full bg-primary ps-dot-bounce-2 shadow-xs" />
      <span className="h-2 w-2 rounded-full bg-primary ps-dot-bounce-3 shadow-xs" />
      {label && <span className="text-xs text-muted-foreground ml-1.5 animate-pulse font-medium">{label}</span>}
    </span>
  );
}
