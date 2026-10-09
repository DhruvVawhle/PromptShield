import { NextResponse } from "next/server";
import { getOmniRouteChatUrl, getOmniRouteConfig, getSafeProviderMessage } from "@/lib/omniroute";
import { adminAuth } from "@/lib/firebase-admin";

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
    } catch (e) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid authentication token." } },
        { status: 401 }
      );
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

    const { apiKey, model, baseUrl } = getOmniRouteConfig();

    if (!apiKey) {
      throw new Error("OMNIROUTE_API_KEY is not configured.");
    }

    const response = await fetch(getOmniRouteChatUrl(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "HTTP-Referer": "https://github.com/promptshield/promptshield",
        "X-Title": "PromptShield",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        stream: true,
      }),
      cache: "no-store",
    }).catch((err) => {
      console.error("OmniRoute fetch error:", err);
      throw err;
    });

    if (!response.ok) {
      console.error(`Provider responded with status: ${response.status}`);
      throw new Error("The AI provider is currently unavailable. Please try again later.");
    }

    // Convert OpenRouter SSE to a simple text stream
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
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
                } catch (e) {
                  // ignore parse errors for partial chunks
                }
              }
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        } finally {
          reader.releaseLock();
        }
      },
      cancel() {
        reader?.cancel();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    const safeMessage = getSafeProviderMessage(error);
    const code = (error as Error & { code?: string })?.code ?? "PROVIDER_ERROR";

    return NextResponse.json(
      { error: { code, message: safeMessage } },
      { status: 502 }
    );
  }
}
