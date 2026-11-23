import { NextResponse } from "next/server";
import { getSafeGroqMessage } from "@/lib/groq";
import { authenticateAndAuthorize } from "@/lib/server/rbac";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/server/rate-limiter";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateAndAuthorize(request, "ai:infer");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const uid = authResult.uid;

    // Protect expensive AI inference operations with strict rate limiting
    const rateLimitRes = await enforceRateLimit(uid, "AI_INFERENCE");
    if (!rateLimitRes.success) {
      const responseHeaders = getRateLimitHeaders(rateLimitRes);
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
        { status: 429, headers: responseHeaders }
      );
    }
    const body = (await request.json().catch(() => ({}))) as {
      prompt?: string;
      model?: string;
      provider?: string;
      search?: boolean;
      messages?: Array<{ role?: string; content?: string }>;
    };

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : Array.isArray(body.messages) && body.messages.length > 0
          ? body.messages
            .map((message) => message.content ?? "")
            .join("\n")
            .trim()
          : "";

    if (!prompt) {
      return NextResponse.json(
        { error: { code: "INVALID_PROMPT", message: "A valid prompt is required." } },
        { status: 400 }
      );
    }

    if (prompt.length > 5000) {
      return NextResponse.json(
        { error: { code: "PROMPT_TOO_LONG", message: "Prompt exceeds maximum allowed length of 5000 characters." } },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Phase 2: Server-side Security Analysis
    const { analyzePromptServer } = await import("@/lib/server/security-engine");
    const { persistSecurityEvent } = await import("@/lib/server/persistence");
    const { getActivePolicyForUser } = await import("@/lib/server/policy-manager");

    const policy = await getActivePolicyForUser(uid);
    const analysisResult = await analyzePromptServer(prompt, policy);

    // Persist event to Firestore for strict auditing
    await persistSecurityEvent(uid, analysisResult, prompt);

    if (analysisResult.decision === "BLOCK") {
      return NextResponse.json(
        {
          error: {
            code: "SECURITY_BLOCK",
            message: "Prompt was blocked by security policies.",
            details: analysisResult
          }
        },
        { status: 403 }
      );
    }

    // Determine the safe prompt to send to the provider
    let finalPrompt = prompt;
    if (analysisResult.decision === "SANITIZE" && analysisResult.sanitizedPrompt) {
      finalPrompt = analysisResult.sanitizedPrompt;
    }

    // Phase 2.3: Cross-Chat Persistent Memory & Context Directives
    const { handleMemoryIntent, getUserMemories, buildMemorySystemPrompt } = await import("@/lib/server/memory");
    const memoryResult = await handleMemoryIntent(finalPrompt, uid, body.messages);

    if (memoryResult.handled && memoryResult.response) {
      const latencyMs = Date.now() - startTime;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(memoryResult.response));
          controller.close();
        },
      });

      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", "text/plain; charset=utf-8");
      responseHeaders.set("X-Security-Decision", analysisResult.decision);
      responseHeaders.set("X-Security-Risk-Score", analysisResult.riskScore.toString());
      responseHeaders.set(
        "X-Security-Risk-Level",
        analysisResult.riskLevel ||
          (analysisResult.riskScore > 75
            ? "CRITICAL"
            : analysisResult.riskScore > 50
            ? "HIGH"
            : analysisResult.riskScore > 20
            ? "MEDIUM"
            : "LOW")
      );
      responseHeaders.set("X-Security-Policy", policy?.name || "Default Guardrail Policy");
      responseHeaders.set("X-AI-Provider", "PromptShield Memory Engine");
      responseHeaders.set("X-Memory-Action", memoryResult.action || "MEMORY");
      responseHeaders.set("X-Response-Time-Ms", latencyMs.toString());
      responseHeaders.set(
        "Access-Control-Expose-Headers",
        "X-Security-Decision, X-Security-Risk-Score, X-Security-Risk-Level, X-Security-Policy, X-Security-Categories, X-Sanitized-Prompt, X-AI-Provider, X-AI-Model, X-AI-Routing-Reason, X-Response-Time-Ms, X-Web-Search, X-Web-Search-Results, X-Memory-Action, X-Memory-Active"
      );

      return new Response(stream, {
        status: 200,
        headers: responseHeaders,
      });
    }

    // Load active persistent memories for context grounding
    const userMemories = await getUserMemories(uid);
    const memorySystemPrompt = buildMemorySystemPrompt(userMemories);

    // Phase 2.5: Real-time Internet Web Search Grounding
    // Automatically triggers if search is requested OR if recency/live-data keywords are detected
    const { isCurrentDataQuery } = await import("@/lib/server/providers/hybrid-provider");
    const shouldSearch = body.search === true || isCurrentDataQuery(finalPrompt);

    let searchResultCount = 0;
    if (shouldSearch) {
      try {
        const { performWebSearch, buildSearchAugmentedPrompt } = await import("@/lib/server/web-search");
        const searchResults = await performWebSearch(finalPrompt);
        if (searchResults.length > 0) {
          searchResultCount = searchResults.length;
          finalPrompt = buildSearchAugmentedPrompt(finalPrompt, searchResults);
        }
      } catch (searchErr) {
        console.warn("[WebSearch] Search retrieval failed, falling back to direct model knowledge:", searchErr);
      }
    }

    // Phase 3: Invoke Modular AI Provider (Hybrid Groq + Gemini Engine)
    const { getProvider } = await import("@/lib/server/providers");
    type ProviderMessages = import("@/lib/server/providers").ChatMessage[];
    const provider = getProvider(body.provider);
    const providerResponse = await provider.streamChatCompletion(finalPrompt, {
      model: body.model,
      signal: request.signal,
      systemInstruction: memorySystemPrompt || undefined,
      messages: (body.messages as ProviderMessages) || undefined,
    });
    const latencyMs = Date.now() - startTime;

    const responseHeaders = new Headers(providerResponse.headers);
    responseHeaders.set("X-Security-Decision", analysisResult.decision);
    responseHeaders.set("X-Security-Risk-Score", analysisResult.riskScore.toString());
    responseHeaders.set(
      "X-Security-Risk-Level",
      analysisResult.riskLevel ||
        (analysisResult.riskScore > 75
          ? "CRITICAL"
          : analysisResult.riskScore > 50
          ? "HIGH"
          : analysisResult.riskScore > 20
          ? "MEDIUM"
          : "LOW")
    );
    responseHeaders.set("X-Security-Policy", policy?.name || "Default Guardrail Policy");
    if (analysisResult.categories && analysisResult.categories.length > 0) {
      responseHeaders.set("X-Security-Categories", analysisResult.categories.join(", "));
    }
    if (analysisResult.decision === "SANITIZE" && analysisResult.sanitizedPrompt) {
      responseHeaders.set("X-Sanitized-Prompt", encodeURIComponent(analysisResult.sanitizedPrompt));
    }
    if (searchResultCount > 0) {
      responseHeaders.set("X-Web-Search", "enabled");
      responseHeaders.set("X-Web-Search-Results", searchResultCount.toString());
    }
    if (userMemories.length > 0) {
      responseHeaders.set("X-Memory-Active", userMemories.length.toString());
    }
    if (!responseHeaders.has("X-AI-Provider")) {
      responseHeaders.set("X-AI-Provider", provider.name || "AI Engine");
    }
    responseHeaders.set("X-Response-Time-Ms", latencyMs.toString());
    responseHeaders.set(
      "Access-Control-Expose-Headers",
      "X-Security-Decision, X-Security-Risk-Score, X-Security-Risk-Level, X-Security-Policy, X-Security-Categories, X-Sanitized-Prompt, X-AI-Provider, X-AI-Model, X-AI-Routing-Reason, X-Response-Time-Ms, X-Web-Search, X-Web-Search-Results, X-Memory-Action, X-Memory-Active"
    );

    return new Response(providerResponse.body, {
      status: providerResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const safeMessage = (error as Error)?.message || getSafeGroqMessage(error);
    const code = (error as Error & { code?: string })?.code ?? "PROVIDER_ERROR";
    const status = (error as Error & { status?: number })?.status ?? 502;

    return NextResponse.json(
      { error: { code, message: safeMessage } },
      { status }
    );
  }
}
