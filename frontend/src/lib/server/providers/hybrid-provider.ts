import type { AIProviderAdapter, CompletionOptions, CompletionResult } from "./provider-interface";
import { GroqProvider } from "./groq-provider";
import { GeminiProvider } from "./gemini-provider";

export interface HybridRoutingDecision {
  primary: "gemini" | "groq";
  reason: "recency_detected" | "low_latency_default" | "fallback_unconfigured";
}

/**
 * Patterns matching queries that require current, live, or latest real-world data.
 * Groq models have static knowledge cutoffs, whereas Gemini provides current/latest data.
 */
const RECENCY_PATTERNS = [
  /\b(current|currently|latest|recent|recently|today|now|live|real-?time|up-?to-?date|newest|breaking)\b/i,
  /\b(202[4-9]|203[0-9]|this (?:year|month|week)|yesterday|tomorrow)\b/i,
  /\b(?:who is the current|what is the current|what is happening|what happened to|status of|stock price|weather in|score of|who is|who are)\b/i,
  /\b(news|release notes|changelog|announcement|election|president|prime minister|minister|ceo|leader|government)\b/i,
  /\b(movie|movies|film|films|cinema|series|season|episode|show|actor|actress|director|producer|cast|trailer|teaser|album|song)\b/i,
  /\b(upcoming|announced|scheduled|premiere|premiering|slated)\b/i,
  /\b(stock|stocks|crypto|bitcoin|pricing|market|valuation|ipo|winner|champions|olympics)\b/i,
];

export function isCurrentDataQuery(prompt: string): boolean {
  if (!prompt || typeof prompt !== "string") return false;
  return RECENCY_PATTERNS.some((pattern) => pattern.test(prompt));
}

export class HybridProvider implements AIProviderAdapter {
  readonly id = "hybrid";
  readonly name = "PromptShield Hybrid Gateway (Groq + Gemini)";

  private groqProvider: GroqProvider;
  private geminiProvider: GeminiProvider;

  constructor(groq = new GroqProvider(), gemini = new GeminiProvider()) {
    this.groqProvider = groq;
    this.geminiProvider = gemini;
  }

  isConfigured(): boolean {
    return this.groqProvider.isConfigured() || this.geminiProvider.isConfigured();
  }

  determineRouting(prompt: string): HybridRoutingDecision {
    const geminiAvailable = this.geminiProvider.isConfigured();
    const groqAvailable = this.groqProvider.isConfigured();

    if (!groqAvailable && geminiAvailable) {
      return { primary: "gemini", reason: "fallback_unconfigured" };
    }
    if (!geminiAvailable && groqAvailable) {
      return { primary: "groq", reason: "fallback_unconfigured" };
    }

    if (isCurrentDataQuery(prompt) && geminiAvailable) {
      return { primary: "gemini", reason: "recency_detected" };
    }

    return { primary: "groq", reason: "low_latency_default" };
  }

  async chatCompletion(prompt: string, options: CompletionOptions = {}): Promise<CompletionResult> {
    const routing = this.determineRouting(prompt);
    const primary = routing.primary === "gemini" ? this.geminiProvider : this.groqProvider;
    const secondary = routing.primary === "gemini" ? this.groqProvider : this.geminiProvider;

    try {
      const result = await primary.chatCompletion(prompt, options);
      return {
        ...result,
        provider: `Hybrid (${result.provider})`,
      };
    } catch (primaryError) {
      console.warn(
        `[HybridProvider] Primary provider (${primary.id}) failed: ${(primaryError as Error).message}. Attempting secondary (${secondary.id}) failover.`
      );

      if (secondary.isConfigured()) {
        const fallbackResult = await secondary.chatCompletion(prompt, options);
        const disclaimer = routing.reason === "recency_detected" && secondary.id === "groq"
          ? "> ⚠️ *Note: The real-time knowledge engine was momentarily busy. This response was generated using a fallback model whose knowledge cutoff may not reflect recent announcements.*\n\n"
          : "";

        return {
          ...fallbackResult,
          content: disclaimer + fallbackResult.content,
          provider: `Hybrid Failover (${fallbackResult.provider})`,
        };
      }

      throw primaryError;
    }
  }

  async streamChatCompletion(prompt: string, options: CompletionOptions = {}): Promise<Response> {
    const routing = this.determineRouting(prompt);
    const primary = routing.primary === "gemini" ? this.geminiProvider : this.groqProvider;
    const secondary = routing.primary === "gemini" ? this.groqProvider : this.geminiProvider;

    try {
      const response = await primary.streamChatCompletion(prompt, options);
      const headers = new Headers(response.headers);
      headers.set("X-AI-Provider", `Hybrid (${primary.name})`);
      headers.set("X-AI-Routing-Reason", routing.reason);

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch (primaryError) {
      console.warn(
        `[HybridProvider] Primary stream provider (${primary.id}) failed: ${(primaryError as Error).message}. Attempting failover to (${secondary.id}).`
      );

      if (secondary.isConfigured()) {
        const fallbackResponse = await secondary.streamChatCompletion(prompt, options);
        const headers = new Headers(fallbackResponse.headers);
        headers.set("X-AI-Provider", `Hybrid Failover (${secondary.name})`);
        headers.set("X-AI-Routing-Reason", "failover");

        const disclaimer = routing.reason === "recency_detected" && secondary.id === "groq"
          ? "> ⚠️ *Note: The real-time knowledge engine was momentarily busy. This response was generated using a fallback model whose knowledge cutoff may not reflect recent announcements.*\n\n"
          : "";

        if (disclaimer) {
          const stream = new ReadableStream({
            async start(controller) {
              controller.enqueue(new TextEncoder().encode(disclaimer));
              const reader = fallbackResponse.body?.getReader();
              if (!reader) {
                controller.close();
                return;
              }
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
                controller.close();
              } catch (e) {
                controller.error(e);
              } finally {
                reader.releaseLock();
              }
            },
          });

          return new Response(stream, {
            status: fallbackResponse.status,
            headers,
          });
        }

        return new Response(fallbackResponse.body, {
          status: fallbackResponse.status,
          headers,
        });
      }

      throw primaryError;
    }
  }
}
