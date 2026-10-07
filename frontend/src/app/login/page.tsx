import type { Metadata } from "next";
import ModernLoginSignup from "@/components/ui/modern-login-signup";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to PromptShield to protect your AI interactions from prompt injection, jailbreak attempts, and malicious instructions.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const initialMode = params.mode === "signup" ? "signup" : "login";

  return <ModernLoginSignup initialMode={initialMode} />;
}
