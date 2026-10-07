"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Wordmark } from "@/components/footer/Wordmark";

const marqueeItems = [
  "ALLOW",
  "WARN",
  "SANITIZE",
  "BLOCK",
  "ANALYZE",
  "DETECT",
  "ASSESS",
  "PROTECT",
] as const;

export function MotionFooter() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-border bg-[#0b0f14] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.14),_transparent_48%)]" aria-hidden="true" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:64px_64px]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.02] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-300">
                Secure every prompt
              </p>
              <h2 className="mt-6 text-5xl font-semibold tracking-[-0.08em] text-white sm:text-6xl lg:text-[7rem]">
                PROMPTSHIELD
              </h2>
            </div>

            <Link
              href="/chat"
              className="motion-footer-cta inline-flex items-center justify-center gap-2 self-start rounded-full border border-white/15 bg-white px-5 py-4 text-base font-medium text-slate-950 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f14]"
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
                const y = ((event.clientY - rect.top) / rect.height - 0.5) * 16;
                setOffset({ x, y });
              }}
              onMouseLeave={() => setOffset({ x: 0, y: 0 })}
              onFocus={() => setOffset({ x: 0, y: 0 })}
              onBlur={() => setOffset({ x: 0, y: 0 })}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
            >
              <span>Open PromptShield</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 overflow-hidden border-y border-white/10 py-3">
            <div className="motion-marquee-track flex min-w-max items-center gap-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              {[...marqueeItems, ...marqueeItems].map((item, index) => (
                <span key={`${item}-${index}`} className="inline-flex items-center gap-8">
                  <span>{item}</span>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300/80" aria-hidden="true" />
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
            <div className="max-w-sm">
              <div className="flex items-center gap-3 text-sm font-medium text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                </span>
                PromptShield
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                A security layer between applications, users, and large language models that detects malicious intent, explains the risk, and enforces decisions before execution.
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Product</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li><Link href="/security" className="transition-colors hover:text-white">Security</Link></li>
                <li><Link href="/architecture" className="transition-colors hover:text-white">Architecture</Link></li>
                <li><Link href="/chat" className="transition-colors hover:text-white">AI Chat</Link></li>
                <li><Link href="/playground" className="transition-colors hover:text-white">Security Playground</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Resources</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li><Link href="/about" className="transition-colors hover:text-white">About</Link></li>
                <li><Link href="/contact" className="transition-colors hover:text-white">Contact</Link></li>
                <li><Link href="/#resources" className="transition-colors hover:text-white">FAQ</Link></li>
                <li><Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Launch</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li><Link href="/dashboard" className="transition-colors hover:text-white">Dashboard</Link></li>
                <li><Link href="/incidents" className="transition-colors hover:text-white">Incidents</Link></li>
                <li><Link href="/analytics" className="transition-colors hover:text-white">Analytics</Link></li>
                <li><Link href="/terms" className="transition-colors hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 PromptShield. Product configuration placeholders remain in place until operational details are finalized.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
              <Link href="/contact" className="transition-colors hover:text-white">Contact</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none mt-2 select-none px-2 sm:px-4 lg:px-6">
        <Wordmark />
      </div>
    </footer>
  );
}
