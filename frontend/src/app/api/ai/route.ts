import { NextResponse } from "next/server";

import { callOmniRoute, getSafeProviderMessage } from "@/lib/omniroute";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      prompt?: string;
      model?: string;
      messages?: Array<{ role?: string; content?: string }>;
    };

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : Array.isArray(body.messages) && body.messages.length > 0
          ? body.messages
              .map((message) => message.content ?? "")
              .join("\n")
              .trim()
          : "";

    if (!prompt) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_PROMPT",
            message: "A valid prompt is required.",
          },
        },
        { status: 400 },
      );
    }

    const result = await callOmniRoute(prompt);

    return NextResponse.json(
      {
        provider: result.provider,
        model: result.model,
        content: result.content,
      },
      { status: 200 },
    );
  } catch (error) {
    const safeMessage = getSafeProviderMessage(error);
    const code = (error as Error & { code?: string })?.code ?? "PROVIDER_ERROR";

    return NextResponse.json(
      {
        error: {
          code,
          message: safeMessage,
        },
      },
      { status: 502 },
    );
  }
}
