import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface FlowButtonProps {
  text?: string;
  href?: string;
  className?: string;
  variant?: "light" | "dark";
}

export function FlowButton({
  text = "Try PromptShield",
  href = "/login",
  className = "",
  variant = "light",
}: FlowButtonProps) {
  const base =
    variant === "dark"
      ? "border-black/20 bg-black text-white hover:border-black"
      : "border-white/40 bg-white/90 text-black hover:border-white";

  return (
    <Link
      href={href}
      className={`group relative inline-flex min-h-11 min-w-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border py-3 pl-4 pr-10 text-xs font-semibold leading-none transition-[border-color,color,transform] duration-[700ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:active:transform-none sm:pl-5 sm:pr-11 sm:text-sm ${base} ${variant === "dark" ? "focus-visible:ring-black focus-visible:ring-offset-page" : "focus-visible:ring-white focus-visible:ring-offset-black"} ${className}`}
    >
      <ArrowRight
        aria-hidden="true"
        className="absolute left-[-25%] z-[9] h-4 w-4 stroke-current transition-[left] duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:left-4 motion-reduce:group-hover:left-[-25%]"
      />

      <span className="relative z-[1] -translate-x-1 whitespace-nowrap transition-transform duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-5 motion-reduce:translate-x-0 motion-reduce:group-hover:translate-x-0">
        {text}
      </span>

      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black opacity-0 transition-[width,height,opacity] duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:h-[220px] group-hover:w-[220px] group-hover:opacity-100 motion-reduce:group-hover:h-4 motion-reduce:group-hover:w-4 motion-reduce:group-hover:opacity-0"
      />

      <ArrowRight
        aria-hidden="true"
        className="absolute right-4 z-[9] h-4 w-4 stroke-current transition-[right] duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:right-[-25%] motion-reduce:group-hover:right-4"
      />
    </Link>
  );
}
