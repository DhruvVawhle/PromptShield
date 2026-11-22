"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  Play,
  Pause,
  Layers,
  ShieldCheck,
  Server,
  Cpu,
  Activity,
  GitMerge,
  Network,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PipelineStageKey =
  | "ingress"
  | "normalize"
  | "heuristics"
  | "scoring"
  | "policy"
  | "dispatch";

interface StageSpec {
  step: string;
  key: PipelineStageKey;
  title: string;
  subtitle: string;
  latencyMs: number;
  latency: string;
  icon: typeof Network;
  description: string;
  inputs: string[];
  outputs: string[];
  transformation: string;
  technicalDetails: string;
}

const PIPELINE_STAGES: Record<PipelineStageKey, StageSpec> = {
  ingress: {
    step: "01",
    key: "ingress",
    title: "Client Ingress & Auth Guard",
    subtitle: "Authentication & Rate Limiting",
    latencyMs: 1.2,
    latency: "1.2ms",
    icon: Network,
    description:
      "Intercepts incoming client requests via REST or OpenAI-compatible streaming endpoints. Validates Bearer tokens and checks tenant rate limits.",
    inputs: ["HTTP POST /api/ai", "Bearer JWT / API key", "Client IP & session metadata"],
    outputs: ["Verified tenant ID", "Rate limit tokens remaining", "Authorized session context"],
    transformation:
      "Extracts authorization header, checks Redis sliding-window token bucket (60 req/min), and verifies cryptographic signature before passing payload to memory.",
    technicalDetails:
      "Powered by Upstash Redis sliding-window algorithms and Firebase Admin SDK token verification. Unauthorized or rate-limited requests fail fast before token consumption.",
  },
  normalize: {
    step: "02",
    key: "normalize",
    title: "Canonicalization & Decoding",
    subtitle: "Input De-Obfuscation",
    latencyMs: 0.8,
    latency: "0.8ms",
    icon: RefreshCw,
    description:
      "Strips evasion vectors: zero-width Unicode smuggling, homoglyph substitutions, URL percent-encoding, and Base64/Hex encoding wrappers.",
    inputs: ["Raw string payload", "Prompt metadata"],
    outputs: ["Standardized UTF-8 text", "Resolved delimiters", "De-obfuscated characters"],
    transformation:
      "Replaces Unicode zero-width characters (\\u200B-\\u200D, \\uFEFF), normalizes homoglyphs to ASCII equivalents, and decodes nested Base64/Hex strings recursively.",
    technicalDetails:
      "Executes deterministic zero-width space stripping, recursive URI unquoting, and base64 detection to prevent obfuscation bypasses.",
  },
  heuristics: {
    step: "03",
    key: "heuristics",
    title: "Deterministic Heuristic Engine",
    subtitle: "50+ Signature Pattern Matchers",
    latencyMs: 2.5,
    latency: "2.5ms",
    icon: Cpu,
    description:
      "Evaluates the canonical prompt against 50+ deterministic security rules for instruction overrides, jailbreak personas, canary tokens, and PII leaks.",
    inputs: ["Canonicalized text", "Active rule catalog"],
    outputs: ["Matched rule violations", "Confidence weightings", "Threat categories"],
    transformation:
      "Runs multi-token regex boundary scans and morphological root stemming across instruction override delimiters and jailbreak markers.",
    technicalDetails:
      "Runs compiled V8 regular expressions and multi-token boundary analyzers. Matches high-risk triggers (e.g. system prompt extraction, DAN personas, SQL injection).",
  },
  scoring: {
    step: "04",
    key: "scoring",
    title: "Risk Aggregation & Scoring",
    subtitle: "Normalized Risk Matrix [0, 100]",
    latencyMs: 1.4,
    latency: "1.4ms",
    icon: Activity,
    description:
      "Aggregates individual rule weights into a deterministic composite risk score strictly bounded between 0 and 100.",
    inputs: ["Matched rule list", "Threat severities"],
    outputs: ["Risk score (0–100)", "Primary threat category", "Confidence index"],
    transformation:
      "Calculates non-linear severity aggregate: Critical (>=90), High (>=70), Medium (>=40). Ensures deterministic scoring without probabilistic hallucination.",
    technicalDetails:
      "Uses non-linear severity weighting: Critical rules automatically anchor score >= 90; High >= 70; Medium >= 40. Guarantees predictable, auditable scoring without model hallucinations.",
  },
  policy: {
    step: "05",
    key: "policy",
    title: "Policy Precedence Resolver",
    subtitle: "Strictest-Action-Wins Engine",
    latencyMs: 1.6,
    latency: "1.6ms",
    icon: GitMerge,
    description:
      "Applies tenant-configured guardrail policies. If rules or custom policy actions conflict, the engine enforces deterministic strictest-action-wins precedence.",
    inputs: ["Composite risk score", "Tenant policy configuration"],
    outputs: ["Final decision (ALLOW / WARN / SANITIZE / BLOCK)", "Sanitized payload (if viable)"],
    transformation:
      "Applies strict precedence order: BLOCK > SANITIZE > WARN > ALLOW. If sanitization is possible without residual threat, safely extracts benign clause.",
    technicalDetails:
      "Strict precedence hierarchy: BLOCK > SANITIZE > WARN > ALLOW. Mandatory security safeguards can never be overridden by loose custom policies.",
  },
  dispatch: {
    step: "06",
    key: "dispatch",
    title: "Enforcement & Provider Dispatch",
    subtitle: "Upstream Insulation & Audit",
    latencyMs: 4.8,
    latency: "4.8ms",
    icon: Server,
    description:
      "Enforces the decision. On BLOCK, terminates with 403 immediately (LLM is never contacted). On ALLOW/WARN, proxies request to upstream model and records audit logs.",
    inputs: ["Enforced decision", "Original / sanitized prompt"],
    outputs: ["Model response stream", "Tamper-proof audit record", "Security event telemetry"],
    transformation:
      "Opens Server-Sent Events (SSE) streaming tunnel to Groq / OpenAI; asynchronously writes HMAC-signed audit log to Cloud Firestore.",
    technicalDetails:
      "Zero-buffering Server-Sent Events (SSE) passthrough to upstream providers (Groq, OpenAI, Anthropic, Gemini, OmniRoute). Asynchronously records HMAC-signed audit logs in Firestore.",
  },
};

