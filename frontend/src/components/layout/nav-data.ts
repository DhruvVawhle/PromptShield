export type NavLink = {
  label: string;
  description: string;
  href: string;
  external?: boolean;
};

export type NavGroup = {
  title: string;
  links: NavLink[];
};

// ── Product dropdown ─────────────────────────────────────────────────────────

export const productGroups: NavGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Prompt Playground", description: "Try an attack and watch it get blocked", href: "/#product" },
      { label: "Security", description: "Detect prompt injection and enforce policy", href: "/security" },
      { label: "Architecture", description: "How the security gateway is structured", href: "/architecture" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Dashboard", description: "Review decisions and risk scores", href: "/dashboard" },
      { label: "Incidents", description: "Track blocked and flagged prompts", href: "/incidents" },
      { label: "Analytics", description: "See attack trends over time", href: "/analytics" },
    ],
  },
];

export const productFeaturedLink: NavLink = {
  label: "Prompt Playground",
  description: "Try an attack and watch it get blocked.",
  href: "/#product",
};

// ── Resources dropdown ───────────────────────────────────────────────────────

export const resourcesGroups: NavGroup[] = [
  {
    title: "Learn",
    links: [
      { label: "FAQ", description: "Answers on how PromptShield works", href: "/#resources" },
      { label: "About", description: "Why we built a security layer for LLMs", href: "/about" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact", description: "Talk to the team", href: "/contact" },
      { label: "Privacy", description: "How data is handled", href: "/privacy" },
      { label: "Terms", description: "The rules of use", href: "/terms" },
    ],
  },
];

export const resourcesFeaturedLink: NavLink = {
  label: "FAQ",
  description: "Get answers on how PromptShield works and what it protects.",
  href: "/#resources",
};
