import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { logAudit } from "@/lib/server/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const { id } = await params;

    const body = await req.json();
    const docRef = adminDb.collection("policies").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const data = docSnap.data();
    if (data?.uid !== uid) {
      await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
        reason: "Attempted to update policy owned by another user",
        policyId: id
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (data?.isSystem) {
      await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
        reason: "Attempted to modify system policy",
        policyId: id
      });
      return NextResponse.json({ error: "Cannot modify system policies" }, { status: 403 });
    }

    if (body.action && !["BLOCK", "SANITIZE", "WARN", "ALLOW"].includes(body.action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category;
    if (body.action !== undefined) updates.action = body.action;
    if (body.status !== undefined) updates.status = body.status;
    if (body.conditions !== undefined) updates.conditions = body.conditions;

    // Prevent overriding system flag and uid
    if (body.isSystem !== undefined || body.uid !== undefined) {
      return NextResponse.json({ error: "Cannot modify protected fields" }, { status: 400 });
    }

    await docRef.update(updates);

    if (body.status !== undefined && body.status !== data?.status) {
      await logAudit(uid, "POLICY_ACTIVATION_CHANGED", {
        policyId: id,
        oldStatus: data?.status,
        newStatus: body.status
      });
    }

    await logAudit(uid, "POLICY_UPDATED", {
      policyId: id,
      updates
    });

    return NextResponse.json({ message: "Policy updated successfully" });
  } catch (error: any) {
    console.error("PUT policy error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const { id } = await params;

    const docRef = adminDb.collection("policies").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const data = docSnap.data();
    if (data?.uid !== uid) {
      await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
        reason: "Attempted to delete policy owned by another user",
        policyId: id
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (data?.isSystem) {
      await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
        reason: "Attempted to delete system policy",
        policyId: id
      });
      return NextResponse.json({ error: "Cannot delete system policies" }, { status: 403 });
    }

    await docRef.delete();

    await logAudit(uid, "POLICY_DELETED", {
      policyId: id,
      name: data?.name
    });

    return NextResponse.json({ message: "Policy deleted successfully" });
  } catch (error: any) {
    console.error("DELETE policy error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
