import { NextResponse } from "next/server";
import { checkGeminiHealth } from "@/lib/gemini";

export async function GET() {
  const health = await checkGeminiHealth();

  return NextResponse.json(health, {
    status: health.ok ? 200 : 503,
  });
}
