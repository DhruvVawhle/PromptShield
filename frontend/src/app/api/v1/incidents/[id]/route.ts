import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { VALID_INCIDENT_STATUSES, type IncidentStatus } from "@/lib/incidents";
import { redactSensitiveContent } from "@/lib/server/persistence";
import { logAudit } from "@/lib/server/audit";

function formatIncidentDoc(id: string, data: Record<string, any>) {
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
    id,
    promptId: data.promptId || id,
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
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    // 2. Fetch Incident Record
    const docRef = adminDb.collection("security_events").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const docData = docSnap.data();
    if (!docData || docData.uid !== uid) {
      // IDOR protection: return uniform 404
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      incident: formatIncidentDoc(id, docData),
    });
  } catch (error: unknown) {
    console.error("GET /api/v1/incidents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve security incident." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    // 2. Parse & Validate Payload
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be an object." },
        { status: 400 }
      );
    }

    const { status, resolutionNotes } = body;

    if (status === undefined && resolutionNotes === undefined) {
      return NextResponse.json(
        { error: "At least one of 'status' or 'resolutionNotes' must be provided." },
        { status: 400 }
      );
    }

    if (status !== undefined) {
      if (!VALID_INCIDENT_STATUSES.includes(status as IncidentStatus)) {
        return NextResponse.json(
          {
            error: `Invalid incident status. Allowed values: ${VALID_INCIDENT_STATUSES.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    let sanitizedNotes: string | null = null;
    if (resolutionNotes !== undefined) {
      if (typeof resolutionNotes !== "string") {
        return NextResponse.json(
          { error: "'resolutionNotes' must be a string." },
          { status: 400 }
        );
      }
      if (resolutionNotes.length > 1000) {
        return NextResponse.json(
          { error: "'resolutionNotes' cannot exceed 1000 characters." },
          { status: 400 }
        );
      }
      sanitizedNotes = redactSensitiveContent(resolutionNotes.trim()).text;
    }

    // 3. Fetch Document & Verify Ownership
    const docRef = adminDb.collection("security_events").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const docData = docSnap.data();
    if (!docData || docData.uid !== uid) {
      // IDOR protection: return uniform 404
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const previousStatus = docData.status || "OPEN";
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (status !== undefined) {
      updateData.status = status;
      if (status === "RESOLVED" || status === "FALSE_POSITIVE") {
        updateData.resolvedAt = new Date().toISOString();
        updateData.resolvedBy = uid;
      } else {
        updateData.resolvedAt = null;
        updateData.resolvedBy = null;
      }
    }

    if (sanitizedNotes !== null) {
      updateData.resolutionNotes = sanitizedNotes;
    }

    // 4. Update Firestore Record
    await docRef.update(updateData);

    // 5. Write to Audit Log
    const auditAction = status === "RESOLVED" ? "INCIDENT_RESOLVED" : "INCIDENT_STATUS_UPDATED";
    await logAudit(uid, auditAction, {
      incidentId: id,
      previousStatus,
      newStatus: status || previousStatus,
      hasNotes: Boolean(sanitizedNotes),
    });

    const updatedData = { ...docData, ...updateData };

    return NextResponse.json({
      incident: formatIncidentDoc(id, updatedData),
    });
  } catch (error: unknown) {
    console.error("PATCH /api/v1/incidents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update security incident." },
      { status: 500 }
    );
  }
}
