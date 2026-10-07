export type OmniRouteHealthStatus =
  | "available"
  | "unavailable"
  | "authentication_failure"
  | "rate_limited"
  | "model_unavailable"
  | "unconfigured";

export const DEFAULT_OMNIROUTE_BASE_URL = "http://localhost:20128/v1";

export function getOmniRouteConfig() {
  const baseUrl = (process.env.OMNIROUTE_BASE_URL ?? DEFAULT_OMNIROUTE_BASE_URL).replace(/\/+$/, "");
  const apiKey = process.env.OMNIROUTE_API_KEY?.trim() ?? "";
  const model = process.env.OMNIROUTE_MODEL?.trim() || "auto";

  return { baseUrl, apiKey, model };
}

export function getOmniRouteModelListUrl(baseUrl = getOmniRouteConfig().baseUrl) {
  return `${baseUrl}/models`;
}

export function getOmniRouteChatUrl(baseUrl = getOmniRouteConfig().baseUrl) {
  return `${baseUrl}/chat/completions`;
}

export function getSafeProviderMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message || "The configured AI gateway is unavailable.";

    if (message.includes("OMNIROUTE_API_KEY") || message.includes("not configured")) {
      return "The OmniRoute API key is not configured on the server.";
    }

    if (message.includes("401") || message.includes("403") || message.includes("authentication")) {
      return "The OmniRoute provider rejected the configured credentials.";
    }

    if (message.includes("429") || message.includes("rate limit") || message.includes("rate-limited")) {
      return "The OmniRoute provider rate limit was reached.";
    }

    if (message.includes("model") || message.includes("not available")) {
      return "The selected OmniRoute model is unavailable.";
    }

    if (message.includes("fetch failed") || message.includes("ECONNREFUSED") || message.includes("timed out")) {
      return "The OmniRoute gateway is currently unavailable.";
    }

    return "The configured AI gateway could not process the request.";
  }

  return "The configured AI gateway could not process the request.";
}

export async function callOmniRoute(prompt: string) {
  const { apiKey, model, baseUrl } = getOmniRouteConfig();

  if (!apiKey) {
    const error = new Error("OMNIROUTE_API_KEY is not configured.");
    (error as Error & { code?: string }).code = "MISSING_API_KEY";
    throw error;
  }

  const response = await fetch(getOmniRouteChatUrl(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      stream: false,
    }),
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    const error = new Error("The configured OmniRoute credentials were rejected.");
    (error as Error & { code?: string }).code = "AUTHENTICATION_FAILED";
    throw error;
  }

  if (response.status === 429) {
    const error = new Error("The configured OmniRoute provider rate limit was reached.");
    (error as Error & { code?: string }).code = "RATE_LIMITED";
    throw error;
  }

  if (!response.ok) {
    let detail = "The configured OmniRoute provider is unavailable.";

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
    const error = new Error("The configured OmniRoute provider returned an empty response.");
    (error as Error & { code?: string }).code = "INVALID_RESPONSE";
    throw error;
  }

  return {
    content,
    model: payload.model ?? model,
    provider: "OmniRoute",
  };
}

export async function checkOmniRouteHealth(): Promise<{
  ok: boolean;
  status: OmniRouteHealthStatus;
  provider: "OmniRoute";
  model: string;
  message: string;
  availableModels: string[];
}> {
  const { apiKey, model, baseUrl } = getOmniRouteConfig();

  if (!apiKey) {
    return {
      ok: false,
      status: "unconfigured",
      provider: "OmniRoute",
      model,
      message: "OMNIROUTE_API_KEY is not configured on the server.",
      availableModels: [],
    };
  }

  try {
    const response = await fetch(getOmniRouteModelListUrl(baseUrl), {
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
        provider: "OmniRoute",
        model,
        message: "The configured OmniRoute credentials were rejected.",
        availableModels: [],
      };
    }

    if (response.status === 429) {
      return {
        ok: false,
        status: "rate_limited",
        provider: "OmniRoute",
        model,
        message: "The OmniRoute provider rate limit was reached.",
        availableModels: [],
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: "unavailable",
        provider: "OmniRoute",
        model,
        message: "The OmniRoute provider is unavailable.",
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
        provider: "OmniRoute",
        model,
        message: "The configured OmniRoute model is unavailable.",
        availableModels: [],
      };
    }

    return {
      ok: true,
      status: "available",
      provider: "OmniRoute",
      model,
      message: "OmniRoute is available.",
      availableModels,
    };
  } catch {
    return {
      ok: false,
      status: "unavailable",
      provider: "OmniRoute",
      model,
      message: "OmniRoute is not reachable from the server.",
      availableModels: [],
    };
  }
}
