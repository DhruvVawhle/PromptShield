import {
  getGeminiConfig,
  getGeminiGenerateUrl,
  getGeminiStreamUrl,
  getSafeGeminiMessage,
} from "@/lib/gemini";
import type { AIProviderAdapter, CompletionOptions, CompletionResult } from "./provider-interface";

const FALLBACK_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
];

let lastWorkingGeminiModel: string | null = null;

export function getTemporalGroundingPrompt(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `You are PromptShield's Intelligent AI Security Assistant equipped with real-time web knowledge and grounding. Today's date is ${dateStr} (Current Year: ${now.getFullYear()}).
- Provide clear, direct, comprehensive, and well-structured answers using Markdown, bullet points, and code blocks where appropriate.
- You have access to real-time knowledge and live web search data provided directly in the prompt. When search results or conversational context are provided, ALWAYS synthesize and use them directly to answer the user's specific query with factual accuracy.
- Never state 'I do not have access to real-time information' or 'I cannot browse the internet' when search results, web data, or context are provided.
- When answering questions about upcoming movies, entertainment releases, technology launches, current events, or dates, always ground your answers relative to today's date (${dateStr}) and the current year (${now.getFullYear()}). Never present past years (such as 2024 or earlier) as upcoming or current.`;
}

function buildGeminiSystemInstruction(systemInstruction?: string): string {
  const base = getTemporalGroundingPrompt();
  return systemInstruction ? `${base}\n\n${systemInstruction}` : base;
}

