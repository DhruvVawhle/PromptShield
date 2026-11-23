export type GeminiHealthStatus =
  | "available"
  | "unavailable"
  | "authentication_failure"
  | "rate_limited"
  | "model_unavailable"
  | "unconfigured";

export const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

export function getGeminiConfig() {
  const baseUrl = (
    process.env.GEMINI_BASE_URL ||
    DEFAULT_GEMINI_BASE_URL
  ).replace(/\/+$/, "");

  const apiKey = (
    process.env.GEMINI_API_KEY ||
    ""
  ).trim();

  const model = (
    process.env.GEMINI_MODEL ||
    DEFAULT_GEMINI_MODEL
  ).trim();

  return { baseUrl, apiKey, model };
}

export function getGeminiGenerateUrl(model = getGeminiConfig().model, baseUrl = getGeminiConfig().baseUrl) {
  return `${baseUrl}/models/${model}:generateContent`;
}

export function getGeminiStreamUrl(model = getGeminiConfig().model, baseUrl = getGeminiConfig().baseUrl) {
  return `${baseUrl}/models/${model}:streamGenerateContent?alt=sse`;
}

export function getSafeGeminiMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message || "The configured Google Gemini AI provider is unavailable.";
    const code = (error as Error & { code?: string })?.code;

    if (message.includes("GEMINI_API_KEY") || message.includes("not configured")) {
      return "The Google Gemini API key is not configured on the server.";
    }

    if (
      message.includes("401") ||
      message.includes("403") ||
      message.includes("API_KEY_INVALID") ||
      message.includes("authentication") ||
      message.includes("rejected")
    ) {
      return "The Google Gemini provider rejected the configured credentials.";
    }

    if (
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("rate limit") ||
      code === "RATE_LIMITED"
    ) {
      return "The Google Gemini rate limit was reached. Please wait a few seconds and try again.";
    }

    if (message.includes("model") || message.includes("not found") || message.includes("NOT_FOUND")) {
      return "The selected Google Gemini model is unavailable.";
    }

    if (message.includes("fetch failed") || message.includes("ECONNREFUSED") || message.includes("timed out")) {
      return "The Google Gemini AI service is currently unavailable.";
    }

    return message;
  }

  return "The Google Gemini AI engine could not process the request.";
}

export async function checkGeminiHealth(): Promise<{
  ok: boolean;
  status: GeminiHealthStatus;
  provider: "Gemini";
  model: string;
  message: string;
}> {
  const { apiKey, model, baseUrl } = getGeminiConfig();

  if (!apiKey) {
    return {
      ok: false,
      status: "unconfigured",
      provider: "Gemini",
      model,
      message: "GEMINI_API_KEY is not configured on the server.",
    };
  }

  try {
    const url = `${baseUrl}/models/${model}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-goog-api-key": apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        status: "authentication_failure",
        provider: "Gemini",
        model,
        message: "The configured Google Gemini credentials were rejected.",
      };
    }

    if (response.status === 429) {
      return {
        ok: false,
        status: "rate_limited",
        provider: "Gemini",
        model,
        message: "The Google Gemini rate limit was reached.",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: "unavailable",
        provider: "Gemini",
        model,
        message: `Google Gemini provider returned status ${response.status}.`,
      };
    }

    return {
      ok: true,
      status: "available",
      provider: "Gemini",
      model,
      message: "Google Gemini is available.",
    };
  } catch {
    return {
      ok: false,
      status: "unavailable",
      provider: "Gemini",
      model,
      message: "Google Gemini is not reachable from the server.",
    };
  }
}
