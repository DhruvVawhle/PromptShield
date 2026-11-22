import { test, describe, afterEach } from "node:test";
import assert from "node:assert";
import {
  performWebSearch,
  buildSearchAugmentedPrompt,
  type WebSearchResult,
} from "../web-search";

describe("Web Search Grounding Engine", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("buildSearchAugmentedPrompt returns original prompt when results are empty", () => {
    const prompt = "What is the capital of France?";
    const result = buildSearchAugmentedPrompt(prompt, []);
    assert.strictEqual(result, prompt);
  });

  test("buildSearchAugmentedPrompt formats snippets and anchors to current year", () => {
    const prompt = "What are the major upcoming movies in December?";
    const mockResults: WebSearchResult[] = [
      {
        title: "December Releases",
        snippet: "Avengers: Doomsday and Dune Part 3 are slated for December 2026.",
        source: "Movie Calendar Index",
      },
      {
        snippet: "Violent Night 2 is scheduled for release on December 4, 2026.",
        source: "Box Office Data",
      },
    ];

    const augmented = buildSearchAugmentedPrompt(prompt, mockResults);
    assert.ok(augmented.includes("LIVE REAL-TIME WEB SEARCH RESULTS"));
    assert.ok(augmented.includes("Avengers: Doomsday"));
    assert.ok(augmented.includes("Violent Night 2"));
    assert.ok(augmented.includes(String(new Date().getFullYear())));
  });

  test("performWebSearch parses HTML snippets correctly from search endpoint", async () => {
    const mockHtml = `
      <html>
        <body>
          <div class="result">
            <a class="result__snippet">Sample snippet for <b>upcoming movies</b> in 2026 &amp; beyond.</a>
          </div>
          <div class="result">
            <a class="result__snippet">Second snippet detailing &quot;release dates&quot;.</a>
          </div>
        </body>
      </html>
    `;

    globalThis.fetch = (async () => {
      return {
        ok: true,
        text: async () => mockHtml,
      } as unknown as Response;
    }) as typeof fetch;

    const results = await performWebSearch("upcoming movies in 2026", 2);
    assert.strictEqual(results.length, 2);
    assert.ok(results[0].snippet.includes("Sample snippet for upcoming movies in 2026 & beyond."));
    assert.ok(results[1].snippet.includes('Second snippet detailing "release dates".'));
  });

  test("performWebSearch handles network failure gracefully and returns empty array", async () => {
    globalThis.fetch = (async () => {
      throw new Error("Network unreachable");
    }) as typeof fetch;

    const results = await performWebSearch("test query");
    assert.deepStrictEqual(results, []);
  });

  test("performWebSearch handles empty or whitespace queries gracefully", async () => {
    const results = await performWebSearch("   ");
    assert.deepStrictEqual(results, []);
  });
});
