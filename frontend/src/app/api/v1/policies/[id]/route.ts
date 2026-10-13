import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { logAudit } from "@/lib/server/audit";

const VALID_ACTIONS = ["BLOCK", "SANITIZE", "WARN", "ALLOW"];
const VALID_STATUSES = ["Active", "Disabled"];
const VALID_CATEGORIES = [
  "Prompt Security",
  "Data Protection",
  "Content Safety",
  "Access Control",
  "Code Security",
  "Custom",
];

async function authenticateRequest(req: Request): Promise<{ uid: string } | { errorResponse: NextResponse }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { errorResponse: NextResponse.json({ error: "Missing or invalid token" }, { status: 401 }) };
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token, true);
    return { uid: decodedToken.uid };
  } catch (err) {
    return {
      errorResponse: NextResponse.json(
        { error: "Invalid or expired authentication token" },
        { status: 401 }
      ),
    };
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authenticateRequest(req);
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const uid = authResult.uid;
    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    // Prevent overriding system flag and uid
    if (body.isSystem !== undefined || body.uid !== undefined) {
      return NextResponse.json({ error: "Cannot modify protected fields" }, { status: 400 });
    }

    const docRef = adminDb.collection("policies").doc(id);
    const docSnap = await docRef.get();

    // Prevent policy ID enumeration by returning uniform 404 for missing and unowned policies
    if (!docSnap.exists || docSnap.data()?.uid !== uid) {
      if (docSnap.exists && docSnap.data()?.uid !== uid) {
        try {
          await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
            reason: "Attempted to update policy owned by another user",
            policyId: id
          });
        } catch (auditErr) {
          console.error("Audit log error on unauthorized update attempt:", auditErr);
        }
      }
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const data = docSnap.data();

    if (data?.isSystem) {
      try {
        await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
          reason: "Attempted to modify system policy",
          policyId: id
        });
      } catch (auditErr) {
        console.error("Audit log error on unauthorized system policy modification:", auditErr);
      }
      return NextResponse.json({ error: "Cannot modify system policies" }, { status: 403 });
    }

    // Strict field validation
    if (body.action !== undefined && (!body.action || !VALID_ACTIONS.includes(body.action))) {
      return NextResponse.json({ error: "Invalid action. Must be BLOCK, SANITIZE, WARN, or ALLOW" }, { status: 400 });
    }

    if (body.status !== undefined && (!body.status || !VALID_STATUSES.includes(body.status))) {
      return NextResponse.json({ error: "Invalid status. Must be Active or Disabled" }, { status: 400 });
    }

    if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length === 0 || body.name.length > 200)) {
      return NextResponse.json({ error: "Name must be a string between 1 and 200 characters" }, { status: 400 });
    }

    if (body.category !== undefined && (!VALID_CATEGORIES.includes(body.category) || typeof body.category !== "string")) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 1000)) {
      return NextResponse.json({ error: "Description must be a string up to 1000 characters" }, { status: 400 });
    }

    if (body.conditions !== undefined && (typeof body.conditions !== "string" || body.conditions.length > 5000)) {
      return NextResponse.json({ error: "Conditions must be a string up to 5000 characters" }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.action !== undefined) updates.action = body.action;
    if (body.status !== undefined) updates.status = body.status;
    if (body.conditions !== undefined) updates.conditions = body.conditions;

    // Atomic consistency: execute update and audit write together in a batch
    const batch = adminDb.batch();
    batch.update(docRef, updates);

    const auditRef = adminDb.collection("audit_logs").doc();
    batch.set(auditRef, {
      uid,
      action: "POLICY_UPDATED",
      details: {
        policyId: id,
        updates
      },
      timestamp: new Date().toISOString()
    });

    if (body.status !== undefined && body.status !== data?.status) {
      const statusAuditRef = adminDb.collection("audit_logs").doc();
      batch.set(statusAuditRef, {
        uid,
        action: "POLICY_ACTIVATION_CHANGED",
        details: {
          policyId: id,
          oldStatus: data?.status,
          newStatus: body.status
        },
        timestamp: new Date().toISOString()
      });
    }

    await batch.commit();

    return NextResponse.json({ message: "Policy updated successfully" });
  } catch (error: any) {
    console.error("PUT policy error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authenticateRequest(req);
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const uid = authResult.uid;
    const { id } = await params;

    const docRef = adminDb.collection("policies").doc(id);
    const docSnap = await docRef.get();

    // Prevent policy ID enumeration by returning uniform 404 for missing and unowned policies
    if (!docSnap.exists || docSnap.data()?.uid !== uid) {
      if (docSnap.exists && docSnap.data()?.uid !== uid) {
        try {
          await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
            reason: "Attempted to delete policy owned by another user",
            policyId: id
          });
        } catch (auditErr) {
          console.error("Audit log error on unauthorized delete attempt:", auditErr);
        }
      }
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const data = docSnap.data();

    if (data?.isSystem) {
      try {
        await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
          reason: "Attempted to delete system policy",
          policyId: id
        });
      } catch (auditErr) {
        console.error("Audit log error on unauthorized system policy deletion:", auditErr);
      }
      return NextResponse.json({ error: "Cannot delete system policies" }, { status: 403 });
    }

    // Atomic consistency: execute delete and audit write together in a batch
    const batch = adminDb.batch();
    batch.delete(docRef);

    const auditRef = adminDb.collection("audit_logs").doc();
    batch.set(auditRef, {
      uid,
      action: "POLICY_DELETED",
      details: {
        policyId: id,
        name: data?.name
      },
      timestamp: new Date().toISOString()
    });

    await batch.commit();

    return NextResponse.json({ message: "Policy deleted successfully" });
  } catch (error: any) {
    console.error("DELETE policy error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
