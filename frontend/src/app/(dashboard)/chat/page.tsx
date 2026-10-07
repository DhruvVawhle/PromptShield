import type { Metadata } from "next";
import { ChatShell } from "@/components/chat/chat-shell";

export const metadata: Metadata = {
  title: "AI Chat",
  description: "Review PromptShield decisions and security outcomes for LLM prompts in the application chat flow.",
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return <ChatShell />;
}
