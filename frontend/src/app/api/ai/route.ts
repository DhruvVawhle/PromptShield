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

    // Phase 3: Invoke Modular AI Provider (Hybrid Groq + Gemini Engine)
    const { getProvider } = await import("@/lib/server/providers");
    const provider = getProvider(body.provider);
    const providerResponse = await provider.streamChatCompletion(finalPrompt, {
      model: body.model,
      signal: request.signal,
    });

    const responseHeaders = new Headers(providerResponse.headers);
    responseHeaders.set("X-Security-Decision", analysisResult.decision);
    responseHeaders.set("X-Security-Risk-Score", analysisResult.riskScore.toString());
    if (analysisResult.decision === "SANITIZE" && analysisResult.sanitizedPrompt) {
      responseHeaders.set("X-Sanitized-Prompt", encodeURIComponent(analysisResult.sanitizedPrompt));
    }

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
