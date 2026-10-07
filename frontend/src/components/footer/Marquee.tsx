"use client";

const ITEMS = ["ALLOW", "WARN", "SANITIZE", "BLOCK", "ANALYZE", "DETECT", "ASSESS", "PROTECT"] as const;

export function Marquee() {
  const doubled = [...ITEMS, ...ITEMS] as readonly string[];
  return (
    <div
      className="overflow-hidden py-3 motion-reduce:[animation:none]"
      aria-hidden="true"
      style={{ maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)" } as React.CSSProperties}
    >
      <div className="flex min-w-max items-center gap-8 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a1a1aa] motion-reduce:animate-none hover:[animation-play-state:paused] motion-reduce:hover:[animation-play-state:running]"
        style={{ animation: "footer-marquee 38s linear infinite" } as React.CSSProperties}
      >
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="inline-flex items-center gap-8">
            <span>{item}</span>
            <span className="inline-block h-[5px] w-[5px] rounded-full bg-[#34d399]" aria-hidden="true" />
          </span>
        ))}
      </div>
      <style>{`@keyframes footer-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } } @media (prefers-reduced-motion: reduce) { div[style*="footer-marquee"] { animation: none !important; } }`}</style>
    </div>
  );
}
