import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";

process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.GEMINI_MODEL = "gemini-flash-latest";
process.env.GROQ_API_KEY = "test-groq-key";
process.env.GROQ_MODEL = "qwen/qwen3.8-27b";

import { GeminiProvider } from "@/lib/server/providers/gemini-provider";
import { HybridProvider, isCurrentDataQuery } from "@/lib/server/providers/hybrid-provider";
import { GroqProvider } from "@/lib/server/providers/groq-provider";
import { getProvider } from "@/lib/server/providers";

describe("Gemini AI Provider & Hybrid Multi-Provider Gateway", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("GeminiProvider Core Operations", () => {
    test("isConfigured returns true when GEMINI_API_KEY is present", () => {
      const provider = new GeminiProvider();
      assert.strictEqual(provider.isConfigured(), true);
      assert.strictEqual(provider.id, "gemini");
    });

    test("chatCompletion sends correct headers and parses candidate payload", async () => {
      const provider = new GeminiProvider();

      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>;
        assert.strictEqual(headers["X-goog-api-key"], "test-gemini-key");
        assert.ok(String(url).includes("generateContent"));

        const body = JSON.parse(init?.body as string);
        assert.strictEqual(body.contents[0].parts[0].text, "Explain quantum computing");

        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Quantum computing leverages qubits and superposition." }],
                },
              },
            ],
            modelVersion: "gemini-flash-latest",
          }),
        } as unknown as Response;
      }) as typeof fetch;

      const result = await provider.chatCompletion("Explain quantum computing");
      assert.strictEqual(result.content, "Quantum computing leverages qubits and superposition.");
      assert.strictEqual(result.provider, "Gemini");
      assert.strictEqual(result.model, "gemini-flash-latest");
    });

    test("streamChatCompletion converts Gemini SSE stream into plain text chunks", async () => {
      const provider = new GeminiProvider();

      const sseChunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"Google "}]}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"Gemini "}]}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"Flash"}]}}]}\n\n',
        "data: [DONE]\n\n",
      ];

      const readable = new ReadableStream({
        start(controller) {
          for (const chunk of sseChunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        },
      });

      globalThis.fetch = (async () => {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "text/event-stream" }),
          body: readable,
        } as unknown as Response;
      }) as typeof fetch;

      const response = await provider.streamChatCompletion("Stream this");
      assert.strictEqual(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
      assert.strictEqual(response.headers.get("X-AI-Provider"), "Gemini");

      const reader = response.body?.getReader();
      assert.ok(reader);

      let accumulated = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
      }

      assert.strictEqual(accumulated, "Google Gemini Flash");
    });

    test("chatCompletion rejects on invalid credentials with AUTHENTICATION_FAILED", async () => {
      const provider = new GeminiProvider();

      globalThis.fetch = (async () => {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: { message: "API key not valid" } }),
        } as unknown as Response;
      }) as typeof fetch;

      await assert.rejects(
        async () => {
          await provider.chatCompletion("Test auth fail");
        },
        (err: any) => {
          return err.code === "AUTHENTICATION_FAILED";
        }
      );
    });

    test("chatCompletion rejects on 429 with RATE_LIMITED", async () => {
      const provider = new GeminiProvider();

      globalThis.fetch = (async () => {
        return {
          ok: false,
          status: 429,
          json: async () => ({ error: { message: "Resource exhausted" } }),
        } as unknown as Response;
      }) as typeof fetch;

      await assert.rejects(
        async () => {
          await provider.chatCompletion("Test rate limit");
        },
        (err: any) => {
          return err.code === "RATE_LIMITED";
        }
      );
    });
  });

  describe("Hybrid Multi-Provider Gateway & Intelligent Recency Routing", () => {
    test("isCurrentDataQuery correctly identifies real-time/latest queries", () => {
      assert.strictEqual(isCurrentDataQuery("What is the latest news today?"), true);
      assert.strictEqual(isCurrentDataQuery("Who is the current CEO of Microsoft in 2026?"), true);
      assert.strictEqual(isCurrentDataQuery("Show me recent developments in AI"), true);
      assert.strictEqual(isCurrentDataQuery("What happened yesterday in cybersecurity?"), true);
      assert.strictEqual(isCurrentDataQuery("What is the status of the election?"), true);
      assert.strictEqual(isCurrentDataQuery("Ramayana Movie 2026"), true);
      assert.strictEqual(isCurrentDataQuery("Ramayana Movie"), true);

      // Non-recency queries should return false
      assert.strictEqual(isCurrentDataQuery("Write a quicksort in C++"), false);
      assert.strictEqual(isCurrentDataQuery("Explain the OSI 7 layer model"), false);
      assert.strictEqual(isCurrentDataQuery("What is an SQL injection attack?"), false);
    });

    test("HybridProvider routes recency queries to Gemini and coding queries to Groq", () => {
      const hybrid = new HybridProvider();

      const recencyDecision = hybrid.determineRouting("What is the latest security vulnerability today?");
      assert.strictEqual(recencyDecision.primary, "gemini");
      assert.strictEqual(recencyDecision.reason, "recency_detected");

      const codingDecision = hybrid.determineRouting("Write a binary search function in Python");
      assert.strictEqual(codingDecision.primary, "groq");
      assert.strictEqual(codingDecision.reason, "low_latency_default");
    });

    test("HybridProvider falls back to secondary provider on primary failure", async () => {
      const mockGroq = new GroqProvider();
      const mockGemini = new GeminiProvider();

      // Primary Groq fails with 429
      mock.method(mockGroq, "chatCompletion", async () => {
        const err = new Error("Groq rate limit exceeded");
        (err as any).code = "RATE_LIMITED";
        throw err;
      });

      // Secondary Gemini succeeds
      mock.method(mockGemini, "chatCompletion", async () => {
        return {
          content: "Gemini successfully answered the fallback query",
          model: "gemini-flash-latest",
          provider: "Gemini",
        };
      });

      const hybrid = new HybridProvider(mockGroq, mockGemini);
      const result = await hybrid.chatCompletion("Write an algorithm"); // routes to Groq primarily

      assert.strictEqual(result.content, "Gemini successfully answered the fallback query");
      assert.ok(result.provider.includes("Hybrid Failover (Gemini)"));
    });

    test("HybridProvider stream fallback succeeds on primary failure", async () => {
      const mockGroq = new GroqProvider();
      const mockGemini = new GeminiProvider();

      // Primary Groq stream fails with upstream error
      mock.method(mockGroq, "streamChatCompletion", async () => {
        const err = new Error("Groq upstream service unavailable");
        (err as any).code = "UPSTREAM_ERROR";
        throw err;
      });

      // Secondary Gemini stream succeeds
      mock.method(mockGemini, "streamChatCompletion", async () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("Gemini stream fallback response"));
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-AI-Provider": "Gemini",
          },
        });
      });

      const hybrid = new HybridProvider(mockGroq, mockGemini);
      const response = await hybrid.streamChatCompletion("Write a Python script");

      assert.strictEqual(response.headers.get("X-AI-Routing-Reason"), "failover");
      assert.ok(response.headers.get("X-AI-Provider")?.includes("Hybrid Failover"));

      const text = await response.text();
      assert.strictEqual(text, "Gemini stream fallback response");
    });
  });

  describe("getProvider resolution", () => {
    test("getProvider resolves requested provider strings", () => {
      const groq = getProvider("groq");
      assert.strictEqual(groq.id, "groq");

      const gemini = getProvider("gemini");
      assert.strictEqual(gemini.id, "gemini");

      const hybrid = getProvider("hybrid");
      assert.strictEqual(hybrid.id, "hybrid");

      const combined = getProvider("combined");
      assert.strictEqual(combined.id, "hybrid");

      const defaultProvider = getProvider();
      assert.strictEqual(defaultProvider.id, "hybrid");
    });
  });
});
