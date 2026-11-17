/**
 * Legacy OmniRoute compatibility module.
 * Delegates directly to the Groq AI engine (frontend/src/lib/groq.ts).
 */
import {
  callGroq,
  checkGroqHealth,
  getGroqChatUrl,
  getGroqConfig,
  getGroqModelListUrl,
  getSafeGroqMessage,
  DEFAULT_GROQ_BASE_URL,
  DEFAULT_GROQ_MODEL,
  type GroqHealthStatus,
} from "./groq";

export type OmniRouteHealthStatus = GroqHealthStatus;

export const DEFAULT_OMNIROUTE_BASE_URL = DEFAULT_GROQ_BASE_URL;
export const DEFAULT_OMNIROUTE_MODEL = DEFAULT_GROQ_MODEL;

export function getOmniRouteConfig() {
  return getGroqConfig();
}

export function getOmniRouteModelListUrl(baseUrl?: string) {
  return getGroqModelListUrl(baseUrl);
}

export function getOmniRouteChatUrl(baseUrl?: string) {
  return getGroqChatUrl(baseUrl);
}

export function getSafeProviderMessage(error: unknown) {
  return getSafeGroqMessage(error);
}

export async function callOmniRoute(prompt: string) {
  const result = await callGroq(prompt);
  return {
    ...result,
    provider: "Groq" as const,
  };
}

export async function checkOmniRouteHealth(): Promise<{
  ok: boolean;
  status: OmniRouteHealthStatus;
  provider: "OmniRoute" | "Groq";
  model: string;
  message: string;
  availableModels: string[];
}> {
  const health = await checkGroqHealth();
  return {
    ...health,
    provider: "Groq",
  };
}
