import type { Metadata } from "next";
import { ChatClient } from "./chat-client";

export const metadata: Metadata = {
  title: "AI Chat",
  description: "Review PromptShield decisions and security outcomes for LLM prompts in the application chat flow.",
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return <ChatClient />;
}
