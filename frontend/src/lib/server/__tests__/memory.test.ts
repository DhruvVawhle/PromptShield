import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";

import {
  getUserMemories,
  saveUserMemory,
  removeUserMemory,
  clearUserMemories,
  buildMemorySystemPrompt,
  handleMemoryIntent,
} from "@/lib/server/memory";

describe("Cross-Chat Persistent AI Memory & Context Window Engine", () => {
  const testUid = "test-memory-user-999";

  beforeEach(async () => {
    await clearUserMemories(testUid);
  });

  describe("1. Save a detail to cross-chat memory", () => {
    test("saves user preference when requested with 'Remember this for all future conversations:'", async () => {
      const prompt =
        "Remember this for all future conversations: I live in Mumbai, I prefer short bulleted answers, and I code in Python. Confirm once you've saved it to your memory.";

      const result = await handleMemoryIntent(prompt, testUid);

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.action, "SAVE");
      assert.ok(result.response?.includes("Saved to Persistent Memory"));
      assert.ok(result.response?.includes("I live in Mumbai"));
      assert.ok(result.response?.includes("I code in Python"));

      const saved = await getUserMemories(testUid);
      assert.strictEqual(saved.length, 1);
      assert.ok(saved[0].includes("I live in Mumbai"));
    });

    test("handles bracketed placeholder format e.g. [insert your preference...]", async () => {
      const prompt =
        "Remember this for all future conversations: [insert your preference, e.g., I live in Mumbai, I prefer short bulleted answers, and I code in Python]. Confirm once you've saved it to your memory.";

      const result = await handleMemoryIntent(prompt, testUid);

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.action, "SAVE");
      assert.ok(result.response?.includes("Saved to Persistent Memory"));
      assert.ok(!result.response?.includes("[insert your preference"));

      const saved = await getUserMemories(testUid);
      assert.ok(saved[0].includes("I live in Mumbai"));
    });

    test("prevents duplicate memory entries", async () => {
      await saveUserMemory(testUid, "I live in Mumbai");
      await saveUserMemory(testUid, "I live in Mumbai");

      const saved = await getUserMemories(testUid);
      assert.strictEqual(saved.length, 1);
    });
  });

  describe("2. Check what the AI currently remembers", () => {
    test("returns formatted audit when memories exist", async () => {
      await saveUserMemory(testUid, "I live in Mumbai, I prefer short bulleted answers, and I code in Python");

      const prompt = "List everything you currently have saved in your memory about me and my preferences.";
      const result = await handleMemoryIntent(prompt, testUid);

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.action, "LIST");
      assert.ok(result.response?.includes("Persistent Cross-Chat Memory"));
      assert.ok(result.response?.includes("I live in Mumbai"));
      assert.ok(result.response?.includes("Quick actions:"));
    });

    test("returns informative empty guidance message when no memories are saved", async () => {
      const prompt = "List everything you currently have saved in your memory about me and my preferences.";
      const result = await handleMemoryIntent(prompt, testUid);

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.action, "LIST");
      assert.ok(result.response?.includes("currently empty"));
      assert.ok(result.response?.includes("Remember this for all future conversations"));
    });
  });

  describe("3. Summarize in-chat context before it gets too long", () => {
    test("generates structured handover summary from active context window messages", async () => {
      const activeMessages = [
        { role: "user", content: "What is an IDOR vulnerability and how do attackers exploit it?" },
        {
          role: "assistant",
          content: "Insecure Direct Object Reference (IDOR) happens when an app exposes internal object references without authorization checks.",
        },
        { role: "user", content: "How do we fix IDOR in Next.js server actions?" },
        {
          role: "assistant",
          content: "Always check authorization against the authenticated user UID on the server before database queries.",
        },
      ];

      const prompt =
        "Summarize our entire conversation so far, including all key decisions, facts, and context, so I can paste it into a new chat and continue where we left off.";

      const result = await handleMemoryIntent(prompt, testUid, activeMessages);

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.action, "SUMMARIZE");
      assert.ok(result.response?.includes("Handover Context Summary"));
      assert.ok(result.response?.includes("IDOR vulnerability"));
      assert.ok(result.response?.includes("Session Continuation Prompt"));
    });

    test("returns empty context guidance when conversation has no prior messages", async () => {
      const prompt = "Summarize our entire conversation so far";
      const result = await handleMemoryIntent(prompt, testUid, []);

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.action, "SUMMARIZE");
      assert.ok(result.response?.includes("There is no conversation history to summarize yet"));
    });
  });

  describe("4. Forget specific details", () => {
    test("forgets specific topic and retains remaining memories", async () => {
      await saveUserMemory(testUid, "I live in Mumbai");
      await saveUserMemory(testUid, "I code in Python");

      const prompt = "Forget what you know about Python from your saved memory.";
      const result = await handleMemoryIntent(prompt, testUid);

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.action, "FORGET");
      assert.ok(result.response?.includes("Updated Persistent Memory"));
      assert.ok(result.response?.includes("Python"));
      assert.ok(result.response?.includes("I live in Mumbai"));

      const saved = await getUserMemories(testUid);
      assert.strictEqual(saved.length, 1);
      assert.strictEqual(saved[0], "I live in Mumbai");
    });

    test("clears all memories when 'clear all memories' is requested", async () => {
      await saveUserMemory(testUid, "Preference 1");
      await saveUserMemory(testUid, "Preference 2");

      const prompt = "Clear all memories from your saved memory.";
      const result = await handleMemoryIntent(prompt, testUid);

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.action, "FORGET");
      assert.ok(result.response?.includes("All cross-chat memories have been removed"));

      const saved = await getUserMemories(testUid);
      assert.strictEqual(saved.length, 0);
    });
  });

  describe("5. System Prompt Injection for Cross-Chat Memory Grounding", () => {
    test("buildMemorySystemPrompt creates structured prompt section when memories exist", () => {
      const memories = ["User lives in Mumbai", "Prefers short answers", "Codes in Python"];
      const prompt = buildMemorySystemPrompt(memories);

      assert.ok(prompt.includes("[PERSISTENT USER MEMORY & PREFERENCES]"));
      assert.ok(prompt.includes("* User lives in Mumbai"));
      assert.ok(prompt.includes("* Prefers short answers"));
      assert.ok(prompt.includes("* Codes in Python"));
      assert.ok(prompt.includes("[/PERSISTENT USER MEMORY & PREFERENCES]"));
    });

    test("buildMemorySystemPrompt returns empty string when memories are empty", () => {
      assert.strictEqual(buildMemorySystemPrompt([]), "");
    });
  });
});
