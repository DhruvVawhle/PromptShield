import { NextResponse } from "next/server";
import { authenticateAndAuthorize } from "@/lib/server/rbac";
import {
  getUserMemories,
  saveUserMemory,
  removeUserMemory,
  clearUserMemories,
} from "@/lib/server/memory";

export async function GET(request: Request) {
  const authResult = await authenticateAndAuthorize(request, "ai:infer");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }
  const uid = authResult.uid;

  try {
    const memories = await getUserMemories(uid);
    return NextResponse.json({
      memories,
      count: memories.length,
      uid,
    });
  } catch (error) {
    console.error("[Memory API] Error fetching user memories:", error);
    return NextResponse.json(
      { error: { code: "MEMORY_FETCH_FAILED", message: "Failed to load persistent memories." } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResult = await authenticateAndAuthorize(request, "ai:infer");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }
  const uid = authResult.uid;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: "add" | "forget" | "clear";
      text?: string;
      target?: string;
    };

    if (body.action === "add" && body.text) {
      const memories = await saveUserMemory(uid, body.text);
      return NextResponse.json({
        success: true,
        action: "add",
        memories,
        count: memories.length,
      });
    }

    if (body.action === "forget") {
      const { removed, remaining } = await removeUserMemory(uid, body.target || "");
      return NextResponse.json({
        success: true,
        action: "forget",
        removed,
        memories: remaining,
        count: remaining.length,
      });
    }

    if (body.action === "clear") {
      await clearUserMemories(uid);
      return NextResponse.json({
        success: true,
        action: "clear",
        memories: [],
        count: 0,
      });
    }

    return NextResponse.json(
      { error: { code: "INVALID_ACTION", message: "Valid action ('add', 'forget', 'clear') is required." } },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Memory API] Error mutating memories:", error);
    return NextResponse.json(
      { error: { code: "MEMORY_UPDATE_FAILED", message: "Failed to update persistent memories." } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const authResult = await authenticateAndAuthorize(request, "ai:infer");
  if ("errorResponse" in authResult) {
    return authResult.errorResponse;
  }
  const uid = authResult.uid;

  try {
    await clearUserMemories(uid);
    return NextResponse.json({
      success: true,
      message: "All persistent cross-chat memories have been cleared.",
    });
  } catch (error) {
    console.error("[Memory API] Error clearing memories:", error);
    return NextResponse.json(
      { error: { code: "MEMORY_CLEAR_FAILED", message: "Failed to clear persistent memories." } },
      { status: 500 }
    );
  }
}
