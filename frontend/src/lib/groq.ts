export type GroqHealthStatus =
  | "available"
  | "unavailable"
  | "authentication_failure"
  | "rate_limited"
  | "model_unavailable"
  | "unconfigured";

export const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b";

export function getGroqConfig() {
  const baseUrl = (
    process.env.GROQ_BASE_URL ||
    process.env.OMNIROUTE_BASE_URL ||
    DEFAULT_GROQ_BASE_URL
  ).replace(/\/+$/, "");

  const apiKey = (
    process.env.GROQ_API_KEY ||
    process.env.OMNIROUTE_API_KEY ||
    ""
  ).trim();

  const model = (
    process.env.GROQ_MODEL ||
    process.env.OMNIROUTE_MODEL ||
    DEFAULT_GROQ_MODEL
  ).trim();

  return { baseUrl, apiKey, model };
}

export function getGroqModelListUrl(baseUrl = getGroqConfig().baseUrl) {
  return `${baseUrl}/models`;
}

export function getGroqChatUrl(baseUrl = getGroqConfig().baseUrl) {
  return `${baseUrl}/chat/completions`;
}

export function getSafeGroqMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message || "The configured Groq AI provider is unavailable.";
    const code = (error as Error & { code?: string })?.code;

    if (message.includes("GROQ_API_KEY") || message.includes("OMNIROUTE_API_KEY") || message.includes("not configured")) {
      return "The Groq API key is not configured on the server.";
    }

    if (message.includes("401") || message.includes("403") || message.includes("authentication") || message.includes("rejected")) {
      return "The Groq provider rejected the configured credentials.";
    }

    if (message.includes("429") || message.includes("rate limit") || message.includes("rate-limited") || code === "RATE_LIMITED") {
      return "The Groq provider rate limit was reached. Please wait a few seconds and try again.";
    }

    if (message.includes("model") || message.includes("not available") || message.includes("model_not_found")) {
      return "The selected Groq model is unavailable.";
    }

    if (message.includes("fetch failed") || message.includes("ECONNREFUSED") || message.includes("timed out")) {
      return "The Groq AI service is currently unavailable.";
    }

    if (message && message !== "The AI provider is currently unavailable. Please try again later.") {
      return message;
    }

    return "The Groq AI engine is temporarily busy. Please try again in a few moments.";
  }

  return "The Groq AI engine could not process the request.";
}

export async function callGroq(prompt: string) {
  const { apiKey, model, baseUrl } = getGroqConfig();

  if (!apiKey) {
    const error = new Error("GROQ_API_KEY is not configured.");
    (error as Error & { code?: string }).code = "MISSING_API_KEY";
    throw error;
  }

  const sendRequest = async (targetModel: string) => {
    return await fetch(getGroqChatUrl(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        stream: false,
      }),
      cache: "no-store",
    });
  };

  let response = await sendRequest(model).catch((err) => {
    console.error("Groq fetch error:", err);
    throw err;
  });

  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await sendRequest(model).catch(() => response);

    if (response.status === 429 && model !== "openai/gpt-oss-20b") {
      response = await sendRequest("openai/gpt-oss-20b").catch(() => response);
    }
  }

  if (response.status === 401 || response.status === 403) {
    const error = new Error("The configured Groq credentials were rejected.");
    (error as Error & { code?: string }).code = "AUTHENTICATION_FAILED";
    throw error;
  }

  if (response.status === 429) {
    const error = new Error("The configured Groq provider rate limit was reached.");
    (error as Error & { code?: string }).code = "RATE_LIMITED";
    throw error;
  }

  if (!response.ok) {
    let detail = "The configured Groq provider is unavailable.";

    try {
      const payload = (await response.json()) as { error?: { message?: string }; message?: string };
      const providerMessage = payload?.error?.message ?? payload?.message;
      if (providerMessage) {
        detail = providerMessage;
      }
    } catch {
      // Ignore malformed provider error payloads and fall back to a safe error.
    }

    const error = new Error(detail);
    (error as Error & { code?: string }).code = "PROVIDER_UNAVAILABLE";
    throw error;
  }

  const payload = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string | null }; text?: string | null }>;
  };

  const content = payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text ?? "";

  if (!content) {
    const error = new Error("The configured Groq provider returned an empty response.");
    (error as Error & { code?: string }).code = "INVALID_RESPONSE";
    throw error;
  }

  return {
    content,
    model: payload.model ?? model,
    provider: "Groq",
  };
}

export async function checkGroqHealth(): Promise<{
  ok: boolean;
  status: GroqHealthStatus;
  provider: "Groq";
  model: string;
  message: string;
  availableModels: string[];
}> {
  const { apiKey, model, baseUrl } = getGroqConfig();

  if (!apiKey) {
    return {
      ok: false,
      status: "unconfigured",
      provider: "Groq",
      model,
      message: "GROQ_API_KEY is not configured on the server.",
      availableModels: [],
    };
  }

  try {
    const response = await fetch(getGroqModelListUrl(baseUrl), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        status: "authentication_failure",
        provider: "Groq",
        model,
        message: "The configured Groq credentials were rejected.",
        availableModels: [],
      };
    }

    if (response.status === 429) {
      return {
        ok: false,
        status: "rate_limited",
        provider: "Groq",
        model,
        message: "The Groq provider rate limit was reached.",
        availableModels: [],
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: "unavailable",
        provider: "Groq",
        model,
        message: "The Groq provider is unavailable.",
        availableModels: [],
      };
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: string; name?: string }>;
    };

    const availableModels = (payload.data ?? [])
      .map((entry) => entry.id ?? entry.name ?? "unknown")
      .filter(Boolean);

    if (availableModels.length === 0) {
      return {
        ok: false,
        status: "model_unavailable",
        provider: "Groq",
        model,
        message: "The configured Groq model is unavailable.",
        availableModels: [],
      };
    }

    return {
      ok: true,
      status: "available",
      provider: "Groq",
      model,
      message: "Groq AI is available.",
      availableModels,
    };
  } catch {
    return {
      ok: false,
      status: "unavailable",
      provider: "Groq",
      model,
      message: "Groq AI is not reachable from the server.",
      availableModels: [],
    };
  }
}
