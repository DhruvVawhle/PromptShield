import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { logAudit } from "@/lib/server/audit";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const policiesSnap = await adminDb.collection("policies")
      .where("uid", "==", uid)
      .orderBy("updatedAt", "desc")
      .get();

    const policies = policiesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ policies });
  } catch (error: any) {
    console.error("GET policies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const body = await req.json();

    // Validate fields
    if (!body.name || !body.action || !body.status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["BLOCK", "SANITIZE", "WARN", "ALLOW"].includes(body.action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (body.isSystem === true) {
      await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
        reason: "Attempted to create system policy",
        body
      });
      return NextResponse.json({ error: "Cannot create system policies" }, { status: 403 });
    }

    const newPolicy = {
      uid,
      name: body.name,
      description: body.description || "",
      category: body.category || "Custom",
      action: body.action,
      status: body.status,
      isSystem: false,
      conditions: body.conditions || "",
      updatedAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection("policies").add(newPolicy);
    
    await logAudit(uid, "POLICY_CREATED", {
      policyId: docRef.id,
      name: newPolicy.name,
      action: newPolicy.action
    });

    return NextResponse.json({ policy: { id: docRef.id, ...newPolicy } }, { status: 201 });
  } catch (error: any) {
    console.error("POST policies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
