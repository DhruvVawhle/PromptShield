import { NextResponse } from "next/server";

import { checkOmniRouteHealth } from "@/lib/omniroute";

export async function GET() {
  const health = await checkOmniRouteHealth();

  return NextResponse.json(health, {
    status: health.ok ? 200 : 503,
  });
}
