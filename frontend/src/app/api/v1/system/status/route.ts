import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getSystemStatus } from "@/lib/server/system-status";

export async function GET(req: Request) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    try {
      await adminAuth.verifyIdToken(token, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired authentication token" },
        { status: 401 }
      );
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
