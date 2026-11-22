import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateAndAuthorize } from "@/lib/server/rbac";
import { VALID_AUDIT_ACTIONS, type AuditAction, verifyAuditRecord } from "@/lib/server/audit";
import { redactSensitiveContent } from "@/lib/server/persistence";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/server/rate-limiter";

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
    // 1. Authenticate & Authorize Request
    const authResult = await authenticateAndAuthorize(req, "audit:read");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const uid = authResult.uid;

    // 2. Enforce Rate Limiting
    const rlResult = await enforceRateLimit(uid, "STANDARD_API");
    if (!rlResult.success) {
      const status = rlResult.errorType === "INFRASTRUCTURE_UNAVAILABLE" ? 503 : 429;
      return NextResponse.json(
        {
          error: {
            code: rlResult.errorType || "RATE_LIMIT_EXCEEDED",
            message: rlResult.reason || "Rate limit exceeded.",
            retryAfter: rlResult.retryAfter,
          },
        },
        { status, headers: getRateLimitHeaders(rlResult) }
      );
    }

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
      const hasCrypto = Boolean(data.recordHash && data.signature);
      let isVerified = false;
      if (hasCrypto) {
        try {
          isVerified = verifyAuditRecord({
            uid: data.uid || uid,
            action: data.action,
            details: data.details || {},
            timestamp: data.timestamp,
            previousHash: data.previousHash || "",
            recordHash: data.recordHash,
            signature: data.signature,
            keyId: data.keyId || "v1",
          }).valid;
        } catch {
          isVerified = false;
        }
      }
      return {
        id: doc.id,
        action: data.action,
        timestamp: data.timestamp,
        details: sanitizeDetails(data.details || {}),
        previousHash: data.previousHash,
        recordHash: data.recordHash,
        signature: data.signature,
        isVerified,
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

export async function POST() {
  return NextResponse.json(
    { error: "Method Not Allowed. Audit logs are append-only and cannot be created via client API." },
    { status: 405, headers: { Allow: "GET" } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method Not Allowed. Audit logs are append-only and cannot be modified." },
    { status: 405, headers: { Allow: "GET" } }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method Not Allowed. Audit logs are append-only and cannot be modified." },
    { status: 405, headers: { Allow: "GET" } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method Not Allowed. Audit logs cannot be deleted." },
    { status: 405, headers: { Allow: "GET" } }
  );
}
