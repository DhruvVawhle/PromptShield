export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  stream?: boolean;
  signal?: AbortSignal;
  messages?: ChatMessage[];
  systemInstruction?: string;
}

export interface CompletionResult {
  content: string;
  model: string;
  provider: string;
}

export interface AIProviderAdapter {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  chatCompletion(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;
  streamChatCompletion(prompt: string, options?: CompletionOptions): Promise<Response>;
}
