import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateAndAuthorize } from "@/lib/server/rbac";
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

const DEFAULT_SYSTEM_POLICIES = [
  {
    id: "sys_prompt_injection",
    uid: "system",
    name: "System Prompt Injection Guardrail",
    description: "Detects and blocks adversarial instruction overrides, suffix-stripped root evasion, and jailbreaks.",
    category: "Prompt Security",
    action: "BLOCK",
    status: "Active",
    isSystem: true,
    conditions: "Detects instruction overrides (ignore, override, bypass) with risk score >= 75.",
    updatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "sys_pii_redaction",
    uid: "system",
    name: "PII & Secret Sanitization Guardrail",
    description: "Automatically masks credentials, API keys, private keys, credit cards, and SSNs from inbound prompts.",
    category: "Data Protection",
    action: "SANITIZE",
    status: "Active",
    isSystem: true,
    conditions: "Matches high-entropy API keys (sk-, ghp-, AIza), credit card formats, SSNs, and passwords.",
    updatedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    id: "sys_jailbreak_defense",
    uid: "system",
    name: "Jailbreak Persona Neutralizer",
    description: "Quarantines roleplay bypasses, DAN personas, and adversarial hypothetical framing.",
    category: "Content Safety",
    action: "BLOCK",
    status: "Active",
    isSystem: true,
    conditions: "Flags persona hijacking (DAN, evil twin, unrestricted mode) and enforces closed failover.",
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: "sys_code_security",
    uid: "system",
    name: "Encoding & Obfuscation Inspector",
    description: "Detects Base64, Hexadecimal, and Unicode zero-width evasion techniques.",
    category: "Code Security",
    action: "WARN",
    status: "Active",
    isSystem: true,
    conditions: "Normalizes multi-layer obfuscation and alerts analysts on high-entropy evasion.",
    updatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
];

export async function GET(req: Request) {
  try {
    const authResult = await authenticateAndAuthorize(req, "policies:read");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const uid = authResult.uid;

    const { searchParams } = new URL(req.url);
    const includeSystem = searchParams.get("includeSystem") === "true";

    const policiesSnap = await adminDb.collection("policies")
      .where("uid", "==", uid)
      .orderBy("updatedAt", "desc")
      .get();

    const customPolicies = policiesSnap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    const policies = includeSystem ? [...customPolicies, ...DEFAULT_SYSTEM_POLICIES] : customPolicies;

    return NextResponse.json({ policies });
  } catch (error: any) {
    console.error("GET policies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await authenticateAndAuthorize(req, "policies:manage");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const uid = authResult.uid;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    // Validate name
    if (typeof body.name !== "string" || body.name.trim().length === 0 || body.name.length > 200) {
      return NextResponse.json({ error: "Name is required and must be between 1 and 200 characters" }, { status: 400 });
    }

    // Validate action
    if (!body.action || !VALID_ACTIONS.includes(body.action)) {
      return NextResponse.json({ error: "Invalid action. Must be BLOCK, SANITIZE, WARN, or ALLOW" }, { status: 400 });
    }

    // Validate status against explicit enum
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status. Must be Active or Disabled" }, { status: 400 });
    }

    // Validate category
    if (body.category !== undefined && (!VALID_CATEGORIES.includes(body.category) || typeof body.category !== "string")) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    // Validate description and conditions
    if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 1000)) {
      return NextResponse.json({ error: "Description must be a string up to 1000 characters" }, { status: 400 });
    }

    if (body.conditions !== undefined && (typeof body.conditions !== "string" || body.conditions.length > 5000)) {
      return NextResponse.json({ error: "Conditions must be a string up to 5000 characters" }, { status: 400 });
    }

    // Prevent system policy creation - scrub sensitive body before logging
    if (body.isSystem === true) {
      try {
        await logAudit(uid, "UNAUTHORIZED_ACCESS_ATTEMPT", {
          reason: "Attempted to create system policy",
          attemptedName: body.name.substring(0, 100),
          attemptedCategory: typeof body.category === "string" ? body.category.substring(0, 100) : undefined,
        });
      } catch (auditErr) {
        console.error("Audit log error on unauthorized system policy creation:", auditErr);
      }
      return NextResponse.json({ error: "Cannot create system policies" }, { status: 403 });
    }

    const newPolicy = {
      uid,
      tenantId: authResult.tenantId,
      name: body.name.trim(),
      description: typeof body.description === "string" ? body.description.trim() : "",
      category: body.category || "Custom",
      action: body.action,
      status: body.status,
      isSystem: false,
      conditions: typeof body.conditions === "string" ? body.conditions : "",
      updatedAt: new Date().toISOString()
    };

    // Atomic consistency: write policy mutation and audit record together in a batch
    const batch = adminDb.batch();
    const policyRef = adminDb.collection("policies").doc();
    const auditRef = adminDb.collection("audit_logs").doc();

    batch.set(policyRef, newPolicy);
    batch.set(auditRef, {
      uid,
      action: "POLICY_CREATED",
      details: {
        policyId: policyRef.id,
        name: newPolicy.name,
        action: newPolicy.action
      },
      timestamp: new Date().toISOString()
    });

    await batch.commit();

    return NextResponse.json({ policy: { id: policyRef.id, ...newPolicy } }, { status: 201 });
  } catch (error: any) {
    console.error("POST policies error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