function formatGeminiContents(
  prompt: string,
  messages?: CompletionOptions["messages"]
): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  if (!messages || messages.length === 0) {
    return [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];
  }

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const msg of messages) {
    if (!msg.content || !msg.content.trim()) continue;
    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n\n${msg.content}`;
    } else {
      contents.push({ role, parts: [{ text: msg.content }] });
    }
  }

  if (contents.length > 0 && contents[0].role !== "user") {
    contents.shift();
  }

  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: prompt }] });
  } else {
    const last = contents[contents.length - 1];
    if (last.role !== "user") {
      contents.push({ role: "user", parts: [{ text: prompt }] });
    } else if (last.parts[0].text !== prompt && !last.parts[0].text.includes(prompt)) {
      last.parts[0].text = prompt;
    }
  }

  return contents;
}

export class GeminiProvider implements AIProviderAdapter {
  readonly id = "gemini";
  readonly name = "Google Gemini (Real-time Knowledge)";

  isConfigured(): boolean {
    const { apiKey } = getGeminiConfig();
    return Boolean(apiKey && apiKey.trim().length > 0);
  }

  private resolveModel(optionsModel?: string, defaultModel = getGeminiConfig().model): string {
    // Sanitize model parameter: only use if explicitly targeting a Gemini model
    if (optionsModel && optionsModel.toLowerCase().startsWith("gemini")) {
      return optionsModel;
    }
    return defaultModel;
  }

  async chatCompletion(prompt: string, options: CompletionOptions = {}): Promise<CompletionResult> {
    const { apiKey, model, baseUrl } = getGeminiConfig();
    if (!apiKey) {
      const error = new Error("GEMINI_API_KEY is not configured on the server.");
      (error as Error & { code?: string }).code = "MISSING_API_KEY";
      throw error;
    }

    const targetModel = this.resolveModel(options.model, model);
    const orderedFallbacks = FALLBACK_MODELS.filter((m) => m !== targetModel);
    const candidateModels = options.model
      ? [targetModel, ...orderedFallbacks]
      : lastWorkingGeminiModel && lastWorkingGeminiModel !== targetModel
      ? [lastWorkingGeminiModel, targetModel, ...orderedFallbacks.filter((m) => m !== lastWorkingGeminiModel)]
      : [targetModel, ...orderedFallbacks];

    let lastError: Error | null = null;

    for (const currentModel of candidateModels) {
      const url = getGeminiGenerateUrl(currentModel, baseUrl);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": apiKey,
            Accept: "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: buildGeminiSystemInstruction(options.systemInstruction) }],
            },
            contents: formatGeminiContents(prompt, options.messages),
            generationConfig: {
              temperature: options.temperature ?? 0.2,
            },
          }),
          cache: "no-store",
          signal: options.signal,
        });

        if (response.status === 401 || response.status === 403) {
          const error = new Error("The configured Google Gemini credentials were rejected.");
          (error as Error & { code?: string }).code = "AUTHENTICATION_FAILED";
          throw error;
        }

        // If high demand or model not found, try next candidate model
        if (response.status === 503 || response.status === 404) {
          console.warn(`[GeminiProvider] Model ${currentModel} returned ${response.status}, attempting fallback model.`);
          continue;
        }

        if (response.status === 429) {
          const error = new Error("The Google Gemini rate limit was reached.");
          (error as Error & { code?: string }).code = "RATE_LIMITED";
          throw error;
        }

        if (!response.ok) {
          let detail = `Status ${response.status}`;
          try {
            const errJson = await response.json();
            detail = errJson?.error?.message || detail;
          } catch {
            // Fall back to status text
          }
          const error = new Error(getSafeGeminiMessage(new Error(detail)));
          (error as Error & { code?: string }).code = "PROVIDER_UNAVAILABLE";
          throw error;
        }

        const payload = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string; thought?: boolean }>;
            };
          }>;
          modelVersion?: string;
        };

        let content = "";
        const candidates = payload.candidates;
        if (Array.isArray(candidates)) {
          for (const cand of candidates) {
            const parts = cand?.content?.parts;
            if (Array.isArray(parts)) {
              for (const part of parts) {
                if (part.text && !part.thought) {
                  content += part.text;
                }
              }
            }
          }
        }

        lastWorkingGeminiModel = currentModel;
        return {
          content,
          model: payload.modelVersion ?? currentModel,
          provider: "Gemini",
        };
      } catch (err) {
        lastError = err as Error;
        if ((err as Error & { code?: string }).code === "AUTHENTICATION_FAILED") {
          throw err;
        }
      }
    }

    throw lastError || new Error("All configured Gemini models failed to respond.");
  }

  async streamChatCompletion(prompt: string, options: CompletionOptions = {}): Promise<Response> {
    const { apiKey, model, baseUrl } = getGeminiConfig();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    const targetModel = this.resolveModel(options.model, model);
    const orderedFallbacks = FALLBACK_MODELS.filter((m) => m !== targetModel);
    const candidateModels = options.model
      ? [targetModel, ...orderedFallbacks]
      : lastWorkingGeminiModel && lastWorkingGeminiModel !== targetModel
      ? [lastWorkingGeminiModel, targetModel, ...orderedFallbacks.filter((m) => m !== lastWorkingGeminiModel)]
      : [targetModel, ...orderedFallbacks];

    let activeResponse: Response | null = null;
    let selectedModel = targetModel;
    let lastError: Error | null = null;

    for (const currentModel of candidateModels) {
      const url = getGeminiStreamUrl(currentModel, baseUrl);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": apiKey,
            Accept: "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: buildGeminiSystemInstruction(options.systemInstruction) }],
            },
            contents: formatGeminiContents(prompt, options.messages),
            generationConfig: {
              temperature: options.temperature ?? 0.2,
            },
          }),
          cache: "no-store",
          signal: options.signal,
        });

        if (response.status === 401 || response.status === 403) {
          const error = new Error("The configured Google Gemini credentials were rejected.") as Error & {
            code?: string;
            status?: number;
          };
          error.code = "AUTHENTICATION_FAILED";
          error.status = 401;
          throw error;
        }

        if (response.status === 503 || response.status === 404) {
          console.warn(`[GeminiProvider] Stream model ${currentModel} returned ${response.status}, attempting fallback.`);
          continue;
        }

        if (response.status === 429) {
          const error = new Error(
            "The Google Gemini rate limit was reached. Please wait a few seconds and try again."
          ) as Error & { code?: string; status?: number };
          error.code = "RATE_LIMITED";
          error.status = 429;
          throw error;
        }

        if (!response.ok) {
          let providerDetail = "";
          try {
            const errJson = await response.json();
            providerDetail = errJson?.error?.message || errJson?.message || "";
          } catch {
            providerDetail = await response.text().catch(() => "");
          }
          const error = new Error(
            providerDetail || "The Google Gemini provider is currently unavailable. Please try again later."
          ) as Error & { code?: string; status?: number };
          error.code = "UPSTREAM_ERROR";
          error.status = 502;
          throw error;
        }

        activeResponse = response;
        selectedModel = currentModel;
        lastWorkingGeminiModel = currentModel;
        break;
      } catch (err) {
        lastError = err as Error;
        if ((err as Error & { code?: string }).code === "AUTHENTICATION_FAILED") {
          throw err;
        }
      }
    }

    if (!activeResponse) {
      throw lastError || new Error("Google Gemini streaming service is unavailable across all configured models.");
    }

    // Convert Gemini SSE stream into standard plain text stream
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let cancelled = false;
    const stream = new ReadableStream({
      async start(controller) {
        reader = activeResponse?.body?.getReader();
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
              if (trimmedLine.startsWith("data: ")) {
                const jsonStr = trimmedLine.slice(6).trim();
                if (jsonStr === "[DONE]") {
                  continue;
                }
                try {
                  const data = JSON.parse(jsonStr);
                  const candidates = data.candidates;
                  if (Array.isArray(candidates)) {
                    for (const cand of candidates) {
                      const parts = cand?.content?.parts;
                      if (Array.isArray(parts)) {
                        for (const part of parts) {
                          if (part.text && !part.thought) {
                            controller.enqueue(new TextEncoder().encode(part.text));
                          }
                        }
                      }
                    }
                  }
                } catch {
                  // Ignore partial or unparseable SSE chunks
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
        "X-AI-Provider": "Gemini",
        "X-AI-Model": selectedModel,
      },
    });
  }
}
