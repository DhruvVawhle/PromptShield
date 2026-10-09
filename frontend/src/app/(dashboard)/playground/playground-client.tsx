"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/auth/AuthProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { analyzePrompt, EXAMPLE_PROMPTS, type DemoAnalysisResult } from "@/lib/demo/promptAnalyzer";
import { createSecurityEvent, listSecurityEvents, type SecurityEventWithId, formatRelativeTime } from "@/lib/security-events";
import { Shield, ChevronRight, Activity, Clock, Server, Loader2, AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, Zap, Search, Target, FileText, CheckCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function PlaygroundClient() {
  const user = useUser();
  const [promptText, setPromptText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<SecurityEventWithId[]>([]);
  const [currentResult, setCurrentResult] = useState<DemoAnalysisResult | null>(null);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  async function loadHistory() {
    if (!user) return;
    try {
      const events = await listSecurityEvents(user.uid, { limit: 10 });
      setHistory(events);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }

  async function handleAnalyze() {
    if (!promptText.trim() || !user) return;
    setIsAnalyzing(true);
    try {
      // simulate network delay for realism
      await new Promise(r => setTimeout(r, 800));
      const result = analyzePrompt(promptText);
      setCurrentResult(result);
      
      const newEvent = await createSecurityEvent(user.uid, {
        promptId: crypto.randomUUID(),
        riskScore: result.riskScore,
        threatDetected: result.threats.length > 0,
        threatCategory: result.primaryThreatLabel,
        decision: result.decision,
        policy: result.policy.name,
        confidence: 0.95,
        promptLength: promptText.length,
        model: "gpt-4-turbo",
        prompt: promptText,
        sanitizedPrompt: result.sanitizedPrompt ?? null,
      });
      setHistory(prev => [newEvent, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const latestEvent = history[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Heading */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          PROMPTSHIELD <ChevronRight className="h-3 w-3" /> ANALYSIS WORKSPACE
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Security Playground</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Test prompts, inspect threats, and understand the security decision before requests reach an AI model.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge label="PROMPT TEST" tone="info" />
            <StatusBadge label="POLICY ENGINE ACTIVE" tone="allow" />
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Analysis */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-primary/10 shadow-sm h-full flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Analyze a prompt</CardTitle>
                  <CardDescription>Enter a prompt below or choose an example to see how PromptShield evaluates it.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((ep, i) => (
                  <button
                    key={i}
                    onClick={() => setPromptText(ep.text)}
                    className="text-xs font-medium px-2.5 py-1 rounded-full border bg-secondary/50 hover:bg-secondary transition-colors text-secondary-foreground"
                  >
                    {ep.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-h-[200px]">
                <Textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Type or paste a prompt to analyze..."
                  className="min-h-[200px] h-full resize-none p-4 text-sm leading-relaxed"
                />
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {promptText.length} characters
                </div>
              </div>
              <Button 
                onClick={handleAnalyze} 
                disabled={!promptText.trim() || isAnalyzing} 
                className="w-full sm:w-auto self-end"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze prompt"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Overview & Pipeline */}
        <div className="lg:col-span-5 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 shadow-sm border-primary/10">
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5"/> Risk</div>
              <div className="text-2xl font-bold">
                {latestEvent ? latestEvent.riskScore : "--"}
              </div>
            </Card>
            <Card className="p-4 shadow-sm border-primary/10">
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5"/> Threats</div>
              <div className="text-2xl font-bold">
                {latestEvent ? (latestEvent.threatDetected ? "1" : "0") : "--"}
              </div>
            </Card>
            <Card className="p-4 shadow-sm border-primary/10">
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5"/> Last</div>
              <div className="text-sm font-medium leading-tight mt-1 text-muted-foreground">
                {latestEvent ? formatRelativeTime(latestEvent.timestamp) : "Awaiting analysis"}
              </div>
            </Card>
          </div>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Analysis Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 pl-1">
                {(currentResult?.steps || [
                  { id: "1", label: "Prompt Received", status: "pending" },
                  { id: "2", label: "Threat Detection", status: "pending" },
                  { id: "3", label: "Policy Evaluation", status: "pending" },
                  { id: "4", label: "Security Decision", status: "pending" },
                ]).map((step, idx, arr) => (
                  <div key={step.id} className="relative pl-6 pb-6 last:pb-0">
                    {idx < arr.length - 1 && (
                      <div className={cn(
                        "absolute left-[11px] top-6 bottom-0 w-[2px]",
                        step.status === "complete" ? "bg-primary/50" : "bg-muted"
                      )} />
                    )}
                    <div className={cn(
                      "absolute left-0 top-1 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-background",
                      step.status === "complete" ? "border-primary text-primary" : "border-muted text-muted-foreground"
                    )}>
                      {step.status === "complete" ? <CheckCircle className="h-3.5 w-3.5" /> : <div className="h-2 w-2 rounded-full bg-muted" />}
                    </div>
                    <div className="pt-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {step.label}
                        {step.status === "complete" && step.tone && (
                          <StatusBadge label={step.tone.toUpperCase()} tone={step.tone} className="py-0 text-[9px] px-1.5" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {step.result || "Awaiting execution..."}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inspection Tools */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Search className="h-5 w-5" />
          What you can inspect
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/threats" className="block">
            <Card className="shadow-sm hover:shadow-md transition-shadow border-primary/10 group h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-md bg-destructive/10 text-destructive mt-0.5">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                    Threat review <ChevronRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Detected threats, risk factors, and detailed explanations of the model's findings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/policies" className="block">
            <Card className="shadow-sm hover:shadow-md transition-shadow border-primary/10 group h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-md bg-primary/10 text-primary mt-0.5">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                    Policy evaluation <ChevronRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Matched policies, guardrails triggered, and their influence on the final decision.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/audit-logs" className="block">
            <Card className="shadow-sm hover:shadow-md transition-shadow border-primary/10 group h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-md bg-secondary text-secondary-foreground mt-0.5">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                    Audit trail <ChevronRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Historical analysis records, time-stamped decisions, and compliance logs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
