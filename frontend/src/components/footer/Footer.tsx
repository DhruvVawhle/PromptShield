import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { socialLinks } from "@/lib/site";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const WORDMARK_STYLE = {
  fontWeight: 600,
  letterSpacing: "-0.055em",
} as const;

export const footerColumns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Security", href: "/security" },
      { label: "Architecture", href: "/architecture" },
      { label: "Prompt Playground", href: "/#product" },
    ],
  },
  {
    title: "Resources",
    links: [{ label: "FAQ", href: "/#resources" }],
  },
  {
    title: "Launch",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Incidents", href: "/incidents" },
      { label: "Analytics", href: "/analytics" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

/**
 * Resources entries without a dedicated route yet.
 * Rendered as non-interactive muted text (not links) so the
 * column matches the reference without creating broken links.
 */
const resourcesComingSoon = ["Docs", "Blog", "Status"] as const;

const connectLinks = [
  { label: "GitHub", href: socialLinks.github || "https://github.com", Icon: GithubIcon },
  { label: "LinkedIn", href: socialLinks.linkedin || "https://www.linkedin.com", Icon: LinkedinIcon },
] as const;

function FooterColumnBlock({ title, links }: FooterColumn) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={`${title}-${l.label}`}>
            <Link
              href={l.href}
              className="inline-block text-sm leading-6 text-white/60 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {l.label}
            </Link>
          </li>
        ))}
        {title === "Resources"
          ? resourcesComingSoon.map((label) => (
              <li key={`Resources-${label}`}>
                <span
                  className="inline-block cursor-default text-sm leading-6 text-white/35"
                  title="Coming soon"
                  aria-disabled="true"
                >
                  {label}
                </span>
              </li>
            ))
          : null}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="overflow-x-hidden bg-black text-white">
      <div className="mx-auto max-w-[1280px] px-6 pt-20 sm:px-8 sm:pt-24 lg:px-12 lg:pt-28">
        <div className="grid gap-10 sm:gap-12 lg:grid-cols-[1.05fr_1.95fr] lg:items-start lg:gap-16">
          <div className="min-w-0 max-w-sm">
            <Link
              href="/"
              aria-label="PromptShield home"
              className="inline-block rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              style={WORDMARK_STYLE}
            >
              <span className="text-[15px] tracking-[-0.055em] text-white">PROMPTSHIELD</span>
            </Link>
            <p className="mt-5 max-w-[32ch] text-sm leading-7 text-white/60">
              A security layer between applications, users, and large language models that detects
              malicious intent, explains the risk, and enforces decisions before execution.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid min-w-0 grid-cols-2 gap-8 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-5 lg:gap-x-6"
          >
            {footerColumns.map((col) => (
              <FooterColumnBlock key={col.title} title={col.title} links={col.links} />
            ))}

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Connect
              </p>
              <ul className="mt-4 space-y-3">
                {connectLinks.map(({ label, href, Icon }) => (
                  <li key={`Connect-${label}`}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} (opens in a new tab)`}
                      className="inline-flex items-center gap-2 text-sm leading-6 text-white/60 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="footer-wordmark-wrapper mt-16 flex w-full max-w-full items-end justify-center overflow-visible px-0 sm:mt-20 sm:px-2 lg:mt-24 lg:px-4">
          <Wordmark />
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/10 py-6 text-[13px] leading-6 text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/50">© 2026 PromptShield. All rights reserved.</p>
          <p className="text-white/50">Made by Dhruv Vawhle for safer AI.</p>
        </div>
      </div>
    </footer>
  );
}
