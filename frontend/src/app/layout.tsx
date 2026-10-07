import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/lib/site";
import { LenisProvider } from "@/components/LenisProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: "%s | PromptShield",
  },
  description: siteConfig.description,
  applicationName: "PromptShield",
  keywords: [
    "AI security",
    "prompt injection",
    "LLM security",
    "guardrails",
    "prompt filtering",
  ],
  openGraph: {
    title: "PromptShield — Secure Every Prompt",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: "PromptShield",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptShield",
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LenisProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </LenisProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
