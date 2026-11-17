import { NextResponse } from "next/server";
import { getGroqChatUrl, getGroqConfig, getSafeGroqMessage } from "@/lib/groq";
import { adminAuth } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/server/rate-limiter";

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
      const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : undefined;
      const clientErrors = [
        "auth/id-token-revoked",
        "auth/id-token-expired",
        "auth/argument-error",
        "auth/invalid-id-token",
        "auth/user-disabled",
      ];
      if (code && clientErrors.includes(code)) {
        return NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Invalid authentication token." } },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: { code: "SERVICE_UNAVAILABLE", message: "Authentication service unavailable." } },
        { status: 503 }
      );
    }

    try {
      const success = await checkRateLimit(decodedToken.uid);
      if (!success) {
        return NextResponse.json(
          { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
          { status: 429 }
        );
      }
    } catch (error) {
      console.warn("Rate limiting failed, proceeding without it", error);
    }
    const body = (await request.json().catch(() => ({}))) as {
      prompt?: string;
      model?: string;
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
    
    const policy = await getActivePolicyForUser(decodedToken.uid);
    const analysisResult = await analyzePromptServer(prompt, policy);
    
    // Persist event to Firestore for strict auditing
    await persistSecurityEvent(decodedToken.uid, analysisResult, prompt);

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

    const { apiKey, model, baseUrl } = getGroqConfig();

    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured.");
    }

    const sendGroqRequest = async (targetModel: string) => {
      return await fetch(getGroqChatUrl(baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: finalPrompt }],
          temperature: 0.2,
          stream: true,
        }),
        cache: "no-store",
      });
    };

    let response = await sendGroqRequest(model).catch((err) => {
      console.error("Groq fetch error:", err);
      throw err;
    });

    // If rate-limited (429), attempt a brief retry after 1.5s
    if (response.status === 429) {
      console.warn(`Groq model ${model} rate-limited (429), retrying in 1.5s...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      response = await sendGroqRequest(model).catch(() => response);

      // If still 429, try secondary model with independent quota pool
      if (response.status === 429 && model !== "openai/gpt-oss-20b") {
        console.warn(`Groq model ${model} still rate-limited, failing over to openai/gpt-oss-20b...`);
        response = await sendGroqRequest("openai/gpt-oss-20b").catch(() => response);
      }
    }

    if (!response.ok) {
      console.error(`Provider responded with status: ${response.status}`);
      let providerDetail = "";
      try {
        const errJson = await response.json();
        providerDetail = errJson?.error?.message || errJson?.message || "";
      } catch {
        providerDetail = await response.text().catch(() => "");
      }

      if (response.status === 429) {
        const error = new Error(providerDetail || "The Groq provider rate limit was reached. Please wait a few seconds and try again.");
        (error as any).code = "RATE_LIMITED";
        (error as any).status = 429;
        throw error;
      }

      if (response.status === 401 || response.status === 403) {
        const error = new Error("The configured Groq credentials were rejected.");
        (error as any).code = "AUTHENTICATION_FAILED";
        (error as any).status = 401;
        throw error;
      }

      const error = new Error(providerDetail || "The AI provider is currently unavailable. Please try again later.");
      (error as any).code = "UPSTREAM_ERROR";
      (error as any).status = 502;
      throw error;
    }

    // Convert OpenRouter SSE to a simple text stream
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let cancelled = false;
    const stream = new ReadableStream({
      async start(controller) {
        reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }
        
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? ""; // keep the last incomplete line
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith("data: ") && trimmedLine !== "data: [DONE]") {
                try {
                  const data = JSON.parse(trimmedLine.slice(6));
                  const content = data.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                } catch {
                  // ignore parse errors for partial chunks
                }
              }
            }
          }
          if (!cancelled) controller.close();
        } catch (e) {
          if (!cancelled) controller.error(e);
        } finally {
          reader.releaseLock();
        }
      },
      cancel() {
        cancelled = true;
        reader?.cancel();
      }
    });

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", "text/plain; charset=utf-8");
    responseHeaders.set("Transfer-Encoding", "chunked");
    responseHeaders.set("X-Security-Decision", analysisResult.decision);
    responseHeaders.set("X-Security-Risk-Score", analysisResult.riskScore.toString());
    if (analysisResult.decision === "SANITIZE" && analysisResult.sanitizedPrompt) {
      responseHeaders.set("X-Sanitized-Prompt", encodeURIComponent(analysisResult.sanitizedPrompt));
    }

    return new Response(stream, {
      headers: responseHeaders,
    });
  } catch (error) {
    const safeMessage = getSafeGroqMessage(error);
    const code = (error as Error & { code?: string })?.code ?? "PROVIDER_ERROR";
    const status = (error as Error & { status?: number })?.status ?? 502;

    return NextResponse.json(
      { error: { code, message: safeMessage } },
      { status }
    );
  }
}
