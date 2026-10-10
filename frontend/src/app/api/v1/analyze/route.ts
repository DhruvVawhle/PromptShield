import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { analyzePromptServer } from "@/lib/server/security-engine";
import { persistSecurityEvent } from "@/lib/server/persistence";
import { checkRateLimit } from "@/lib/server/rate-limiter";
import { getActivePolicyForUser } from "@/lib/server/policy-manager";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        { status: 401 }
      );
    }
    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token, true);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid authentication token." } },
        { status: 401 }
      );
    }

    // Rate Limiting
    try {
      const success = await checkRateLimit(`analyze_${decodedToken.uid}`);
      if (!success) {
        return NextResponse.json(
          { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
          { status: 429 }
        );
      }
    } catch (error) {
      console.warn("Rate limiting failed, proceeding without it", error);
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
    const policy = await getActivePolicyForUser(decodedToken.uid);
    const analysisResult = await analyzePromptServer(prompt, policy);

    // Persist Event
    await persistSecurityEvent(decodedToken.uid, analysisResult, prompt);

    return NextResponse.json(analysisResult, { status: 200 });
  } catch (error) {
    console.error("Analysis API Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during analysis." } },
      { status: 500 }
    );
  }
}
