import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateAndAuthorize, canAssignRole, normalizeUserRole, type UserRole } from "@/lib/server/rbac";
import { logAudit } from "@/lib/server/audit";
import { enforceRateLimit, getRateLimitHeaders } from "@/lib/server/rate-limiter";

export async function GET(req: Request) {
  try {
    const authResult = await authenticateAndAuthorize(req, "users:read");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const currentUid = authResult.uid;

    const rlResult = await enforceRateLimit(currentUid, "STANDARD_API");
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

    const callerTenantId = authResult.tenantId;
    const snapshot = await adminDb.collection("users").get();
    const users = snapshot.docs
      .filter((doc: any) => {
        const data = doc.data() || {};
        const docTenant = data.tenantId || (data.invitedBy === currentUid ? callerTenantId : doc.id);
        return docTenant === callerTenantId || doc.id === currentUid;
      })
      .map((doc: any) => {
      const data = doc.data();
      const role: UserRole = normalizeUserRole(data.role);
      return {
        id: doc.id,
        uid: doc.id,
        name: data.name || data.email?.split("@")[0] || "User",
        email: data.email || "",
        role,
        photoURL: data.photoURL || null,
        status: data.status || "Active",
        mfaEnabled: Boolean(data.mfaEnabled ?? true),
        lastActive: data.updatedAt
          ? typeof data.updatedAt === "string"
            ? data.updatedAt
            : "Recently"
          : "Recently",
        isCurrentUser: doc.id === currentUid,
      };
    });

    // If current user is not in Firestore users list yet, include them
    if (!users.some((u: any) => u.uid === currentUid)) {
      users.unshift({
        id: currentUid,
        uid: currentUid,
        name: authResult.decodedToken.email?.split("@")[0] || "Current User",
        email: authResult.decodedToken.email || "user@promptshield.io",
        role: authResult.role,
        photoURL: null,
        status: "Active",
        mfaEnabled: true,
        lastActive: "Just now",
        isCurrentUser: true,
      });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/v1/users error:", error);
    return NextResponse.json({ error: "Failed to retrieve team members." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await authenticateAndAuthorize(req, "users:manage");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const callerUid = authResult.uid;
    const callerRole = authResult.role;

    const rlResult = await enforceRateLimit(callerUid, "STANDARD_API");
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { email, role: rawRole } = body;
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const targetRole = normalizeUserRole(rawRole);

    // Prevent privilege escalation
    if (!canAssignRole(callerRole, targetRole)) {
      return NextResponse.json(
        {
          error: `Privilege escalation blocked. Role '${callerRole}' cannot grant role '${targetRole}'.`,
          code: "PRIVILEGE_ESCALATION_DENIED",
        },
        { status: 403 }
      );
    }

    const newUserId = `inv_${Date.now()}`;
    const name = email.split("@")[0];
    const newMember = {
      uid: newUserId,
      tenantId: authResult.tenantId,
      name,
      email: email.trim().toLowerCase(),
      role: targetRole,
      status: "Invited",
      invitedBy: callerUid,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection("users").doc(newUserId).set(newMember);

    // Cryptographic audit trail
    await logAudit(callerUid, "USER_INVITED", {
      invitedEmail: newMember.email,
      assignedRole: targetRole,
      invitedUserId: newUserId,
    });

    return NextResponse.json(
      {
        user: {
          id: newUserId,
          ...newMember,
          isCurrentUser: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/v1/users error:", error);
    return NextResponse.json({ error: "Failed to invite user." }, { status: 500 });
  }
}
