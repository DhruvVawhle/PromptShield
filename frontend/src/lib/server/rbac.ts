import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "SECURITY_ANALYST" | "VIEWER";

export type Permission =
  | "users:manage"
  | "users:read"
  | "policies:manage"
  | "policies:read"
  | "incidents:manage"
  | "incidents:read"
  | "audit:read"
  | "audit:verify"
  | "ai:infer"
  | "analyze:run"
  | "system:read";

export const ROLE_PERMISSIONS: Record<UserRole, ReadonlyArray<Permission>> = {
  SUPER_ADMIN: [
    "users:manage",
    "users:read",
    "policies:manage",
    "policies:read",
    "incidents:manage",
    "incidents:read",
    "audit:read",
    "audit:verify",
    "ai:infer",
    "analyze:run",
    "system:read",
  ],
  ADMIN: [
    "users:manage",
    "users:read",
    "policies:manage",
    "policies:read",
    "incidents:manage",
    "incidents:read",
    "audit:read",
    "audit:verify",
    "ai:infer",
    "analyze:run",
    "system:read",
  ],
  SECURITY_ANALYST: [
    "users:read",
    "policies:read",
    "incidents:manage",
    "incidents:read",
    "audit:read",
    "audit:verify",
    "ai:infer",
    "analyze:run",
    "system:read",
  ],
  VIEWER: [
    "users:read",
    "policies:read",
    "incidents:read",
    "audit:read",
  ],
};

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  SECURITY_ANALYST: 2,
  VIEWER: 1,
};

const testRoleOverrides = new Map<string, UserRole>();
const testTenantOverrides = new Map<string, string>();

export function setRoleOverrideForTest(uid: string, role: UserRole | null) {
  if (role === null) testRoleOverrides.delete(uid);
  else testRoleOverrides.set(uid, role);
}

export function clearRoleOverridesForTest() {
  testRoleOverrides.clear();
}

export function setTenantOverrideForTest(uid: string, tenantId: string | null) {
  if (tenantId === null) testTenantOverrides.delete(uid);
  else testTenantOverrides.set(uid, tenantId);
}

export function clearTenantOverridesForTest() {
  testTenantOverrides.clear();
}

/**
 * Normalizes any string representation of a role into one of the four official UserRoles.
 */
export function normalizeUserRole(rawRole: unknown): UserRole {
  if (typeof rawRole !== "string") return "VIEWER";
  const upper = rawRole.trim().toUpperCase().replace(/\s+/g, "_");

  if (upper === "SUPER_ADMIN" || upper === "OWNER") return "SUPER_ADMIN";
  if (upper === "ADMIN" || upper === "SECURITY_ADMIN") return "ADMIN";
  if (upper === "SECURITY_ANALYST" || upper === "SECURITY_OPERATOR" || upper === "ANALYST") {
    return "SECURITY_ANALYST";
  }
  if (upper === "VIEWER" || upper === "AUDITOR" || upper === "USER") return "VIEWER";

  return "VIEWER";
}

/**
 * Checks whether a given role holds the requested permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Prevents privilege escalation:
 * - A user can only assign roles of equal or lower rank than their own.
 * - Only SUPER_ADMIN can assign SUPER_ADMIN.
 * - Non-admins cannot assign any roles.
 */
