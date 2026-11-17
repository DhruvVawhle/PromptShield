import type { Metadata } from "next";
import { getGroqConfig } from "@/lib/groq";

import { SettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure PromptShield deployment settings, providers, and operational preferences.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  const groqConfig = getGroqConfig();
  
  return (
    <SettingsClient 
      omniRouteUrl={groqConfig.baseUrl}
      omniRouteModel={groqConfig.model}
      omniRouteConfigured={!!groqConfig.apiKey}
    />
  );
}
