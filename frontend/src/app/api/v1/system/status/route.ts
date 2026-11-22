import { NextResponse } from "next/server";
import { authenticateAndAuthorize } from "@/lib/server/rbac";
import { getSystemStatus } from "@/lib/server/system-status";

export async function GET(req: Request) {
  try {
    // 1. Authenticate & Authorize Request
    const authResult = await authenticateAndAuthorize(req, "system:read");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }

    // 2. Parse Query Options
    const { searchParams } = new URL(req.url);
    const fresh = searchParams.get("fresh") === "true";

    // 3. Retrieve System Diagnostic Status
    const statusReport = await getSystemStatus(fresh);

    return NextResponse.json(statusReport, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/v1/system/status error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate system diagnostic status." },
      { status: 500 }
    );
  }
}
