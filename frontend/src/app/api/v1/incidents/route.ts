import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { VALID_INCIDENT_STATUSES, type IncidentStatus } from "@/lib/incidents";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VALID_SEVERITIES = ["CRITICAL", "HIGH", "MODERATE", "MEDIUM", "LOW"] as const;

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

    const uid = decodedToken.uid;

    // 2. Parse & Validate Query Parameters
    const { searchParams } = new URL(req.url);

    // Status filter
    const statusParam = searchParams.get("status");
    if (statusParam !== null && statusParam !== "") {
      if (!VALID_INCIDENT_STATUSES.includes(statusParam as IncidentStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status filter. Allowed values: ${VALID_INCIDENT_STATUSES.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    // Severity filter
    const severityParam = searchParams.get("severity")?.toUpperCase();
    if (severityParam && !VALID_SEVERITIES.includes(severityParam as any)) {
      return NextResponse.json(
        {
          error: `Invalid severity filter. Allowed values: ${VALID_SEVERITIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Category filter
    const categoryParam = searchParams.get("category");

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
    let query: any = adminDb.collection("security_events").where("uid", "==", uid);

    if (statusParam) {
      query = query.where("status", "==", statusParam);
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

    const incidents = pageDocs
      .map((doc: any) => {
        const data = doc.data();
        const riskScore = typeof data.riskScore === "number" ? data.riskScore : 0;
        let riskLevel = data.riskLevel;
        if (!riskLevel) {
          if (riskScore >= 75) riskLevel = "CRITICAL";
          else if (riskScore >= 50) riskLevel = "HIGH";
          else if (riskScore >= 25) riskLevel = "MODERATE";
          else riskLevel = "LOW";
        }

        const primaryCategory =
          data.threatCategory ||
          (Array.isArray(data.categories) && data.categories[0]) ||
          "UNCATEGORIZED";

        const categories = Array.isArray(data.categories)
          ? data.categories
          : data.threatCategory
          ? [data.threatCategory]
          : [];

        const timestampStr =
          typeof data.timestamp === "string"
            ? data.timestamp
            : data.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString();

        return {
          id: doc.id,
          promptId: data.promptId || doc.id,
          timestamp: timestampStr,
          riskScore,
          riskLevel,
          threatCategory: primaryCategory,
          categories,
          decision: data.decision || "ALLOW",
          status: (data.status as IncidentStatus) || "OPEN",
          resolutionNotes: data.resolutionNotes || null,
          resolvedAt: data.resolvedAt || null,
          resolvedBy: data.resolvedBy || null,
          promptSnippet: data.promptSnippet || (typeof data.prompt === "string" ? data.prompt.slice(0, 200) : null),
          triggeredRuleIds: Array.isArray(data.triggeredRuleIds) ? data.triggeredRuleIds : [],
          policyId: data.policyId || data.policy || null,
          latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : null,
        };
      })
      .filter((inc: any) => {
        if (severityParam) {
          const mappedSev = inc.riskLevel === "MODERATE" ? "MEDIUM" : inc.riskLevel;
          const filterSev = severityParam === "MODERATE" ? "MEDIUM" : severityParam;
          if (mappedSev !== filterSev && inc.riskLevel !== severityParam) return false;
        }
        if (categoryParam) {
          const matchCat = inc.categories.some((c: string) =>
            c.toLowerCase().includes(categoryParam.toLowerCase())
          );
          if (!matchCat && !inc.threatCategory.toLowerCase().includes(categoryParam.toLowerCase())) {
            return false;
          }
        }
        return true;
      });

    const nextCursor =
      hasMore && pageDocs.length > 0
        ? Buffer.from(
            JSON.stringify({
              timestamp:
                typeof pageDocs[pageDocs.length - 1].data().timestamp === "string"
                  ? pageDocs[pageDocs.length - 1].data().timestamp
                  : pageDocs[pageDocs.length - 1].data().timestamp?.toDate?.()?.toISOString?.() ||
                    new Date().toISOString(),
              id: pageDocs[pageDocs.length - 1].id,
            })
          ).toString("base64")
        : null;

    return NextResponse.json({
      incidents,
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/v1/incidents error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve security incidents." },
      { status: 500 }
    );
  }
}
