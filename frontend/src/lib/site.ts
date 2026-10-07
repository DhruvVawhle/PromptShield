export const siteConfig = {
  name: "PromptShield",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://promptshield.local"
      : "http://localhost:3000"),
  title: "PromptShield — Secure Every Prompt",
  description:
    "PromptShield analyzes prompts before they reach an LLM, explains the risk, and enforces allow, warn, sanitize, or block decisions.",
};

export const socialLinks = {
  github: process.env.NEXT_PUBLIC_GITHUB_URL ?? "",
  x: process.env.NEXT_PUBLIC_X_URL ?? "",
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "",
} as const;

export const footerContacts = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@promptshield.local",
} as const;

export const publicRoutes = [
  "/",
  "/about",
  "/security",
  "/architecture",
  "/privacy",
  "/terms",
  "/contact",
] as const;

export const privateAppRoutes = [
  "/dashboard",
  "/chat",
  "/playground",
  "/incidents",
  "/analytics",
  "/policies",
  "/audit-logs",
  "/users",
  "/settings",
  "/system",
] as const;
