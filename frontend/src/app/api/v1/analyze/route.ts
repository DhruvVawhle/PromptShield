import { NextResponse } from "next/server";
import { authenticateAndAuthorize } from "@/lib/server/rbac";
import { analyzePromptServer } from "@/lib/server/security-engine";
import { persistSecurityEvent } from "@/lib/server/persistence";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/server/rate-limiter";
import { getActivePolicyForUser } from "@/lib/server/policy-manager";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateAndAuthorize(request, "analyze:run");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const uid = authResult.uid;

    // Strict Rate Limiting
    const rateLimitRes = await enforceRateLimit(`analyze_${uid}`, "PROMPT_ANALYSIS");
    if (!rateLimitRes.success) {
      const responseHeaders = getRateLimitHeaders(rateLimitRes);
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
        { status: 429, headers: responseHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { prompt } = body;

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "INVALID_PROMPT", message: "A valid prompt string is required." } },
        { status: 400 }
      );
    }

    if (prompt.length > 5000) {
      return NextResponse.json(
        { error: { code: "PROMPT_TOO_LONG", message: "Prompt exceeds maximum allowed length of 5000 characters." } },
        { status: 400 }
      );
    }

    // Run Security Analysis
    const policy = await getActivePolicyForUser(uid);
    const analysisResult = await analyzePromptServer(prompt, policy);

    // Persist Event
    await persistSecurityEvent(uid, analysisResult, prompt);

    return NextResponse.json(analysisResult, { status: 200 });
  } catch (error) {
    console.error("Analysis API Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during analysis." } },
      { status: 500 }
    );
  }
}
