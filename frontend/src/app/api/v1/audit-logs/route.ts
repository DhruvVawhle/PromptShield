import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { VALID_AUDIT_ACTIONS, type AuditAction } from "@/lib/server/audit";
import { redactSensitiveContent } from "@/lib/server/persistence";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function sanitizeDetails(data: unknown): unknown {
  if (typeof data === "string") {
    return redactSensitiveContent(data).text;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeDetails);
  }
  if (data !== null && typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Disallow potential credential keys from leaking raw values
      if (/password|secret|private_key|token/i.test(key) && typeof value === "string") {
        sanitizedObj[key] = "[REDACTED_CREDENTIAL]";
      } else {
        sanitizedObj[key] = sanitizeDetails(value);
      }
    }
    return sanitizedObj;
  }
  return data;
}

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
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired authentication token" },
        { status: 401 }
      );
    }

    // UID is derived exclusively from the verified token
    const uid = decodedToken.uid;

    // 2. Parse & Validate Query Parameters
    const { searchParams } = new URL(req.url);

    // Action filter
    const actionParam = searchParams.get("action");
    if (actionParam !== null && actionParam !== "") {
      if (!VALID_AUDIT_ACTIONS.includes(actionParam as AuditAction)) {
        return NextResponse.json(
          {
            error: `Invalid action filter. Allowed values: ${VALID_AUDIT_ACTIONS.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Date range validation
    const startDateParam = searchParams.get("startDate");
    let startIso: string | undefined;
    if (startDateParam !== null && startDateParam !== "") {
      const parsedStart = Date.parse(startDateParam);
      if (isNaN(parsedStart)) {
        return NextResponse.json(
          { error: "Invalid startDate format. Must be a valid ISO-8601 date string." },
          { status: 400 }
        );
      }
      startIso = new Date(parsedStart).toISOString();
    }

    const endDateParam = searchParams.get("endDate");
    let endIso: string | undefined;
    if (endDateParam !== null && endDateParam !== "") {
      const parsedEnd = Date.parse(endDateParam);
      if (isNaN(parsedEnd)) {
        return NextResponse.json(
          { error: "Invalid endDate format. Must be a valid ISO-8601 date string." },
          { status: 400 }
        );
      }
      endIso = new Date(parsedEnd).toISOString();
    }

    if (startIso && endIso && startIso > endIso) {
      return NextResponse.json(
        { error: "startDate must be before or equal to endDate." },
        { status: 400 }
      );
    }

    // Limit validation
    const limitParam = searchParams.get("limit");
    let limit = DEFAULT_LIMIT;
    if (limitParam !== null && limitParam !== "") {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          { error: "Limit must be a positive integer." },
          { status: 400 }
        );
      }
      if (parsedLimit > MAX_LIMIT) {
        return NextResponse.json(
          { error: `Limit cannot exceed maximum of ${MAX_LIMIT}.` },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }

    // Cursor validation
    const cursorParam = searchParams.get("cursor");
    let cursorData: { timestamp: string; id: string } | null = null;
    if (cursorParam !== null && cursorParam !== "") {
      try {
        const decodedStr = Buffer.from(cursorParam, "base64").toString("utf-8");
        const parsed = JSON.parse(decodedStr);
        if (
          !parsed ||
          typeof parsed.timestamp !== "string" ||
          typeof parsed.id !== "string" ||
          isNaN(Date.parse(parsed.timestamp))
        ) {
          return NextResponse.json(
            { error: "Invalid pagination cursor format." },
            { status: 400 }
          );
        }
        cursorData = { timestamp: parsed.timestamp, id: parsed.id };
      } catch {
        return NextResponse.json(
          { error: "Malformed pagination cursor." },
          { status: 400 }
        );
      }
    }

    // 3. Build & Execute Firestore Query (Owner-Scoped)
    let query: any = adminDb.collection("audit_logs").where("uid", "==", uid);

    if (actionParam) {
      query = query.where("action", "==", actionParam);
    }
    if (startIso) {
      query = query.where("timestamp", ">=", startIso);
    }
    if (endIso) {
      query = query.where("timestamp", "<=", endIso);
    }

    query = query.orderBy("timestamp", "desc");

    if (cursorData && typeof query.startAfter === "function") {
      query = query.startAfter(cursorData.timestamp);
    }

    query = query.limit(limit + 1);

    const snapshot = await query.get();
    const rawDocs = snapshot.docs || [];

    const hasMore = rawDocs.length > limit;
    const pageDocs = hasMore ? rawDocs.slice(0, limit) : rawDocs;

    const logs = pageDocs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action,
        timestamp: data.timestamp,
        details: sanitizeDetails(data.details || {}),
      };
    });

    const nextCursor =
      hasMore && pageDocs.length > 0
        ? Buffer.from(
            JSON.stringify({
              timestamp: pageDocs[pageDocs.length - 1].data().timestamp,
              id: pageDocs[pageDocs.length - 1].id,
            })
          ).toString("base64")
        : null;

    return NextResponse.json({
      logs,
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error: any) {
    console.error("GET audit-logs error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit logs." },
      { status: 500 }
    );
  }
}
