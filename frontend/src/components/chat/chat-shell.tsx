"use client"

import * as React from "react"
import { Check, ChevronRight, Copy, Info, RefreshCcw, Shield, ShieldCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ChatInput } from "@/components/chat/chat-input"
import { BlockedMessage } from "@/components/chat/blocked-message"
import { SecurityStatus, type SecurityDecision, type SecurityRisk } from "@/components/chat/security-status"
import { MessageLoading } from "@/components/ui/message-loading"

const analysisLabels = [
  "Analyzing prompt",
  "Checking injection patterns",
  "Evaluating risk",
  "Applying security policy",
]

type DemoMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  decision?: SecurityDecision
  risk?: SecurityRisk
  categories?: string[]
  signals?: string[]
  blocked?: boolean
}

function getSecurityOutcome(prompt: string) {
  const lower = prompt.toLowerCase()

  if (
    lower.includes("ignore previous") ||
    lower.includes("reveal the system prompt") ||
    lower.includes("developer instructions") ||
    lower.includes("override system") ||
    lower.includes("bypass security")
  ) {
    return {
      decision: "BLOCK" as const,
      risk: "Critical" as const,
      categories: ["Prompt Injection"],
      signals: [
        "Instruction override attempt",
        "Policy conflict detected",
        "Security boundary violation",
      ],
      blocked: true,
      text:
        "PromptShield detected a prompt-injection attempt and blocked the request before it reached the model. The security layer prevented the instruction override from crossing the trust boundary.",
    }
  }

  if (
    lower.includes("jailbreak") ||
    lower.includes("bypass") ||
    lower.includes("hidden prompt") ||
    lower.includes("act as")
  ) {
    return {
      decision: "WARN" as const,
      risk: "Medium" as const,
      categories: ["Jailbreak Attempt"],
      signals: [
        "Role manipulation pattern",
        "Safety override language",
        "Review recommended before execution",
      ],
      blocked: false,
      text:
        "This request contains suspicious instruction patterns, but the intent remains interpretable. PromptShield recommends a manual review before execution.",
    }
  }

  if (
    lower.includes("sanitize") ||
    lower.includes("remove") ||
    lower.includes("rewrite") ||
    lower.includes("confidential")
  ) {
    return {
      decision: "SANITIZE" as const,
      risk: "High" as const,
      categories: ["Sensitive Information Attempt"],
      signals: [
        "Sensitive-data extraction pattern",
        "Unsafe instruction detected",
        "Safe intent can be preserved through sanitization",
      ],
      blocked: false,
      text:
        "PromptShield identified risky content and applied a sanitized version while preserving the user’s legitimate task. The request remains operational, but the unsafe portion was rewritten before execution.",
    }
  }

  return {
    decision: "ALLOW" as const,
    risk: "Low" as const,
    categories: ["Routine Request"],
    signals: ["No injection indicators detected", "Routine policy evaluation passed"],
    blocked: false,
    text:
      "The prompt passed the security evaluation and remains within the expected policy boundaries for normal LLM usage.",
  }
}

