import type { AIProviderAdapter } from "./provider-interface";
import { GroqProvider } from "./groq-provider";
import { GeminiProvider } from "./gemini-provider";
import { HybridProvider } from "./hybrid-provider";

export * from "./provider-interface";
export { GroqProvider, GeminiProvider, HybridProvider };

const defaultGroqProvider = new GroqProvider();
const defaultGeminiProvider = new GeminiProvider();
const defaultHybridProvider = new HybridProvider(defaultGroqProvider, defaultGeminiProvider);

let testProviderMock: AIProviderAdapter | null = null;

export function setProviderForTest(mock: AIProviderAdapter | null) {
  testProviderMock = mock;
}

export function getProvider(name = "hybrid"): AIProviderAdapter {
  if (testProviderMock) {
    return testProviderMock;
  }
  switch (name?.toLowerCase()) {
    case "groq":
    case "omniroute":
      return defaultGroqProvider;
    case "gemini":
    case "google":
      return defaultGeminiProvider;
    case "hybrid":
    case "combined":
    case "auto":
    default:
      return defaultHybridProvider;
  }
}
