"use client";

import * as React from "react";
import { 
  Shield, 
  Search, 
  ShieldCheck, 
  BarChart3, 
  Send, 
  Lightbulb, 
  ChevronRight, 
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Panel } from "@/components/ui/panel";
import { MessageLoading } from "@/components/ui/message-loading";
import Link from "next/link";
import { checkPrompt } from "@/lib/promptCheck";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

export function ChatClient() {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const messagesRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSubmit = async (overrideText?: string) => {
    const textToSubmit = overrideText ?? draft;
    const trimmed = textToSubmit.trim();
    if (!trimmed || isProcessing) return;

    setDraft("");
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // Run security analysis first
    const securityCheck = checkPrompt(trimmed);
    if (!securityCheck.ok) {
      setMessages(prev => [
        ...prev, 
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ Blocked by PromptShield\n\n**${securityCheck.heading}**\n${securityCheck.reason}`,
          error: true,
        }
      ]);
      setIsProcessing(false);
      return;
    }

    try {
      const token = await user?.getIdToken() || "";
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Failed to get AI response.");
      }

      const assistantMessageId = crypto.randomUUID();
      
      setMessages(prev => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        }
      ]);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream not available");
      const decoder = new TextDecoder();
      
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fullContent += decoder.decode(value, { stream: true });
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullContent } 
              : msg
          )
        );
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err.message || "An error occurred while contacting the AI provider.",
          error: true,
        }
      ]);
    } finally {
      setIsProcessing(false);
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
              Get answers about AI security, analyze prompts, understand threats, and learn best practices.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
              SECURE BY DEFAULT
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              POWERED BY PROMPTSHIELD
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
              onClick={() => submitExample("Analyze this prompt for security risks: [Paste prompt here]")}
              className="group text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all flex flex-col gap-3 shadow-sm h-full"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 w-fit group-hover:bg-blue-500/20 transition-colors">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Analyze prompts</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">Check if a prompt is safe and understand risks</p>
              </div>
            </button>
            <button 
              onClick={() => submitExample("Explain my security policies")}
              className="group text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all flex flex-col gap-3 shadow-sm h-full"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit group-hover:bg-emerald-500/20 transition-colors">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Policy questions</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">Learn about your security policies</p>
              </div>
            </button>
            <button 
              onClick={() => submitExample("What are the common AI threats?")}
              className="group text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all flex flex-col gap-3 shadow-sm h-full"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 w-fit group-hover:bg-amber-500/20 transition-colors">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Threat insights</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">Understand threats and mitigation strategies</p>
              </div>
            </button>
          </div>

          {/* Chat Workspace */}
          <Panel className="flex flex-col flex-1 h-[600px] border-primary/10 shadow-sm bg-card overflow-hidden">
            <div 
              ref={messagesRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col h-full justify-center pb-10">
                  <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                        <Shield className="h-4 w-4" />
                      </div>
                      <h2 className="font-semibold text-foreground">PromptShield Assistant</h2>
                    </div>
                    
                    <div className="bg-muted/30 border border-border rounded-2xl rounded-tl-sm p-4 text-sm text-foreground max-w-[85%] shadow-sm leading-relaxed space-y-4">
                      <p>Hello! I&apos;m PromptShield&apos;s AI Security Assistant.</p>
                      <p>I can help you analyze prompts, explain security risks, review policies, and answer questions about AI security.</p>
                      <p>How can I help you today?</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {[
                        "Analyze this prompt for security risks",
                        "Explain prompt injection",
                        "Show my security policies",
                        "Best practices for safe prompting"
                      ].map(chip => (
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
                  {messages.map(msg => (
                    <div key={msg.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                      {msg.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm mr-3 mt-1">
                          <Shield className="h-4 w-4" />
                        </div>
                      )}
                      
                      <div 
                        className={cn(
                          "px-4 py-3 text-sm shadow-sm",
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm max-w-[75%]" 
                            : msg.error 
                              ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl rounded-tl-sm max-w-[85%] whitespace-pre-wrap"
                              : "bg-muted/30 border border-border text-foreground rounded-2xl rounded-tl-sm max-w-[85%] whitespace-pre-wrap leading-relaxed"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  
                  {isProcessing && (
                    <div className="flex w-full justify-start animate-in fade-in">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm mr-3 mt-1">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="px-5 py-4 bg-muted/30 border border-border rounded-2xl rounded-tl-sm shadow-sm flex items-center justify-center min-w-[80px]">
                        <MessageLoading />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="p-4 bg-card border-t border-border">
              <div className="relative flex items-end gap-2 bg-muted/30 border border-border rounded-xl p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-shadow">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about AI security..."
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm py-3 px-3 leading-relaxed text-foreground placeholder:text-muted-foreground"
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
              <div className="mt-2 text-center">
                <p className="text-[11px] text-muted-foreground">
                  PromptShield analyzes your questions for security and provides safe, helpful responses.
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
                "Is this prompt safe to use?",
                "What is prompt injection?",
                "How do I protect sensitive data?",
                "Explain my security policies",
                "What are the common AI threats?"
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
                href="/analyze"
                className="flex items-center justify-between w-full px-5 py-3 hover:bg-muted/50 transition-colors border-b border-border/60 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                    <Search className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Analyze a prompt</span>
                    <span className="text-[11px] text-muted-foreground">Check for security risks</span>
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
                    <span className="text-[11px] text-muted-foreground">See active policies</span>
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
                    <span className="text-[11px] text-muted-foreground">Check latest incidents</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </Link>

              <button
                onClick={() => submitExample("What are the best practices for safe prompting?")}
                className="flex items-center justify-between w-full px-5 py-3 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-foreground">Learn best practices</span>
                    <span className="text-[11px] text-muted-foreground">Get security guidance</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </button>
            </div>
          </Panel>

          {/* Security Info Card */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="font-semibold text-sm">Your conversations are secure</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Questions are evaluated locally for basic security risks before being sent to the configured AI provider. Local chat history is ephemeral and not permanently stored in the database.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
