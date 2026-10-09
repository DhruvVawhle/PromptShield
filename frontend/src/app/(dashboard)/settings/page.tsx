import type { Metadata } from "next";
import { getOmniRouteConfig } from "@/lib/omniroute";

import { SettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure PromptShield deployment settings, providers, and operational preferences.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  const omniConfig = getOmniRouteConfig();
  
  return (
    <SettingsClient 
      omniRouteUrl={omniConfig.baseUrl}
      omniRouteModel={omniConfig.model}
      omniRouteConfigured={!!omniConfig.apiKey}
    />
  );
}
