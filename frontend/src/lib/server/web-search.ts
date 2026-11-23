export interface WebSearchResult {
  title?: string;
  snippet: string;
  source: string;
}

/**
 * Strips HTML tags and unescapes basic HTML entities from raw search snippets.
 */
function cleanSnippetText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Searches the live web for current real-time data using fast public search endpoints.
 * Combines DuckDuckGo and Wikipedia search with a strict 3.5s timeout.
 * Fails safely by returning an empty array if offline or network times out.
 */
export async function performWebSearch(
  query: string,
  maxResults = 5
): Promise<WebSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const now = new Date();
  const currentYear = now.getFullYear();

  // If query mentions current/upcoming events without a year, augment query with current year
  let searchQuery = trimmed;
  if (
    !trimmed.includes(String(currentYear)) &&
    /\b(movie|movies|film|news|election|status|price|winner|score|release|schedule|december|holiday)\b/i.test(
      trimmed
    )
  ) {
    searchQuery = `${trimmed} ${currentYear}`;
  }

  const results: WebSearchResult[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      searchQuery
    )}`;

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const html = await res.text().catch(() => "");
      const snippetRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = snippetRegex.exec(html)) !== null && results.length < maxResults) {
        const cleaned = cleanSnippetText(match[1]);
        if (cleaned && cleaned.length > 20) {
          results.push({
            snippet: cleaned,
            source: "DuckDuckGo Web Index",
          });
        }
      }
    }
  } catch {
    // Graceful fallback if DuckDuckGo is blocked or unreachable
  }

  // If DuckDuckGo returned few or no results, query Wikipedia search API as auxiliary source
  if (results.length < 2) {
    try {
      const wikiController = new AbortController();
      const wikiTimeoutId = setTimeout(() => wikiController.abort(), 2000);

      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        searchQuery
      )}&format=json&utf8=1`;

      const wikiRes = await fetch(wikiUrl, {
        signal: wikiController.signal,
        headers: {
          "User-Agent": "PromptShield-SearchBot/1.0",
        },
      }).catch(() => null);

      clearTimeout(wikiTimeoutId);

      if (wikiRes && wikiRes.ok) {
        const data = await wikiRes.json().catch(() => null);
        const hits = data?.query?.search || [];
        for (const hit of hits) {
          if (results.length >= maxResults) break;
          const cleaned = cleanSnippetText(hit.snippet || "");
          if (cleaned && cleaned.length > 20) {
            results.push({
              title: hit.title,
              snippet: cleaned,
              source: `Wikipedia: ${hit.title}`,
            });
          }
        }
      }
    } catch {
      // Ignore auxiliary search failures
    }
  }

  return results;
}

/**
 * Augments the user's prompt with verified live web search results.
 */
export function buildSearchAugmentedPrompt(
  prompt: string,
  results: WebSearchResult[]
): string {
  if (!results || results.length === 0) {
    return prompt;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const searchSnippets = results
    .map((r, i) => `[Source ${i + 1} - ${r.source}] ${r.title ? `${r.title}: ` : ""}${r.snippet}`)
    .join("\n\n");

  return `${prompt}

=== LIVE REAL-TIME WEB SEARCH RESULTS (${dateStr}) ===
The following live search results were retrieved directly from the internet to ensure up-to-date accuracy:

${searchSnippets}
======================================================
Please answer the prompt directly and comprehensively using the live search results above. Synthesize the facts directly to answer the user's specific query. Do not state that you lack real-time access or cannot browse the internet; use the verified facts provided above. Anchor your answer to the current date (${dateStr}) and current year (${now.getFullYear()}).`;
}
