"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMsg = { role: "user" | "assistant"; content: string };

const MESSAGES: ReadonlyArray<ChatMsg> = [
  { role: "user", content: "Summarize this article in three bullet points." },
  {
    role: "assistant",
    content: "Here are three key points:\n\n• The research introduces a prompt analysis layer between the app and the model.\n• Threats are scored and mapped to allow, warn, sanitize, or block with explainable reasons.\n• Only trusted prompts are forwarded — suspicious ones are rewritten or stopped.",
  },
] as const;

export function ChatPreviewView({ compact = false }: { reducedMotion: boolean; compact?: boolean }) {
  const [input, setInput] = React.useState("");

  return (
    <div className={cn("flex flex-col", compact ? "min-h-[320px]" : "min-h-[420px]")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">AI Chat</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Guard on
        </span>
      </div>

      <div className="mt-4 space-y-4 overflow-auto pr-1" role="log" aria-label="Conversation">
        {MESSAGES.map((m, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {m.role === "user" ? "User" : "Assistant"}
              {m.role === "assistant" && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-emerald-700">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  Protected
                </span>
              )}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-6 text-slate-800">{m.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">PromptShield protection active</p>
        <p className="mt-1 text-[12.5px] leading-5 text-slate-600">Every message is checked before reaching the AI model.</p>
        <div className="mt-3 flex gap-2">
          <input
            aria-label="Chat input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10"
          />
          <button
            type="button"
            className="h-9 shrink-0 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-black disabled:opacity-40"
            disabled={!input.trim()}
            aria-label="Send"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
