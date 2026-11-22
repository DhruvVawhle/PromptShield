import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateAndAuthorize, canAssignRole, normalizeUserRole, type UserRole } from "@/lib/server/rbac";
import { logAudit } from "@/lib/server/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateAndAuthorize(req, "users:manage");
    if ("errorResponse" in authResult) {
      return authResult.errorResponse;
    }
    const callerUid = authResult.uid;
    const callerRole = authResult.role;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { role: rawRole, status } = body;
    if (!rawRole && !status) {
      return NextResponse.json({ error: "At least one of 'role' or 'status' must be provided." }, { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const callerTenantId = authResult.tenantId;
    const targetTenantId = (userData.tenantId as string) || (userData.invitedBy === callerUid ? callerTenantId : id);

    // Cross-tenant IDOR protection: return uniform 404 if targeting a user from a different tenant
    if (callerRole !== "SUPER_ADMIN" && callerTenantId !== targetTenantId && userData.invitedBy !== callerUid && id !== callerUid) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const currentTargetRole: UserRole = normalizeUserRole(userData.role);

    // Only SUPER_ADMIN can modify another SUPER_ADMIN
    if (currentTargetRole === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only a SUPER_ADMIN can modify another SUPER_ADMIN.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (rawRole) {
      const newRole = normalizeUserRole(rawRole);

      // Prevent privilege escalation
      if (!canAssignRole(callerRole, newRole)) {
        return NextResponse.json(
          {
            error: `Privilege escalation blocked. Role '${callerRole}' cannot grant role '${newRole}'.`,
            code: "PRIVILEGE_ESCALATION_DENIED",
          },
          { status: 403 }
        );
      }

      updates.role = newRole;
    }

    if (status && (status === "Active" || status === "Disabled" || status === "Invited")) {
      updates.status = status;
    }

    await userRef.update(updates);

    // Cryptographic audit trail
    await logAudit(callerUid, "USER_ROLE_UPDATED", {
      targetUserId: id,
      previousRole: currentTargetRole,
      newRole: updates.role || currentTargetRole,
      updatedStatus: updates.status,
    });

    const updatedUser = {
      id,
      uid: id,
      name: userData.name || userData.email?.split("@")[0] || "User",
      email: userData.email || "",
      role: updates.role || currentTargetRole,
      status: updates.status || userData.status || "Active",
      mfaEnabled: Boolean(userData.mfaEnabled ?? true),
      lastActive: updates.updatedAt,
      isCurrentUser: id === callerUid,
    };

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("PATCH /api/v1/users/[id] error:", error);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
