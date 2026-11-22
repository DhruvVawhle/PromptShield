import { getGroqChatUrl, getGroqConfig, getSafeGroqMessage } from "@/lib/groq";
import type { AIProviderAdapter, CompletionOptions, CompletionResult } from "./provider-interface";

export class GroqProvider implements AIProviderAdapter {
  readonly id = "groq";
  readonly name = "Groq LPU Inference Engine";

  isConfigured(): boolean {
    const { apiKey } = getGroqConfig();
    return Boolean(apiKey && apiKey.trim().length > 0);
  }

  async chatCompletion(prompt: string, options: CompletionOptions = {}): Promise<CompletionResult> {
    const { apiKey, model, baseUrl } = getGroqConfig();
    if (!apiKey) {
      const error = new Error("GROQ_API_KEY is not configured on the server.");
      (error as Error & { code?: string }).code = "MISSING_API_KEY";
      throw error;
    }

    const targetModel = options.model || model;
    const sendRequest = async (mod: string) => {
      return await fetch(getGroqChatUrl(baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: mod,
          messages: [{ role: "user", content: prompt }],
          temperature: options.temperature ?? 0.2,
          stream: false,
        }),
        cache: "no-store",
        signal: options.signal,
      });
    };

    let response = await sendRequest(targetModel).catch((err) => {
      console.error("[GroqProvider] Fetch error:", err);
      throw err;
    });

    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      response = await sendRequest(targetModel).catch(() => response);

      if (response.status === 429 && targetModel !== "openai/gpt-oss-20b") {
        response = await sendRequest("openai/gpt-oss-20b").catch(() => response);
      }
    }

    if (response.status === 401 || response.status === 403) {
      const error = new Error("The configured Groq credentials were rejected.");
      (error as Error & { code?: string }).code = "AUTHENTICATION_FAILED";
      throw error;
    }

    if (response.status === 429) {
      const error = new Error("The Groq provider rate limit was reached.");
      (error as Error & { code?: string }).code = "RATE_LIMITED";
      throw error;
    }

    if (!response.ok) {
      const error = new Error(getSafeGroqMessage(new Error(`Status ${response.status}`)));
      (error as Error & { code?: string }).code = "PROVIDER_UNAVAILABLE";
      throw error;
    }

    const payload = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string | null }; text?: string | null }>;
    };

    const content = payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text ?? "";
    return {
      content,
      model: payload.model ?? targetModel,
      provider: "Groq",
    };
  }

  async streamChatCompletion(prompt: string, options: CompletionOptions = {}): Promise<Response> {
    const { apiKey, model, baseUrl } = getGroqConfig();
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured on the server.");
    }

    const targetModel = options.model || model;
    const sendRequest = async (mod: string) => {
      return await fetch(getGroqChatUrl(baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: mod,
          messages: [{ role: "user", content: prompt }],
          temperature: options.temperature ?? 0.2,
          stream: true,
        }),
        cache: "no-store",
        signal: options.signal,
      });
    };

    let response = await sendRequest(targetModel).catch((err) => {
      console.error("[GroqProvider] Stream fetch error:", err);
      throw err;
    });

    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      response = await sendRequest(targetModel).catch(() => response);

      if (response.status === 429 && targetModel !== "openai/gpt-oss-20b") {
        response = await sendRequest("openai/gpt-oss-20b").catch(() => response);
      }
    }

    if (!response.ok) {
      console.error(`[GroqProvider] Provider responded with status: ${response.status}`);
      let providerDetail = "";
      try {
        const errJson = await response.json();
        providerDetail = errJson?.error?.message || errJson?.message || "";
      } catch {
        providerDetail = await response.text().catch(() => "");
      }

      if (response.status === 429) {
        const error = new Error(
          providerDetail || "The Groq provider rate limit was reached. Please wait a few seconds and try again."
        ) as Error & { code?: string; status?: number };
        error.code = "RATE_LIMITED";
        error.status = 429;
        throw error;
      }

      if (response.status === 401 || response.status === 403) {
        const error = new Error("The configured Groq credentials were rejected.") as Error & {
          code?: string;
          status?: number;
        };
        error.code = "AUTHENTICATION_FAILED";
        error.status = 401;
        throw error;
      }

      const error = new Error(
        providerDetail || "The AI provider is currently unavailable. Please try again later."
      ) as Error & { code?: string; status?: number };
      error.code = "UPSTREAM_ERROR";
      error.status = 502;
      throw error;
    }

    // Convert Groq SSE stream into standard plain text stream
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
            buffer = lines.pop() ?? "";

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
                  // Ignore partial JSON chunks
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
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  }
}