const STAGE_KEYS: PipelineStageKey[] = [
  "ingress",
  "normalize",
  "heuristics",
  "scoring",
  "policy",
  "dispatch",
];

export function ArchitectureClient() {
  const [activeStage, setActiveStage] = React.useState<PipelineStageKey>("ingress");
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(false);
  const [stageDetailTab, setStageDetailTab] = React.useState<"transformation" | "contract" | "implementation">("transformation");

  // Code integration builder state
  const [activeCodeLang, setActiveCodeLang] = React.useState<"typescript" | "python" | "curl">("typescript");
  const [selectedProvider, setSelectedProvider] = React.useState<"groq" | "openai" | "anthropic">("groq");
  const [enableStreaming, setEnableStreaming] = React.useState(true);
  const [copiedCode, setCopiedCode] = React.useState(false);

  // Topology active tier state
  const [activeTier, setActiveTier] = React.useState<number>(2);

  const stageSpec = PIPELINE_STAGES[activeStage];
  const stageIndex = STAGE_KEYS.indexOf(activeStage);

  // Auto-play pipeline tracer
  React.useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStage((prev) => {
        const nextIdx = (STAGE_KEYS.indexOf(prev) + 1) % STAGE_KEYS.length;
        return STAGE_KEYS[nextIdx]!;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleNextStage = () => {
    const nextIdx = (stageIndex + 1) % STAGE_KEYS.length;
    setActiveStage(STAGE_KEYS[nextIdx]!);
  };

  const handlePrevStage = () => {
    const prevIdx = (stageIndex - 1 + STAGE_KEYS.length) % STAGE_KEYS.length;
    setActiveStage(STAGE_KEYS[prevIdx]!);
  };

  // Dynamic code snippet generator based on user's interactive selections
  const dynamicCode = React.useMemo(() => {
    const model =
      selectedProvider === "groq"
        ? "qwen/qwen3.8-27b"
        : selectedProvider === "openai"
          ? "gpt-4o"
          : "claude-3-5-sonnet-20241022";

    if (activeCodeLang === "typescript") {
      return `import OpenAI from "openai";

// Drop-in reverse proxy integration
const client = new OpenAI({
  baseURL: "https://api.promptshield.dev/v1",
  apiKey: process.env.PROMPTSHIELD_API_KEY,
  defaultHeaders: {
    "X-Upstream-Provider": "${selectedProvider}",
  },
});

async function main() {
  try {
    const response = await client.chat.completions.create({
      model: "${model}",
      messages: [{ role: "user", content: "Summarize this quarterly report." }],
      stream: ${enableStreaming},
    });

    ${
      enableStreaming
        ? `for await (const chunk of response) {
      process.stdout.write(chunk.choices[0]?.delta?.content || "");
    }`
        : `console.log("Response:", response.choices[0]?.message?.content);`
    }
  } catch (error: any) {
    // Fails closed on HTTP 403 Forbidden with security decision telemetry
    console.error("Blocked by PromptShield:", error.status, error.message);
  }
}

main();`;
    }

    if (activeCodeLang === "python") {
      return `from openai import OpenAI
import os

# Point standard OpenAI client to PromptShield Gateway
client = OpenAI(
    base_url="https://api.promptshield.dev/v1",
    api_key=os.environ.get("PROMPTSHIELD_API_KEY"),
    default_headers={"X-Upstream-Provider": "${selectedProvider}"},
)

try:
    response = client.chat.completions.create(
        model="${model}",
        messages=[{"role": "user", "content": "Summarize this quarterly report."}],
        stream=${enableStreaming ? "True" : "False"},
    )
    ${
      enableStreaming
        ? `for chunk in response:
        content = chunk.choices[0].delta.content or ""
        print(content, end="", flush=True)`
        : `print("Response:", response.choices[0].message.content)`
    }
except Exception as e:
    # Captures X-Security-Decision and X-Security-Risk-Score
    print("Security policy enforced:", e)`;
    }

    return `# REST API / cURL — Transparent Inspection
curl -X POST "https://api.promptshield.dev/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_PROMPTSHIELD_KEY" \\
  -H "X-Upstream-Provider: ${selectedProvider}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Analyze quarterly customer metrics."}],
    "stream": ${enableStreaming}
  }'

# Response Headers:
# HTTP/1.1 200 OK
# X-Security-Decision: ALLOW
# X-Security-Risk-Score: 4
# X-PromptShield-Latency: 11.4ms`;
  }, [activeCodeLang, selectedProvider, enableStreaming]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText?.(dynamicCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const cumulativeLatency = React.useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= stageIndex; i++) {
      sum += PIPELINE_STAGES[STAGE_KEYS[i]!].latencyMs;
    }
    return sum.toFixed(1);
  }, [stageIndex]);

  return (
    <div className="w-full pb-24 pt-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION */}
        {/* ========================================================================= */}
        <header className="border-b border-border pb-14">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Architecture specification · Transparent reverse-proxy topology</span>
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.1]">
            Reverse-proxy architecture for large language models
          </h1>

          <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
            PromptShield operates as an inline reverse proxy between client applications and large language model providers. It terminates TLS, normalizes inputs, detects adversarial patterns, enforces tenant policies, and streams responses with sub-15ms median proxy overhead.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#pipeline-tracer"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            >
              <Activity className="h-4 w-4" />
              <span>Interactive Pipeline Tracer</span>
            </a>
            <a
              href="#topology-explorer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>3-Tier Topology</span>
            </a>
            <Link
              href="/security"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span>Security Threat Model</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. INTERACTIVE 6-STAGE PIPELINE TRACER */}
        {/* ========================================================================= */}
        <section id="pipeline-tracer" className="border-b border-border py-16 scroll-mt-24">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                Live Execution Simulator
              </span>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                6-stage request pipeline tracer
              </h2>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                Trace a simulated prompt packet through each discrete stage of the gateway pipeline. Watch input normalization, AST regex matching, and strict precedence resolution in action.
              </p>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isAutoPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause Tracer</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Auto-Trace Pipeline</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePrevStage}
                className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="Previous stage"
              >
                ←
              </button>
              <button
                type="button"
                onClick={handleNextStage}
                className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="Next stage"
              >
                →
              </button>
            </div>
          </div>

          {/* Interactive Pipeline Step Selector Bar */}
          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="tablist">
            {STAGE_KEYS.map((key, idx) => {
              const stage = PIPELINE_STAGES[key];
              const isActive = activeStage === key;
              const isPast = idx < stageIndex;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setActiveStage(key);
                  }}
                  className={cn(
                    "flex flex-col rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : isPast
                        ? "border-border bg-surface-subtle text-foreground"
                        : "border-border bg-surface text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-surface-subtle"
                  )}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span>{stage.step}</span>
                    <span>{stage.latency}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-tight line-clamp-1">
                    {stage.title}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Pipeline Stage Detailed State Box */}
          <div className="mt-6 rounded-lg border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between border-b border-border px-6 py-4">
              <div>
                <span className="font-mono text-sm font-bold text-foreground">
                  Stage {stageSpec.step}: {stageSpec.title}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {stageSpec.subtitle}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                <span>Stage Latency: <strong className="text-foreground">{stageSpec.latency}</strong></span>
                <span>·</span>
                <span>Cumulative: <strong className="text-foreground">{cumulativeLatency}ms</strong></span>
              </div>
            </div>

            {/* Sub-tab view toggles */}
            <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-6 py-2">
              <span className="text-xs text-muted-foreground mr-1">Inspect:</span>
              {[
                { id: "transformation", label: "Packet Transformation" },
                { id: "contract", label: "Data In/Out Contract" },
                { id: "implementation", label: "V8 Implementation" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStageDetailTab(tab.id as any)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                    stageDetailTab === tab.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Stage Content Pane */}
            <div className="p-6 sm:p-8">
              {stageDetailTab === "transformation" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    In-Flight Packet Mutation at Stage {stageSpec.step}
                  </h3>
                  <div className="rounded-md border border-border bg-surface-subtle p-4 font-mono text-xs leading-relaxed text-foreground">
                    {stageSpec.transformation}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {stageSpec.description}
                  </p>
                </div>
              )}

              {stageDetailTab === "contract" && (
                <div className="grid gap-6 sm:grid-cols-2 font-mono text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Input Parameters
                    </span>
                    <ul className="mt-2 space-y-1.5">
                      {stageSpec.inputs.map((inp) => (
                        <li key={inp} className="flex items-center gap-2 text-foreground">
                          <span className="text-muted-foreground">→</span>
                          <span>{inp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Output Artifacts
                    </span>
                    <ul className="mt-2 space-y-1.5">
                      {stageSpec.outputs.map((out) => (
                        <li key={out} className="flex items-center gap-2 text-foreground">
                          <Check className="h-3 w-3 text-foreground shrink-0" />
                          <span>{out}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {stageDetailTab === "implementation" && (
                <div className="space-y-3 font-mono text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Technical Specifications & Runtime Invariants
                  </span>
                  <div className="rounded-md border border-border bg-surface-subtle p-4 leading-relaxed text-foreground">
                    {stageSpec.technicalDetails}
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Engineered without external microservice hops to guarantee sub-15ms median proxy overhead.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. INTERACTIVE 3-TIER TOPOLOGY EXPLORER */}
        {/* ========================================================================= */}
        <section id="topology-explorer" className="border-b border-border py-16 scroll-mt-24">
          <div>
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              Infrastructure Blueprint
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              End-to-end system topology
            </h2>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
              Select any tier to inspect its architectural responsibilities, protocols, and failover behavior.
            </p>
          </div>

          {/* Tier Tabs */}
          <div className="mt-8 flex flex-wrap gap-2" role="tablist">
            {[
              { id: 1, label: "Tier 1: Client Ingress" },
              { id: 2, label: "Tier 2: PromptShield Gateway Core" },
              { id: 3, label: "Tier 3: Inference & Audit Plane" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTier === t.id}
                onClick={() => setActiveTier(t.id)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  activeTier === t.id
                    ? "bg-foreground text-background"
                    : "border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-subtle"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Active Tier Interactive Card */}
          <div className="mt-6 rounded-lg border border-border bg-surface p-6 sm:p-8">
            {activeTier === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-mono text-xs font-bold text-foreground">
                    TIER 1 · CLIENT APPLICATION PLANE
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Protocols: HTTP/2 · TLS 1.3 · SSE
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your web applications, autonomous agent workflows (LangChain, LlamaIndex, CrewAI), and backend microservices send prompts to the gateway using standard OpenAI SDK clients or direct REST endpoints.
                </p>
                <div className="grid gap-3 sm:grid-cols-3 font-mono text-xs pt-2">
                  <div className="rounded-md border border-border bg-surface-subtle p-3">
                    <p className="font-semibold text-foreground">Web Frontends</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Direct streaming chat apps with JWT auth</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-subtle p-3">
                    <p className="font-semibold text-foreground">Agent Orchestrators</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Autonomous agents & function calling</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-subtle p-3">
                    <p className="font-semibold text-foreground">Enterprise Microservices</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Internal APIs authenticated via API keys</p>
                  </div>
                </div>
              </div>
            )}

            {activeTier === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-mono text-xs font-bold text-foreground">
                    TIER 2 · PROMPTSHIELD GATEWAY CORE
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Runtime: Node.js V8 Engine · Upstash Redis
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The high-throughput reverse proxy gateway terminates TLS, validates JWT bearer tokens, checks Redis rate limit sliding windows, executes AST normalizers, scans 50+ heuristic patterns, and resolves policy precedence.
                </p>
                <div className="grid gap-3 sm:grid-cols-3 font-mono text-xs pt-2">
                  <div className="rounded-md border border-border bg-surface-subtle p-3">
                    <p className="font-semibold text-foreground">Authentication & Limits</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Token revocation checks & sliding windows</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-subtle p-3">
                    <p className="font-semibold text-foreground">Heuristic Matcher</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">50+ compiled regexes & root stemmers</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-subtle p-3">
                    <p className="font-semibold text-foreground">Policy Precedence</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">BLOCK &gt; SANITIZE &gt; WARN &gt; ALLOW</p>
                  </div>
                </div>
              </div>
            )}

            {activeTier === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-mono text-xs font-bold text-foreground">
                    TIER 3 · INFERENCE & AUDIT PLANE
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Providers: Groq, OpenAI, Anthropic · Cloud Firestore
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Blocked requests are terminated immediately at Tier 2 with HTTP 403 Forbidden without incurring upstream token costs. Only safe or sanitized prompts pass through to Groq LPUs or target LLM APIs. Every security decision is logged with an HMAC cryptographic signature.
                </p>
                <div className="grid gap-3 sm:grid-cols-3 font-mono text-xs pt-2">
                  <div className="rounded-md border border-border bg-surface-subtle p-3">
                    <p className="font-semibold text-foreground">Groq LPU Engine</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Ultra-fast token streaming (qwen3.8-27b)</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-subtle p-3">
                    <p className="font-semibold text-foreground">Upstream LLM Providers</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">OpenAI, Anthropic, Gemini, local vLLM</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-subtle p-3">
                    <p className="font-semibold text-foreground">Firestore HMAC Audit</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Tamper-proof tenant event records</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. INTERACTIVE 2-LINE DROP-IN SDK PLAYGROUND */}
        {/* ========================================================================= */}
        <section className="border-b border-border py-16">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                Developer Integration Playground
              </span>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                2-line drop-in SDK blueprint
              </h2>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                Customize parameters below to generate live integration code for your target model provider, language, and streaming mode.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {copiedCode ? (
                <>
                  <Check className="h-3.5 w-3.5 text-foreground" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Parameters Bar */}
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-md border border-border bg-surface-subtle p-3 text-xs">
            {/* Language */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Language:</span>
              {(["typescript", "python", "curl"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveCodeLang(lang)}
                  className={cn(
                    "rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors",
                    activeCodeLang === lang
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>

            <span className="text-border">|</span>

            {/* Target Provider */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Provider:</span>
              {(["groq", "openai", "anthropic"] as const).map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setSelectedProvider(prov)}
                  className={cn(
                    "rounded px-2 py-0.5 font-mono text-[11px] font-semibold uppercase transition-colors",
                    selectedProvider === prov
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {prov}
                </button>
              ))}
            </div>

            <span className="text-border">|</span>

            {/* Streaming Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Streaming:</span>
              <button
                type="button"
                onClick={() => setEnableStreaming(!enableStreaming)}
                className={cn(
                  "rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors",
                  enableStreaming
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground"
                )}
              >
                {enableStreaming ? "Stream: true (SSE)" : "Stream: false (JSON)"}
              </button>
            </div>
          </div>

          {/* Dynamic Code Display */}
          <div className="mt-4 rounded-lg border border-border bg-surface p-4 sm:p-6 font-mono text-xs leading-relaxed text-foreground overflow-x-auto">
            <pre>
              <code>{dynamicCode}</code>
            </pre>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. ARCHITECTURAL COMPARISON MATRIX */}
        {/* ========================================================================= */}
        <section className="border-b border-border py-16">
          <div>
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              Strategic Evaluation
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Architectural comparison
            </h2>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
              A comparative evaluation between inline reverse-proxy gateways, client-side SDK guardrails, and system prompt wrapping.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground font-semibold">
                  <th className="py-3.5 pr-6 font-medium">Security Requirement</th>
                  <th className="px-6 py-3.5 font-semibold text-foreground">
                    PromptShield Gateway
                  </th>
                  <th className="px-6 py-3.5 font-medium text-muted-foreground">
                    Client SDKs / Guardrails
                  </th>
                  <th className="pl-6 py-3.5 font-medium text-muted-foreground">
                    System Prompt Wrapping
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {[
                  {
                    req: "Tamper-proof execution",
                    ps: "Server-side proxy; cannot be bypassed by client app tampering",
                    sdk: "Vulnerable to client-side code modification or bypass",
                    wrap: "Vulnerable to direct instruction override and jailbreaks",
                  },
                  {
                    req: "API key and credential insulation",
                    ps: "Keys reside on the proxy gateway; never shipped to clients",
                    sdk: "Requires distributing credentials to client applications",
                    wrap: "Vulnerable to system prompt leakage and exfiltration",
                  },
                  {
                    req: "Zero upstream LLM cost on block",
                    ps: "Terminated in sub-15ms; zero model tokens billed",
                    sdk: "Model is frequently invoked before client filter runs",
                    wrap: "Full token costs incurred even on malicious queries",
                  },
                  {
                    req: "Model-agnostic policy enforcement",
                    ps: "Central policy rules apply uniformly across all providers",
                    sdk: "Must be re-implemented per SDK and language runtime",
                    wrap: "Fragile; re-prompting needed per model revision",
                  },
                  {
                    req: "Immutable compliance audit trail",
                    ps: "Every request is cryptographically hashed and logged",
                    sdk: "Requires dedicated external logging infrastructure",
                    wrap: "Zero native audit logging or verification mechanisms",
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-surface-subtle">
                    <td className="py-4 pr-6 font-medium text-foreground">{row.req}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-foreground shrink-0" />
                        <span>{row.ps}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground leading-relaxed">
                      {row.sdk}
                    </td>
                    <td className="pl-6 py-4 text-xs text-muted-foreground leading-relaxed">
                      {row.wrap}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. CALL TO ACTION */}
        {/* ========================================================================= */}
        <footer className="pt-16">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Deploy PromptShield in your pipeline
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure your upstream proxy endpoint in under two minutes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
              >
                Get Started
              </Link>
              <Link
                href="/security"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span>Security Model</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