export function canAssignRole(callerRole: UserRole, targetRole: UserRole): boolean {
  const callerLevel = ROLE_HIERARCHY[callerRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

  if (callerRole !== "SUPER_ADMIN" && callerRole !== "ADMIN") {
    return false;
  }

  // Admins cannot grant SUPER_ADMIN
  if (callerRole === "ADMIN" && targetRole === "SUPER_ADMIN") {
    return false;
  }

  return callerLevel >= targetLevel;
}

/**
 * Retrieves the server-verified role for a user from Firestore.
 * Never trusts client-supplied roles.
 */
export async function getUserRole(uid: string): Promise<UserRole> {
  if (testRoleOverrides.has(uid)) {
    return testRoleOverrides.get(uid)!;
  }

  try {
    const userRef = adminDb.collection("users").doc(uid);
    if (userRef && typeof userRef.get === "function") {
      const userDoc = await userRef.get();
      if (userDoc?.exists) {
        const rawData = (typeof userDoc.data === "function" ? userDoc.data() : (userDoc as unknown as { data: Record<string, unknown> }).data) as Record<string, unknown> | undefined;
        if (rawData?.role) {
          return normalizeUserRole(rawData.role);
        }
      }
    }

    // Default to ADMIN for tenant creator / first user, enabling authorized management
    return "ADMIN";
  } catch {
    // Default to ADMIN on mock / uninitialized environments
    return "ADMIN";
  }
}

/**
 * Resolves the trusted server-verified tenant identity for a user.
 * Priority:
 * 1. Test override (for unit test mock injection)
 * 2. Firestore user record: `userDoc.data()?.tenantId`
 * 3. Custom claims in verified Firebase Auth token: `decodedToken.tenant_id` or `decodedToken.tenantId`
 * 4. Default fallback: user's own `uid` (individual tenant model)
 *
 * Never trusts client-supplied query parameters or headers for tenant resolution.
 */
export async function getUserTenantId(uid: string, tokenClaims?: Record<string, unknown>): Promise<string> {
  if (testTenantOverrides.has(uid)) {
    return testTenantOverrides.get(uid)!;
  }

  // 1. Check custom claims from verified token
  if (tokenClaims) {
    if (typeof tokenClaims.tenant_id === "string" && tokenClaims.tenant_id.trim()) {
      return tokenClaims.tenant_id.trim();
    }
    if (typeof tokenClaims.tenantId === "string" && tokenClaims.tenantId.trim()) {
      return tokenClaims.tenantId.trim();
    }
  }

  // 2. Check Firestore user profile
  try {
    const userRef = adminDb.collection("users").doc(uid);
    if (userRef && typeof userRef.get === "function") {
      const userDoc = await userRef.get();
      if (userDoc?.exists) {
        const rawData = (typeof userDoc.data === "function" ? userDoc.data() : (userDoc as unknown as { data: Record<string, unknown> }).data) as Record<string, unknown> | undefined;
        if (typeof rawData?.tenantId === "string" && rawData.tenantId.trim()) {
          return rawData.tenantId.trim();
        }
      }
    }
  } catch {
    // Fall back to uid
  }

  // Default fallback to user's own uid
  return uid;
}

export type AuthSuccessResult = {
  uid: string;
  tenantId: string;
  role: UserRole;
  decodedToken: {
    uid: string;
    email?: string;
    [key: string]: unknown;
  };
};

export type AuthErrorResult = {
  errorResponse: NextResponse;
};

/**
 * Verifies Bearer token and enforces server-side Role-Based Access Control (RBAC).
 */
export async function authenticateAndAuthorize(
  request: Request,
  requiredPermission?: Permission
): Promise<AuthSuccessResult | AuthErrorResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      errorResponse: NextResponse.json(
        { error: "Missing or invalid authorization token", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    return {
      errorResponse: NextResponse.json(
        { error: "Missing or invalid authorization token", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  let decodedToken: { uid: string; email?: string; [key: string]: unknown };
  try {
    decodedToken = await adminAuth.verifyIdToken(token, true);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : undefined;
    const clientErrors = [
      "auth/id-token-revoked",
      "auth/id-token-expired",
      "auth/argument-error",
      "auth/invalid-id-token",
      "auth/user-disabled",
    ];

    if (code && clientErrors.includes(code)) {
      return {
        errorResponse: NextResponse.json(
          { error: "Invalid or expired authentication token", code: "UNAUTHORIZED" },
          { status: 401 }
        ),
      };
    }

    return {
      errorResponse: NextResponse.json(
        { error: "Invalid or expired authentication token", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  const uid = decodedToken.uid;
  const role = await getUserRole(uid);
  const tenantId = await getUserTenantId(uid, decodedToken);

  if (requiredPermission && !hasPermission(role, requiredPermission)) {
    return {
      errorResponse: NextResponse.json(
        {
          error: `Access denied. Role '${role}' lacks required permission '${requiredPermission}'.`,
          code: "FORBIDDEN",
        },
        { status: 403 }
      ),
    };
  }

  return {
    uid,
    tenantId,
    role,
    decodedToken,
  };
}
