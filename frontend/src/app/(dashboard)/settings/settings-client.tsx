"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth/AuthProvider";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, 
  Monitor, 
  Moon, 
  Sun, 
  Settings2, 
  Cpu, 
  ShieldCheck, 
  Lock, 
  Bell, 
  UserCircle,
  Database,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsState = {
  defaultAction: "WARN" | "BLOCK" | "ALLOW";
  timeRange: "7" | "30" | "90";
  emailNotifications: boolean;
  promptInjection: boolean;
  sensitiveData: boolean;
  auditLogging: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  defaultAction: "WARN",
  timeRange: "30",
  emailNotifications: true,
  promptInjection: true,
  sensitiveData: true,
  auditLogging: true,
};

export function SettingsClient({
  omniRouteUrl,
  omniRouteModel,
  omniRouteConfigured,
}: {
  omniRouteUrl: string;
  omniRouteModel: string;
  omniRouteConfigured: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = React.useState("general");
  const [settings, setSettings] = React.useState<SettingsState>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = React.useState<SettingsState>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = React.useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call for saving preferences
    await new Promise(resolve => setTimeout(resolve, 800));
    setInitialSettings(settings);
    setIsSaving(false);
  };

  const handleDiscard = () => {
    setSettings(initialSettings);
  };

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] pb-24 relative">
      {/* Page Heading */}
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          PROMPTSHIELD <ChevronRight className="h-3 w-3" /> Settings
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Manage your account, AI providers, security controls, and data preferences.
          </p>
        </div>
        
        {/* Horizontal Category Tabs */}
        <div className="flex items-center gap-1 mt-4 overflow-x-auto no-scrollbar border-b border-transparent">
          {[
            { id: "general", label: "General", icon: Settings2 },
            { id: "providers", label: "AI Providers", icon: Cpu },
            { id: "security", label: "Security & Guardrails", icon: ShieldCheck },
            { id: "privacy", label: "Data & Privacy", icon: Lock },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "account", label: "Account", icon: UserCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column (65%) */}
        <div className="flex-1 w-full lg:w-[65%] flex flex-col gap-6">
          
          {/* Workspace Preferences */}
          <Panel id="general" className="p-0 overflow-hidden scroll-mt-24">
            <div className="px-6 py-5 border-b border-border bg-card/50">
              <h2 className="text-lg font-semibold text-foreground">Workspace preferences</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure how PromptShield works for your workspace.</p>
            </div>
            <div className="p-6 space-y-8">
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-foreground">Appearance</h3>
                  <p className="text-xs text-muted-foreground mt-1">Choose how the application looks.</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border">
                  <button onClick={() => setTheme("light")} className={cn("p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 transition-colors", theme === "light" ? "bg-background shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground")}>
                    <Sun className="h-4 w-4" /> Light
                  </button>
                  <button onClick={() => setTheme("dark")} className={cn("p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 transition-colors", theme === "dark" ? "bg-background shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground")}>
                    <Moon className="h-4 w-4" /> Dark
                  </button>
                  <button onClick={() => setTheme("system")} className={cn("p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 transition-colors", theme === "system" ? "bg-background shadow-sm text-foreground border border-border" : "text-muted-foreground hover:text-foreground")}>
                    <Monitor className="h-4 w-4" /> System
                  </button>
                </div>
              </div>

              <div className="h-px bg-border/60 w-full" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-foreground">Default analysis action</h3>
                  <p className="text-xs text-muted-foreground mt-1">Action to take when a prompt has uncertain risk.</p>
                </div>
                <select 
                  value={settings.defaultAction}
                  onChange={(e) => setSettings({...settings, defaultAction: e.target.value as any})}
                  className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer min-w-[200px]"
                >
                  <option value="ALLOW">Allow on uncertain prompts</option>
                  <option value="WARN">Warn on uncertain prompts</option>
                  <option value="BLOCK">Block on uncertain prompts</option>
                </select>
              </div>

              <div className="h-px bg-border/60 w-full" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-foreground">Default time range</h3>
                  <p className="text-xs text-muted-foreground mt-1">Default time range for analytics and incident views.</p>
                </div>
                <select 
                  value={settings.timeRange}
                  onChange={(e) => setSettings({...settings, timeRange: e.target.value as any})}
                  className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer min-w-[200px]"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

            </div>
          </Panel>

          {/* AI Provider Configuration */}
          <Panel id="providers" className="p-0 overflow-hidden scroll-mt-24">
            <div className="px-6 py-5 border-b border-border bg-card/50">
              <h2 className="text-lg font-semibold text-foreground">AI provider configuration</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure the AI model provider used for prompt analysis and chat.</p>
            </div>
            <div className="p-6">
              <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">OmniRoute Gateway</h3>
                      {omniRouteConfigured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-status-allow/10 px-2 py-0.5 text-[10px] font-medium text-status-allow uppercase tracking-wider">
                          <CheckCircle2 className="h-3 w-3" /> Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-status-block/10 px-2 py-0.5 text-[10px] font-medium text-status-block uppercase tracking-wider">
                          <AlertCircle className="h-3 w-3" /> Not Configured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{omniRouteUrl}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">Model: {omniRouteModel}</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="whitespace-nowrap shrink-0">
                  Manage provider
                </Button>
              </div>
            </div>
          </Panel>

          {/* Security Defaults */}
          <Panel id="security" className="p-0 overflow-hidden scroll-mt-24">
            <div className="px-6 py-5 border-b border-border bg-card/50">
              <h2 className="text-lg font-semibold text-foreground">Security defaults</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure default security controls for prompt analysis.</p>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-foreground">Prompt injection detection</h3>
                  <p className="text-xs text-muted-foreground mt-1">Detect attempts to override system instructions or manipulate behavior.</p>
                </div>
                <button 
                  onClick={() => setSettings({...settings, promptInjection: !settings.promptInjection})}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors", settings.promptInjection ? "bg-primary" : "bg-muted-foreground/30")}
                >
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm", settings.promptInjection ? "translate-x-4" : "translate-x-1")} />
                </button>
              </div>

              <div className="h-px bg-border/60 w-full" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-foreground">Sensitive data detection</h3>
                  <p className="text-xs text-muted-foreground mt-1">Detect and flag sensitive information such as PII, credentials, and API keys.</p>
                </div>
                <button 
                  onClick={() => setSettings({...settings, sensitiveData: !settings.sensitiveData})}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors", settings.sensitiveData ? "bg-primary" : "bg-muted-foreground/30")}
                >
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm", settings.sensitiveData ? "translate-x-4" : "translate-x-1")} />
                </button>
              </div>

              <div className="h-px bg-border/60 w-full" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-foreground">Audit logging</h3>
                  <p className="text-xs text-muted-foreground mt-1">Log security events and analysis results for monitoring and compliance.</p>
                </div>
                <button 
                  onClick={() => setSettings({...settings, auditLogging: !settings.auditLogging})}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors", settings.auditLogging ? "bg-primary" : "bg-muted-foreground/30")}
                >
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm", settings.auditLogging ? "translate-x-4" : "translate-x-1")} />
                </button>
              </div>

            </div>
          </Panel>
        </div>

        {/* Right Column (35%) */}
        <div className="w-full lg:w-[35%] flex flex-col gap-6">
          
          {/* Account */}
          <Panel id="account" className="p-0 overflow-hidden scroll-mt-24">
            <div className="px-5 py-4 border-b border-border bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">Account</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your account information and preferences.</p>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-primary">{user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}</span>
                  )}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-medium text-foreground truncate">{user?.displayName || "Anonymous User"}</h3>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || "No email provided"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="w-full text-xs">Manage profile</Button>
              </div>
            </div>
          </Panel>

          {/* System Status */}
          <Panel className="p-0 overflow-hidden scroll-mt-24">
            <div className="px-5 py-4 border-b border-border bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">System status</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time status of PromptShield services.</p>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Authentication</span>
                <span className="inline-flex items-center gap-1.5 text-status-allow font-medium">
                  <span className="h-2 w-2 rounded-full bg-status-allow"></span> Operational
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Policy engine</span>
                <span className="inline-flex items-center gap-1.5 text-status-allow font-medium">
                  <span className="h-2 w-2 rounded-full bg-status-allow"></span> Operational
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI gateway</span>
                {omniRouteConfigured ? (
                  <span className="inline-flex items-center gap-1.5 text-status-allow font-medium">
                    <span className="h-2 w-2 rounded-full bg-status-allow"></span> Operational
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-status-warn font-medium">
                    <span className="h-2 w-2 rounded-full bg-status-warn"></span> Unavailable
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data store</span>
                <span className="inline-flex items-center gap-1.5 text-status-allow font-medium">
                  <span className="h-2 w-2 rounded-full bg-status-allow"></span> Operational
                </span>
              </div>
            </div>
          </Panel>

          {/* Notifications Config (Email) */}
          <Panel id="notifications" className="p-0 overflow-hidden scroll-mt-24">
             <div className="px-5 py-4 border-b border-border bg-card/50 flex flex-col gap-1">
               <h2 className="text-sm font-semibold text-foreground">Email notifications</h2>
               <p className="text-xs text-muted-foreground">Receive important security notifications via email.</p>
             </div>
             <div className="p-5">
               <div className="flex items-center justify-between gap-4">
                 <span className="text-sm font-medium">Security alerts</span>
                 <button 
                  onClick={() => setSettings({...settings, emailNotifications: !settings.emailNotifications})}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors", settings.emailNotifications ? "bg-primary" : "bg-muted-foreground/30")}
                >
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm", settings.emailNotifications ? "translate-x-4" : "translate-x-1")} />
                </button>
               </div>
             </div>
          </Panel>

          {/* Data & Privacy */}
          <Panel id="privacy" className="p-0 overflow-hidden scroll-mt-24">
            <div className="px-5 py-4 border-b border-border bg-card/50">
              <h2 className="text-sm font-semibold text-foreground">Data & privacy</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your data, privacy settings, and account controls.</p>
            </div>
            <div className="flex flex-col">
              <button className="flex items-center justify-between w-full px-5 py-3.5 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/60 text-foreground group">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium group-hover:text-primary transition-colors">Export my data</span>
                  <span className="text-xs text-muted-foreground">Download your analysis history.</span>
                </div>
                <Download className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              <button className="flex items-center justify-between w-full px-5 py-3.5 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/60 text-foreground group">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium group-hover:text-primary transition-colors">Privacy settings</span>
                  <span className="text-xs text-muted-foreground">Manage data retention policies.</span>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              <button className="flex items-center justify-between w-full px-5 py-3.5 text-left text-sm hover:bg-destructive/5 transition-colors text-foreground group">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-destructive">Delete account</span>
                  <span className="text-xs text-muted-foreground">Permanently remove your data.</span>
                </div>
                <Trash2 className="h-4 w-4 shrink-0 text-destructive/70 group-hover:text-destructive transition-colors" />
              </button>
            </div>
          </Panel>

        </div>
      </div>

      {/* Floating Action Bar */}
      <div 
        className={cn(
          "fixed bottom-6 left-[50%] lg:left-[calc(50%+120px)] translate-x-[-50%] bg-surface/90 backdrop-blur-md border border-border shadow-lg rounded-full px-4 py-3 flex items-center gap-4 transition-all duration-300 z-50",
          hasChanges ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
        )}
      >
        <span className="text-sm font-medium px-2 whitespace-nowrap">You have unsaved changes</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isSaving} className="rounded-full">
            Discard
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground min-w-[110px]">
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
