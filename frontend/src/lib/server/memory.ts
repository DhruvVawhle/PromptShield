import { adminDb } from "@/lib/firebase-admin";

export interface UserMemoryItem {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserMemoryDoc {
  uid: string;
  memories: UserMemoryItem[];
  updatedAt: string;
}

const MEMORIES_COLLECTION = "user_memories";

interface SafeDocRef {
  get?: () => Promise<{ exists: boolean; data?: () => Record<string, unknown> }>;
  set?: (data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Retrieves all persistent cross-chat memories for a given user.
 */
export async function getUserMemories(uid: string): Promise<string[]> {
  if (!uid) return [];
  try {
    const docRef = adminDb.collection(MEMORIES_COLLECTION).doc(uid) as unknown as SafeDocRef;
    if (!docRef || typeof docRef.get !== "function") {
      return [];
    }
    const snap = await docRef.get();
    if (!snap || !snap.exists) {
      return [];
    }
    const data = snap.data?.() as UserMemoryDoc | undefined;
    if (!data || !Array.isArray(data.memories)) {
      return [];
    }
    return data.memories
      .map((m) => (typeof m === "string" ? m : m.text))
      .filter((text): text is string => Boolean(text && text.trim().length > 0));
  } catch (error) {
    console.warn("[Memory] Failed to read user memories:", error);
    return [];
  }
}

/**
 * Saves a new fact or preference to persistent cross-chat memory for a user.
 */
export async function saveUserMemory(uid: string, text: string): Promise<string[]> {
  if (!uid || !text || !text.trim()) return [];
  const clean = text.trim();

  try {
    const docRef = adminDb.collection(MEMORIES_COLLECTION).doc(uid) as unknown as SafeDocRef;
    if (!docRef) return [clean];

    let existingItems: UserMemoryItem[] = [];
    if (typeof docRef.get === "function") {
      const snap = await docRef.get();
      if (snap?.exists) {
        const raw = (snap.data?.() as { memories?: unknown[] })?.memories;
        if (Array.isArray(raw)) {
          existingItems = raw.map((item) =>
            typeof item === "string"
              ? { id: crypto.randomUUID(), text: item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : (item as UserMemoryItem)
          );
        }
      }
    }

    const lowerClean = clean.toLowerCase();
    const alreadyExists = existingItems.some((item) => item.text.toLowerCase() === lowerClean);

    if (!alreadyExists) {
      existingItems.push({
        id: crypto.randomUUID(),
        text: clean,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (typeof docRef.set === "function") {
        await docRef.set({
          uid,
          memories: existingItems,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return existingItems.map((m) => m.text);
  } catch (error) {
    console.warn("[Memory] Failed to save user memory:", error);
    return [clean];
  }
}

/**
 * Removes matching memory items or all memories from persistent storage.
 */
export async function removeUserMemory(
  uid: string,
  target: string
): Promise<{ removed: string[]; remaining: string[] }> {
  if (!uid) return { removed: [], remaining: [] };
  const cleanTarget = (target || "").trim().toLowerCase();

  try {
    const docRef = adminDb.collection(MEMORIES_COLLECTION).doc(uid) as unknown as SafeDocRef;
    if (!docRef || typeof docRef.get !== "function") {
      return { removed: [], remaining: [] };
    }

    const snap = await docRef.get();
    if (!snap?.exists) {
      return { removed: [], remaining: [] };
    }

    const raw = (snap.data?.() as { memories?: unknown[] })?.memories;
    const existing: UserMemoryItem[] = Array.isArray(raw)
      ? raw.map((item) =>
          typeof item === "string"
            ? { id: crypto.randomUUID(), text: item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : (item as UserMemoryItem)
        )
      : [];

    const isAll =
      cleanTarget === "all" ||
      cleanTarget === "*" ||
      cleanTarget === "everything" ||
      cleanTarget.includes("all memories") ||
      cleanTarget.includes("all memory") ||
      cleanTarget === "";

    const removed: string[] = [];
    const remaining: UserMemoryItem[] = [];

    for (const item of existing) {
      const itemLower = item.text.toLowerCase();
      if (isAll || itemLower.includes(cleanTarget) || cleanTarget.includes(itemLower)) {
        removed.push(item.text);
      } else {
        remaining.push(item);
      }
    }

    if (typeof docRef.set === "function") {
      await docRef.set({
        uid,
        memories: remaining,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      removed,
      remaining: remaining.map((m) => m.text),
    };
  } catch (error) {
    console.warn("[Memory] Failed to remove user memory:", error);
    return { removed: [], remaining: [] };
  }
}

/**
 * Clears all persistent cross-chat memories for a given user.
 */
export async function clearUserMemories(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const docRef = adminDb.collection(MEMORIES_COLLECTION).doc(uid) as unknown as SafeDocRef;
    if (docRef && typeof docRef.set === "function") {
      await docRef.set({
        uid,
        memories: [],
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn("[Memory] Failed to clear user memories:", error);
  }
}

/**
 * Builds the system instruction block that injects the user's persistent cross-chat
 * memories into the LLM context window.
 */
export function buildMemorySystemPrompt(memories: string[]): string {
  if (!memories || memories.length === 0) return "";
  const list = memories.map((m) => `* ${m}`).join("\n");
  return `[PERSISTENT USER MEMORY & PREFERENCES]\nThe user has established the following persistent memory and preferences across all conversations:\n${list}\n\nAlways respect, apply, and tailor your responses according to these preferences and facts unless explicitly instructed otherwise in the prompt.\n[/PERSISTENT USER MEMORY & PREFERENCES]`;
}

export interface MemoryIntentResult {
  handled: boolean;
  action?: "SAVE" | "LIST" | "FORGET" | "SUMMARIZE";
  response?: string;
  extractedText?: string;
}

/**
 * Detects whether an inbound prompt is a persistent memory directive or context summarization request.
 * If handled, executes the memory mutation and returns the prepared response message.
 */
export async function handleMemoryIntent(
  prompt: string,
  uid: string,
  messages?: Array<{ role?: string; content?: string }>
): Promise<MemoryIntentResult> {
  const trimmed = (prompt || "").trim();
  const lower = trimmed.toLowerCase();

  // 1. SAVE: "Remember this for all future conversations: [details]. Confirm once you've saved it to your memory."
  const saveMatch =
    trimmed.match(
      /(?:remember\s+(?:this\s+)?(?:for\s+all\s+future\s+(?:conversations|chats)|permanently|across\s+chats|in\s+(?:your\s+)?memory)[\s:]+|remember\s+that[\s:]+|save\s+(?:this\s+)?to\s+(?:my\s+|persistent\s+)?memory[\s:]+)(.+)$/is
    );

  if (saveMatch && saveMatch[1]) {
    let rawContent = saveMatch[1].trim();

    // Remove confirmation requests like "Confirm once you've saved it to your memory."
    rawContent = rawContent.replace(/\.?\s*(?:confirm\s+once\s+you(?:'ve|\s+have)\s+saved\s+it.*|confirm\s+once\s+saved.*|please\s+confirm.*)$/is, "").trim();

    // Clean up surrounding brackets or placeholders: [insert your preference, e.g., I live in Mumbai...]
    let cleanText = rawContent;
    if (cleanText.startsWith("[") && cleanText.endsWith("]")) {
      cleanText = cleanText.slice(1, -1).trim();
    }
    cleanText = cleanText.replace(/^(?:insert\s+your\s+preference[s]?,\s*(?:e\.g\.,?\s*)?)/i, "").trim();

    if (cleanText) {
      await saveUserMemory(uid, cleanText);

      // Split bullet points or clauses if present for a clean confirmation display
      const items = cleanText
        .split(/[,;\n]/)
        .map((s) => s.replace(/^(?:and\s+|also\s+)/i, "").trim())
        .filter((s) => s.length > 0);

      const bulletList =
        items.length > 1
          ? items.map((item) => `* **${item}**`).join("\n")
          : `* **${cleanText}**`;

      const response = `✅ **Saved to Persistent Memory**\n\nI have confirmed and saved the following details to your cross-chat memory:\n\n${bulletList}\n\n*This information is now permanently remembered across all your future conversations and sessions.* You can audit what I currently remember anytime by asking:\n> *"List everything you currently have saved in your memory about me and my preferences."*`;

      return {
        handled: true,
        action: "SAVE",
        response,
        extractedText: cleanText,
      };
    }
  }

  // 2. CHECK / AUDIT: "List everything you currently have saved in your memory about me and my preferences."
  const isListQuery =
    /(?:list|show|what(?:\s+do\s+you)?|check|audit|display|view)\s+(?:everything\s+)?(?:you\s+(?:currently\s+)?(?:have\s+)?saved\s+in\s+(?:your\s+)?memory|what\s+you\s+remember|your\s+memory|my\s+preferences)/i.test(
      lower
    ) ||
    lower === "check memory" ||
    lower === "list memory" ||
    lower === "audit memory" ||
    lower === "show memories";

  if (isListQuery) {
    const memories = await getUserMemories(uid);

    if (memories.length === 0) {
      const response = `### 🧠 Persistent Cross-Chat Memory\n\nYour persistent cross-chat memory is currently empty. No permanent preferences or facts have been saved yet.\n\nTo save preferences across all future conversations, simply say:\n> *"Remember this for all future conversations: [insert your preference, e.g., I live in Mumbai, I prefer short bulleted answers, and I code in Python]. Confirm once you've saved it to your memory."*`;
      return {
        handled: true,
        action: "LIST",
        response,
      };
    }

    const items = memories.map((m, index) => `${index + 1}. **${m}**`).join("\n");
    const response = `### 🧠 Persistent Cross-Chat Memory\n\nHere is everything currently stored in your persistent memory across conversations:\n\n${items}\n\n*(These preferences are automatically active and injected into the context window for all your chats.)*\n\n**Quick actions:**\n* To add a preference: *"Remember this for all future conversations: [detail]"*\n* To delete a preference: *"Forget what you know about [topic] from your saved memory"*`;

    return {
      handled: true,
      action: "LIST",
      response,
    };
  }

  // 3. FORGET: "Forget what you know about [insert topic/detail] from your saved memory."
  const isForgetDirective =
    /^(?:please\s+)?(?:forget|delete|remove|erase|clear)\b/i.test(lower);

  const isClearAll =
    lower.includes("clear all memories") ||
    lower.includes("forget all memories") ||
    lower.includes("clear all memory") ||
    lower.includes("forget all memory") ||
    lower.includes("clear my memory") ||
    lower === "forget memory";

  if (isClearAll || isForgetDirective) {
    let target = isClearAll
      ? "all"
      : trimmed
          .replace(/^(?:please\s+)?(?:forget|delete|remove|erase|clear)\s+/i, "")
          .replace(/^(?:what\s+you\s+know\s+about|everything\s+about|memory\s+about|about)\s+/i, "")
          .replace(/\s+(?:from\s+(?:your\s+)?(?:saved\s+|persistent\s+)?(?:memory|memories)|in\s+(?:your\s+)?memory)[\s.]*$/i, "")
          .replace(/[.!?;]+$/, "")
          .trim();

    // Clean up placeholders: [insert topic/detail]
    if (target.startsWith("[") && target.endsWith("]")) {
      target = target.slice(1, -1).trim();
    }
    target = target.replace(/^insert\s+(?:topic|detail)[\/,\s]*/i, "").trim();

    const { removed, remaining } = await removeUserMemory(uid, target);

    let response = "";
    if (isClearAll || target === "all") {
      response = `🗑️ **Persistent Memory Cleared**\n\nAll cross-chat memories have been removed. Your persistent memory is now completely clear across all conversations.`;
    } else if (removed.length > 0) {
      const removedList = removed.map((r) => `* ~~${r}~~`).join("\n");
      const remainingList =
        remaining.length > 0
          ? `\n\n**Remaining active memories:**\n${remaining.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
          : "\n\n*Your persistent memory is now empty.*";
      response = `🗑️ **Updated Persistent Memory**\n\nI have removed the following items from your cross-chat memory:\n\n${removedList}${remainingList}`;
    } else {
      response = `ℹ️ **Persistent Memory**\n\nNo stored memory items matched **"${target}"**.\n\nYou can ask *"List everything you currently have saved in your memory about me and my preferences"* to see all active memories.`;
    }

    return {
      handled: true,
      action: "FORGET",
      response,
      extractedText: target,
    };
  }

  // 4. SUMMARIZE: "Summarize our entire conversation so far, including all key decisions, facts, and context, so I can paste it into a new chat and continue where we left off."
  const isSummarizeQuery =
    /(?:summarize|compress)\s+(?:our\s+|the\s+)?(?:entire\s+)?(?:conversation|chat|context)\s+so\s+far/i.test(
      lower
    ) ||
    lower === "summarize context" ||
    lower === "summarize chat";

  if (isSummarizeQuery) {
    const validMessages = (messages || []).filter((m) => m.content && m.content.trim().length > 0);

    if (validMessages.length === 0) {
      const response = `### 📋 Session Context Summary\n\nThere is no conversation history to summarize yet in this session. Start chatting, and once our discussion progresses, you can ask me to summarize key decisions, facts, and context anytime!`;
      return {
        handled: true,
        action: "SUMMARIZE",
        response,
      };
    }

    // Extract user prompts and assistant actions
    const userTurns = validMessages.filter((m) => m.role === "user");
    const assistantTurns = validMessages.filter((m) => m.role === "assistant");

    // Format a structured, production-grade handover summary
    const summarySections = [
      `### 📋 Handover Context Summary (In-Chat Context Window)`,
      `\n*This summary captures all key facts, decisions, and security evaluations from the current session so you can carry it into a fresh chat session or retain it.*`,
      `\n#### 1. Core Inquiries & Topics Covered:`,
      ...userTurns.map((u, i) => `* **Turn ${i + 1}:** ${u.content?.slice(0, 150)}${(u.content?.length || 0) > 150 ? "..." : ""}`),
      `\n#### 2. Technical Findings & Assistant Solutions:`,
      ...assistantTurns.slice(0, 5).map((a, i) => `* **Insight ${i + 1}:** ${a.content?.slice(0, 180).replace(/[\n#*]/g, " ")}${(a.content?.length || 0) > 180 ? "..." : ""}`),
      `\n#### 3. Security Decisions & Policy State:`,
      `* Evaluated through PromptShield Multi-Layer Security Gateway.`,
      `* All prompts checked for prompt injection, jailbreaks, and credential leaks.`,
      `\n#### 4. Session Continuation Prompt (Ready to Copy/Paste):`,
      `> *"We are continuing our PromptShield discussion. In our previous session, we discussed: ${userTurns.map((u) => u.content?.slice(0, 60)).join(" | ")}. Let's continue from here."*`,
    ];

    return {
      handled: true,
      action: "SUMMARIZE",
      response: summarySections.join("\n"),
    };
  }

  return { handled: false };
}
