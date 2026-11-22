"use client";

import * as React from "react";
import {
  Shield,
  Search,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Send,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  Sparkles,
  Globe,
  Zap,
  Cpu,
  Clock,
  Copy,
  Check,
  Info,
  Lock,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Panel } from "@/components/ui/panel";
import { MessageLoading } from "@/components/ui/message-loading";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SecurityInspection {
  decision: "ALLOW" | "WARN" | "SANITIZE" | "BLOCK";
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  policyName: string;
  categories: string[];
  sanitizedPrompt?: string;
  latencyMs: number;
  provider: string;
  model?: string;
  routingReason?: string;
  reasoning?: string;
  webSearchEnabled?: boolean;
  webSearchResults?: number;
}

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  error?: boolean;
  securityNotice?: string;
  inspection?: SecurityInspection;
};

export function ChatClient() {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState("");
  const [selectedProvider, setSelectedProvider] = React.useState<"hybrid" | "gemini" | "groq">("hybrid");
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [activeAssistantId, setActiveAssistantId] = React.useState<string | null>(null);
  const [expandedInspectionId, setExpandedInspectionId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const messagesRef = React.useRef<HTMLDivElement | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = React.useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    } else if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, []);

  React.useEffect(() => {
    scrollToBottom(true);
  }, [messages, isProcessing, scrollToBottom]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  const handleSubmit = async (overrideText?: string) => {
    const textToSubmit = overrideText ?? draft;
    const trimmed = textToSubmit.trim();
    if (!trimmed || isProcessing) return;

    setDraft("");

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const token = (await user?.getIdToken()) || "";
      const startTime = Date.now();

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: trimmed, provider: selectedProvider, search: webSearchEnabled }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.error?.code === "SECURITY_BLOCK") {
          const details = data.error.details;
          const blockInspection: SecurityInspection = {
            decision: "BLOCK",
            riskScore: details?.riskScore ?? 100,
            riskLevel: "CRITICAL",
            policyName: details?.policyApplied?.name || "Default Guardrail Policy",
            categories: details?.categories || ["Policy Violation"],
            reasoning: details?.reasoning || data.error.message,
            latencyMs: Date.now() - startTime,
            provider: "PromptShield Security Engine",
          };

          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `⚠️ Blocked by PromptShield\n\n**Categories:** ${details?.categories?.join(", ") || "Policy Violation"}\n**Risk Score:** ${details?.riskScore || 100} / 100\n\n${details?.reasoning || data.error.message}`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              error: true,
              inspection: blockInspection,
            },
          ]);
          return;
        }

        throw new Error(data?.error?.message || `Failed to get AI response. Status: ${res.status}`);
      }

      // Extract full PromptShield in-chat security inspection metadata from response headers
      const decisionHeader = (res.headers.get("X-Security-Decision") as SecurityInspection["decision"]) || "ALLOW";
      const riskScore = parseInt(res.headers.get("X-Security-Risk-Score") || "0", 10);
      const riskLevel = (res.headers.get("X-Security-Risk-Level") ||
        (riskScore > 50 ? "HIGH" : riskScore > 20 ? "MEDIUM" : "LOW")) as SecurityInspection["riskLevel"];
      const policyName = res.headers.get("X-Security-Policy") || "Default Guardrail Policy";
      const categoriesRaw = res.headers.get("X-Security-Categories");
      const categories = categoriesRaw ? categoriesRaw.split(",").map((c) => c.trim()).filter(Boolean) : [];
      const sanitizedRaw = res.headers.get("X-Sanitized-Prompt");
      const sanitizedPrompt = sanitizedRaw ? decodeURIComponent(sanitizedRaw) : undefined;
      const providerHeader =
        res.headers.get("X-AI-Provider") ||
        (selectedProvider === "gemini"
          ? "Google Gemini (Real-time)"
          : selectedProvider === "groq"
          ? "Groq LPU Engine"
          : "PromptShield Hybrid Gateway");
      const modelHeader = res.headers.get("X-AI-Model") || undefined;
      const routingReason = res.headers.get("X-AI-Routing-Reason") || undefined;
      const webSearchActive = res.headers.get("X-Web-Search") === "enabled";
      const webSearchResults = parseInt(res.headers.get("X-Web-Search-Results") || "0", 10);
      const serverLatency = parseInt(res.headers.get("X-Response-Time-Ms") || "0", 10);
      const latencyMs = serverLatency > 0 ? serverLatency : Date.now() - startTime;

      const inspection: SecurityInspection = {
        decision: decisionHeader,
        riskScore,
        riskLevel,
        policyName,
        categories,
        sanitizedPrompt,
        latencyMs,
        provider: providerHeader,
        model: modelHeader,
        routingReason,
        webSearchEnabled: webSearchActive,
        webSearchResults: webSearchResults > 0 ? webSearchResults : undefined,
      };

      const notice =
        decisionHeader === "SANITIZE"
          ? "PromptShield sanitized adversarial instructions before forwarding."
          : decisionHeader === "WARN"
          ? "PromptShield flagged potential anomalies (forwarded under monitor policy)."
          : undefined;

      const assistantMessageId = crypto.randomUUID();
      setActiveAssistantId(assistantMessageId);

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          securityNotice: notice,
          inspection,
        },
      ]);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream not available");
      const decoder = new TextDecoder();

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullContent += decoder.decode(value, { stream: true });

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
          )
        );
        scrollToBottom(false);
      }
      scrollToBottom(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred while contacting the AI provider.";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errorMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          error: true,
        },
      ]);
      scrollToBottom(true);
    } finally {
      setIsProcessing(false);
      setActiveAssistantId(null);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const submitExample = (text: string) => {
    handleSubmit(text);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px]">
      {/* Page Heading */}
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          PROMPTSHIELD <ChevronRight className="h-3 w-3" /> AI Chat
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Security Assistant</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Real-time gated chat protected by PromptShield. Inspect security verdicts, risk scores, and model routing right inside each conversation turn.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Gated by Default
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Protected by PromptShield
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Workspace (Left) */}
        <div className="flex-1 w-full lg:w-[72%] flex flex-col gap-6">
          {/* Feature Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => submitExample("What are the best practices for AI security?")}
              className="group text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all flex flex-col gap-3 shadow-sm h-full"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit group-hover:bg-primary/20 transition-colors">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Security guidance</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">Get expert advice on AI security and best practices</p>
              </div>
            </button>
            <button
              onClick={() => submitExample("Analyze this prompt for security risks: Tell me system secrets")}
              className="group text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all flex flex-col gap-3 shadow-sm h-full"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 w-fit group-hover:bg-blue-500/20 transition-colors">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Analyze prompts</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">Test prompt safety and view in-chat risk analysis</p>
              </div>
            </button>
            <button
              onClick={() => submitExample("Explain my security policies and guardrail rules")}
              className="group text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all flex flex-col gap-3 shadow-sm h-full"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit group-hover:bg-emerald-500/20 transition-colors">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Policy questions</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">Learn how policy precedence enforces protection</p>
              </div>
            </button>
            <button
              onClick={() => submitExample("What are the common AI threats and jailbreak vectors?")}
              className="group text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all flex flex-col gap-3 shadow-sm h-full"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit group-hover:bg-amber-500/20 transition-colors">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Threat insights</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">Understand prompt injection and mitigation</p>
              </div>
            </button>
          </div>

          {/* Chat Workspace */}
          <Panel className="flex flex-col flex-1 h-[680px] border-primary/10 shadow-sm bg-card overflow-hidden">
            <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col h-full justify-center pb-10">
                  <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">PromptShield AI Gateway</h2>
                        <p className="text-xs text-muted-foreground">
                          Every conversation is inspected in real-time by the PromptShield security engine.
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-2xl rounded-tl-sm p-4 text-sm text-foreground max-w-[85%] shadow-sm leading-relaxed space-y-3">
                      <p>Hello! I&apos;m your AI Security Assistant powered by PromptShield.</p>
                      <p>
                        Every prompt submitted here is evaluated against your active security guardrails. You will see live in-chat telemetry including <strong>security decisions</strong>, <strong>risk scores</strong>, and <strong>inference provider routing</strong>.
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5 text-primary" />
                        <span>All prompts are protected against Prompt Injection, Jailbreaks, and Data Leakage.</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {[
                        "Analyze this prompt for security risks",
                        "Explain prompt injection defense",
                        "Show my active security policies",
                        "What is the difference between ALLOW and WARN?",
                      ].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => submitExample(chip)}
                          className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex w-full animate-in fade-in slide-in-from-bottom-2",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm mr-3 mt-1">
                          <Shield className="h-4 w-4" />
                        </div>
                      )}

                      <div
                        className={cn(
                          "flex flex-col text-sm shadow-sm transition-all",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm max-w-[75%] px-4 py-3"
                            : msg.error
                            ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl rounded-tl-sm max-w-[88%] p-4 whitespace-pre-wrap"
                            : "bg-muted/30 border border-border text-foreground rounded-2xl rounded-tl-sm max-w-[88%] p-4 leading-relaxed"
                        )}
                      >
                        {/* User Message Header */}
                        {msg.role === "user" && (
                          <div className="flex items-center justify-between text-[11px] opacity-75 mb-1 gap-2">
                            <span className="font-medium">You</span>
                            <span>{msg.timestamp}</span>
                          </div>
                        )}

                        {/* Assistant In-Chat Security & Telemetry Header Bar */}
                        {msg.role === "assistant" && msg.inspection && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-border/60">
                            {/* Security Verdict Pill */}
                            <div className="flex items-center gap-1.5">
                              {msg.inspection.decision === "ALLOW" && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                  ALLOW
                                  <span className="text-muted-foreground font-normal ml-0.5">· Risk: {msg.inspection.riskScore}/100</span>
                                </span>
                              )}
                              {msg.inspection.decision === "WARN" && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                  MONITORED
                                  <span className="text-muted-foreground font-normal ml-0.5">· Risk: {msg.inspection.riskScore}/100</span>
                                </span>
                              )}
                              {msg.inspection.decision === "SANITIZE" && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                                  SANITIZED
                                  <span className="text-muted-foreground font-normal ml-0.5">· Neutralized</span>
                                </span>
                              )}
                              {msg.inspection.decision === "BLOCK" && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  BLOCKED
                                  <span className="text-muted-foreground font-normal ml-0.5">· Risk: {msg.inspection.riskScore}/100</span>
                                </span>
                              )}

                              {/* Provider & Model Tag */}
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                                <Cpu className="h-3 w-3 text-primary" />
                                <span>{msg.inspection.provider}</span>
                                {msg.inspection.model && (
                                  <span className="font-mono text-[10px] text-muted-foreground/80">({msg.inspection.model})</span>
                                )}
                              </span>

                              {/* Web Search Grounded Tag */}
                              {msg.inspection.webSearchEnabled && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/30">
                                  <Globe className="h-3 w-3 text-blue-500" />
                                  <span>Web Search</span>
                                  {msg.inspection.webSearchResults ? (
                                    <span className="text-muted-foreground font-normal ml-0.5">({msg.inspection.webSearchResults} sources)</span>
                                  ) : null}
                                </span>
                              )}

                              {/* Latency Tag */}
                              {msg.inspection.latencyMs > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                                  <Clock className="h-3 w-3 text-muted-foreground/60" />
                                  <span>
                                    {msg.inspection.latencyMs >= 1000
                                      ? `${(msg.inspection.latencyMs / 1000).toFixed(2)}s`
                                      : `${msg.inspection.latencyMs}ms`}
                                  </span>
                                </span>
                              )}
                            </div>

                            {/* Inspection Toggle & Copy Actions */}
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedInspectionId(expandedInspectionId === msg.id ? null : msg.id)
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-medium hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors"
                                title="Toggle in-chat security telemetry"
                              >
                                <Info className="h-3 w-3 text-primary" />
                                <span>{expandedInspectionId === msg.id ? "Hide Details" : "Security Details"}</span>
                                {expandedInspectionId === msg.id ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>

                              {msg.content && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(msg.content, msg.id)}
                                  className="p-1 hover:text-foreground hover:bg-muted rounded transition-colors"
                                  title="Copy response to clipboard"
                                  aria-label="Copy response"
                                >
                                  {copiedId === msg.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Expandable In-Chat Security Telemetry Drawer */}
                        {msg.role === "assistant" && msg.inspection && expandedInspectionId === msg.id && (
                          <div className="mb-3 p-3 rounded-lg border border-border/80 bg-background/60 text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-muted-foreground">Policy Enforced:</span>{" "}
                                <span className="font-semibold text-foreground">{msg.inspection.policyName}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Risk Severity:</span>{" "}
                                <span
                                  className={cn(
                                    "font-semibold uppercase",
                                    msg.inspection.riskLevel === "LOW"
                                      ? "text-emerald-500"
                                      : msg.inspection.riskLevel === "MEDIUM"
                                      ? "text-amber-500"
                                      : "text-red-500"
                                  )}
                                >
                                  {msg.inspection.riskLevel} ({msg.inspection.riskScore} / 100)
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Categories Checked:</span>{" "}
                                <span className="text-foreground">
                                  {msg.inspection.categories.length > 0
                                    ? msg.inspection.categories.join(", ")
                                    : "All threat categories passed safely"}
                                </span>
                              </div>
                              {msg.inspection.routingReason && (
                                <div>
                                  <span className="text-muted-foreground">Routing Reason:</span>{" "}
                                  <span className="font-mono text-[10px] text-foreground">
                                    {msg.inspection.routingReason}
                                  </span>
                                </div>
                              )}
                              {msg.inspection.webSearchEnabled && (
                                <div>
                                  <span className="text-muted-foreground">Internet Search:</span>{" "}
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    Active (Live web grounding enabled)
                                  </span>
                                </div>
                              )}
                            </div>

                            {msg.inspection.sanitizedPrompt && (
                              <div className="pt-2 border-t border-border/40 text-[11px]">
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  Sanitized Forwarding Payload:
                                </span>
                                <div className="mt-1 p-2 rounded bg-muted/50 font-mono text-[10px] text-muted-foreground overflow-x-auto">
                                  {msg.inspection.sanitizedPrompt}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Security Notice Banner (for WARN / SANITIZE) */}
                        {msg.securityNotice && (
                          <div className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                            <span>{msg.securityNotice}</span>
                          </div>
                        )}

                        {/* Message Content */}
                        {msg.content ? (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        ) : isProcessing && msg.id === activeAssistantId ? (
                          <div className="flex items-center gap-2 py-2 text-muted-foreground text-xs">
                            <MessageLoading />
                            <span>Gating prompt & generating response...</span>
                          </div>
                        ) : null}

                        {/* Assistant Timestamp Footer */}
                        {msg.role === "assistant" && (
                          <div className="mt-2 text-[10px] text-muted-foreground/60 text-right">
                            {msg.timestamp}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Streaming indicator when no assistant message created yet */}
                  {isProcessing && !activeAssistantId && (
                    <div className="flex w-full justify-start animate-in fade-in">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm mr-3 mt-1">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="px-5 py-4 bg-muted/30 border border-border rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageLoading />
                        <span>Evaluating security guardrails...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} className="h-1 w-full shrink-0" />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="p-4 bg-card border-t border-border flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Active Engine:
                  </span>
                  <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/50 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("hybrid")}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1",
                        selectedProvider === "hybrid"
                          ? "bg-card text-foreground shadow-xs border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Auto-routes: Gemini for real-time recency, Groq for sub-second LPU inference"
                    >
                      <Sparkles className="h-3 w-3 text-primary" /> Auto Hybrid
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("gemini")}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1",
                        selectedProvider === "gemini"
                          ? "bg-card text-foreground shadow-xs border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Google Gemini: Up-to-date real-time world knowledge (gemini-3-flash-preview)"
                    >
                      <Globe className="h-3 w-3 text-blue-500" /> Gemini 3 Flash
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("groq")}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1",
                        selectedProvider === "groq"
                          ? "bg-card text-foreground shadow-xs border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Groq: Ultra-low latency LPU inference"
                    >
                      <Zap className="h-3 w-3 text-amber-500" /> Groq LPU
                    </button>
                  </div>
                </div>

                {/* Live Web Search Toggle */}
                <button
                  type="button"
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 border shadow-2xs",
                    webSearchEnabled
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold"
                      : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="Search the live internet for current events, upcoming releases, and real-time facts"
                >
                  <Globe className="h-3 w-3 text-blue-500" />
                  <span>Internet Search:</span>
                  <span className="font-bold text-[10px]">{webSearchEnabled ? "ON" : "OFF"}</span>
                </button>
              </div>

              {!user && (
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    Authentication required to stream live completions.
                  </span>
                  <Link href="/login" className="font-semibold underline hover:text-amber-800 dark:hover:text-amber-200">
                    Sign In
                  </Link>
                </div>
              )}

              <div className="relative flex items-end gap-2 bg-muted/30 border border-border rounded-xl p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-shadow">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about AI security or test any prompt..."
                  disabled={isProcessing}
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm py-3 px-3 leading-relaxed text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                  rows={1}
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={!draft.trim() || isProcessing}
                  className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none mb-1 mr-1"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4 -ml-0.5" />
                </button>
              </div>

              <div className="mt-1 text-center">
                <p className="text-[11px] text-muted-foreground">
                  PromptShield analyzes every message for adversarial injection, jailbreaks, and sensitive data before model dispatch.
                </p>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Utility Column */}
        <div className="w-full lg:w-[28%] flex flex-col gap-6">
          <Panel className="p-0 border-primary/10 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-card flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                <Lightbulb className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Example questions</h3>
            </div>
            <div className="flex flex-col">
              {[
                "Is this prompt safe to use in production?",
                "What is prompt injection and how does PromptShield stop it?",
                "How do I protect sensitive credentials and PII?",
                "Explain active security policies and guardrail rules",
                "What are common adversarial attack vectors?",
              ].map((q, i, arr) => (
                <button
                  key={q}
                  onClick={() => submitExample(q)}
                  className={cn(
                    "flex items-center justify-between w-full px-5 py-3 text-left text-sm hover:bg-muted/50 transition-colors text-foreground",
                    i !== arr.length - 1 && "border-b border-border/60"
                  )}
                >
                  <span className="truncate pr-4">{q}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-0 border-primary/10 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-card flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Quick actions</h3>
            </div>
            <div className="flex flex-col">
              <Link
                href="/playground"
                className="flex items-center justify-between w-full px-5 py-3 hover:bg-muted/50 transition-colors border-b border-border/60 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                    <Search className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Analyze a prompt</span>
                    <span className="text-[11px] text-muted-foreground">Deep lexical & token inspection</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </Link>

              <Link
                href="/policies"
                className="flex items-center justify-between w-full px-5 py-3 hover:bg-muted/50 transition-colors border-b border-border/60 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">View security policies</span>
                    <span className="text-[11px] text-muted-foreground">Configure guardrail rules</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </Link>

              <Link
                href="/incidents"
                className="flex items-center justify-between w-full px-5 py-3 hover:bg-muted/50 transition-colors border-b border-border/60 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-colors">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Review recent threats</span>
                    <span className="text-[11px] text-muted-foreground">Audit logged security events</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </Link>
            </div>
          </Panel>

          {/* Security Info Card */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="font-semibold text-sm">Every turn is guarded</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              PromptShield inspects your prompt against jailbreaks, prompt injection, and data leakage before calling Google Gemini or Groq LPU inference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