function ThinkingIndicator({ step }: { step: number }) {
  const currentLabel = analysisLabels[step % analysisLabels.length]

  return (
    <div className="max-w-[92%] animate-reveal" aria-live="polite" aria-atomic="true">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
          <MessageLoading />
        </span>
        PromptShield
      </div>

      <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
            <MessageLoading />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{currentLabel}</p>
            <p className="text-sm text-muted-foreground">PromptShield is evaluating the request.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChatShell() {
  const [messages, setMessages] = React.useState<DemoMessage[]>([])
  const [draft, setDraft] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isThinking, setIsThinking] = React.useState(false)
  const [analysisStep, setAnalysisStep] = React.useState(0)
  const messagesRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null)

  React.useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, isThinking, analysisStep])

  React.useEffect(() => {
    if (!isThinking) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setAnalysisStep((step) => step + 1)
    }, 1200)

    return () => window.clearInterval(timer)
  }, [isThinking])

  const focusInput = () => {
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const handleSubmit = () => {
    const trimmed = draft.trim()
    if (!trimmed || isProcessing) {
      return
    }

    const userMessage: DemoMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    }

    setMessages((current) => [...current, userMessage])
    setDraft("")
    setAnalysisStep(0)
    setIsProcessing(true)
    setIsThinking(true)

    window.setTimeout(() => {
      const outcome = getSecurityOutcome(trimmed)
      const assistantMessage: DemoMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: outcome.text,
        decision: outcome.decision,
        risk: outcome.risk,
        categories: outcome.categories,
        signals: outcome.signals,
        blocked: outcome.blocked,
      }

      setMessages((current) => [...current, assistantMessage])
      setIsThinking(false)
      setIsProcessing(false)
    }, 2200)
  }

  const showEmptyState = messages.length === 0 && !isThinking && !isProcessing

  return (
    <div className="min-h-screen bg-page text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 py-4 sm:px-4 lg:px-6">
        <header className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted text-foreground shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">PromptShield AI</p>
              <h1 className="text-sm font-semibold tracking-tight text-foreground">Security Workspace</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="hidden sm:inline-flex">
              <Sparkles className="h-3.5 w-3.5" />
              Analyze
            </Button>
            <Button variant="ghost" size="icon" aria-label="Security info">
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-border bg-surface/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div
            ref={messagesRef}
            className="chat-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:px-5 lg:px-6"
            role="log"
            aria-live="polite"
            aria-label="PromptShield conversation"
          >
            {showEmptyState ? (
              <div className="flex h-full items-center justify-center px-4 py-10">
                <div className="max-w-xl animate-reveal text-center">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
                    Secure every prompt
                  </div>

                  <h2 className="text-3xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">Secure every prompt.</h2>
                  <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                    Understand every response.
                  </p>

                  <div className="mt-7 flex justify-center">
                    <Button type="button" onClick={focusInput} className="gap-2 rounded-xl px-4 py-2.5 text-sm font-medium">
                      Start a conversation
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 pb-2">
                {messages.map((message) => {
                  if (message.role === "user") {
                    return (
                      <div key={message.id} className="flex justify-end animate-reveal">
                        <div className="max-w-[82%] rounded-2xl border border-border bg-secondary px-4 py-3 text-sm leading-6 text-foreground shadow-sm">
                          {message.content}
                        </div>
                      </div>
                    )
                  }

                  if (message.blocked) {
                    return (
                      <div key={message.id} className="max-w-[92%] animate-reveal">
                        <BlockedMessage category={message.categories?.[0] ?? "Prompt Injection"} risk={message.risk ?? "High"} />
                      </div>
                    )
                  }

                  return (
                    <div key={message.id} className="max-w-[92%] animate-reveal">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </span>
                        PromptShield
                      </div>

                      <div className="rounded-[24px] border border-border bg-background/80 p-4 shadow-sm">
                        <p className="text-sm leading-7 text-foreground">{message.content}</p>

                        {message.decision && message.risk && message.categories && message.signals && (
                          <div className="mt-4">
                            <SecurityStatus
                              decision={message.decision}
                              risk={message.risk}
                              categories={message.categories}
                              signals={message.signals}
                            />
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-1.5 transition-colors hover:bg-secondary"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-1.5 transition-colors hover:bg-secondary"
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            Regenerate
                          </button>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-1.5">
                            <Check className="h-3.5 w-3.5 text-status-allow" />
                            Security decision set
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {isThinking && <ThinkingIndicator step={analysisStep} />}
          </div>

          <div className="border-t border-border bg-surface/90 px-3 py-3 sm:px-5 lg:px-6">
            <ChatInput value={draft} onChange={setDraft} onSubmit={handleSubmit} disabled={isProcessing} inputRef={inputRef} />
          </div>
        </main>
      </div>
    </div>
  )
}
