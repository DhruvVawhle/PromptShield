import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import {
  hasPermission,
  canAssignRole,
  normalizeUserRole,
  authenticateAndAuthorize,
  setRoleOverrideForTest,
  clearRoleOverridesForTest,
  type Permission,
} from "@/lib/server/rbac";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

describe("Role-Based Access Control (RBAC) & Authorization", () => {
  beforeEach(() => {
    clearRoleOverridesForTest();
  });

  test("Normalizes legacy and display role strings into official UserRoles", () => {
    assert.strictEqual(normalizeUserRole("SUPER_ADMIN"), "SUPER_ADMIN");
    assert.strictEqual(normalizeUserRole("Owner"), "SUPER_ADMIN");
    assert.strictEqual(normalizeUserRole("admin"), "ADMIN");
    assert.strictEqual(normalizeUserRole("Security Admin"), "ADMIN");
    assert.strictEqual(normalizeUserRole("SECURITY_ANALYST"), "SECURITY_ANALYST");
    assert.strictEqual(normalizeUserRole("Security Operator"), "SECURITY_ANALYST");
    assert.strictEqual(normalizeUserRole("Auditor"), "VIEWER");
    assert.strictEqual(normalizeUserRole("user"), "VIEWER");
    assert.strictEqual(normalizeUserRole("unknown_role"), "VIEWER");
  });

  test("Enforces permission matrix boundaries across roles", () => {
    // SUPER_ADMIN has everything
    const allPerms: Permission[] = [
      "users:manage", "users:read", "policies:manage", "policies:read",
      "incidents:manage", "incidents:read", "audit:read", "audit:verify",
      "ai:infer", "analyze:run", "system:read"
    ];
    for (const p of allPerms) {
      assert.strictEqual(hasPermission("SUPER_ADMIN", p), true, `SUPER_ADMIN should have ${p}`);
      assert.strictEqual(hasPermission("ADMIN", p), true, `ADMIN should have ${p}`);
    }

    // SECURITY_ANALYST can analyze and triage incidents, but CANNOT mutate policies or manage users
    assert.strictEqual(hasPermission("SECURITY_ANALYST", "policies:manage"), false);
    assert.strictEqual(hasPermission("SECURITY_ANALYST", "users:manage"), false);
    assert.strictEqual(hasPermission("SECURITY_ANALYST", "policies:read"), true);
    assert.strictEqual(hasPermission("SECURITY_ANALYST", "incidents:manage"), true);
    assert.strictEqual(hasPermission("SECURITY_ANALYST", "ai:infer"), true);

    // VIEWER is strictly read-only: CANNOT run AI inference or mutate policies/incidents
    assert.strictEqual(hasPermission("VIEWER", "ai:infer"), false);
    assert.strictEqual(hasPermission("VIEWER", "policies:manage"), false);
    assert.strictEqual(hasPermission("VIEWER", "incidents:manage"), false);
    assert.strictEqual(hasPermission("VIEWER", "users:manage"), false);
    assert.strictEqual(hasPermission("VIEWER", "policies:read"), true);
    assert.strictEqual(hasPermission("VIEWER", "incidents:read"), true);
    assert.strictEqual(hasPermission("VIEWER", "audit:read"), true);
  });

  test("Prevents privilege escalation in role assignment", () => {
    // SUPER_ADMIN can assign any role
    assert.strictEqual(canAssignRole("SUPER_ADMIN", "SUPER_ADMIN"), true);
    assert.strictEqual(canAssignRole("SUPER_ADMIN", "ADMIN"), true);
    assert.strictEqual(canAssignRole("SUPER_ADMIN", "VIEWER"), true);

    // ADMIN cannot assign SUPER_ADMIN
    assert.strictEqual(canAssignRole("ADMIN", "SUPER_ADMIN"), false);
    assert.strictEqual(canAssignRole("ADMIN", "ADMIN"), true);
    assert.strictEqual(canAssignRole("ADMIN", "SECURITY_ANALYST"), true);
    assert.strictEqual(canAssignRole("ADMIN", "VIEWER"), true);

    // SECURITY_ANALYST and VIEWER cannot assign any roles
    assert.strictEqual(canAssignRole("SECURITY_ANALYST", "VIEWER"), false);
    assert.strictEqual(canAssignRole("VIEWER", "VIEWER"), false);
  });

  test("authenticateAndAuthorize rejects missing token with 401", async () => {
    const req = new Request("https://test/api/v1/policies");
    const res = await authenticateAndAuthorize(req, "policies:read");
    assert.ok("errorResponse" in res);
    assert.strictEqual(res.errorResponse.status, 401);
  });

  test("authenticateAndAuthorize rejects unauthorized permission with 403", async () => {
    const uid = "viewer_user_id";
    setRoleOverrideForTest(uid, "VIEWER");

    // Mock verifyIdToken for viewer
    const origVerify = adminAuth.verifyIdToken;
    (adminAuth as any).verifyIdToken = async () => ({ uid });

    try {
      const req = new Request("https://test/api/ai", {
        headers: { Authorization: "Bearer valid_viewer_token" },
      });

      // VIEWER trying to access ai:infer
      const res = await authenticateAndAuthorize(req, "ai:infer");
      assert.ok("errorResponse" in res);
      assert.strictEqual(res.errorResponse.status, 403);
    } finally {
      (adminAuth as any).verifyIdToken = origVerify;
    }
  });

  test("authenticateAndAuthorize permits authorized user with 200", async () => {
    const uid = "analyst_user_id";
    setRoleOverrideForTest(uid, "SECURITY_ANALYST");

    const origVerify = adminAuth.verifyIdToken;
    (adminAuth as any).verifyIdToken = async () => ({ uid, email: "analyst@test.com" });

    try {
      const req = new Request("https://test/api/ai", {
        headers: { Authorization: "Bearer valid_analyst_token" },
      });

      const res = await authenticateAndAuthorize(req, "ai:infer");
      assert.ok("uid" in res);
      assert.strictEqual(res.uid, uid);
      assert.strictEqual(res.role, "SECURITY_ANALYST");
    } finally {
      (adminAuth as any).verifyIdToken = origVerify;
    }
  });

  test("Unauthorized policy updates and system access are blocked for VIEWER and SECURITY_ANALYST", async () => {
    const viewerUid = "viewer_uid_block";
    setRoleOverrideForTest(viewerUid, "VIEWER");

    const analystUid = "analyst_uid_block";
    setRoleOverrideForTest(analystUid, "SECURITY_ANALYST");

    const origVerify = adminAuth.verifyIdToken;

    try {
      // 1. VIEWER trying to manage policies
      (adminAuth as any).verifyIdToken = async () => ({ uid: viewerUid });
      const req1 = new Request("https://test/api/v1/policies", {
        headers: { Authorization: "Bearer token" },
      });
      const res1 = await authenticateAndAuthorize(req1, "policies:manage");
      assert.ok("errorResponse" in res1);
      assert.strictEqual(res1.errorResponse.status, 403);

      // 2. SECURITY_ANALYST trying to manage policies
      (adminAuth as any).verifyIdToken = async () => ({ uid: analystUid });
      const req2 = new Request("https://test/api/v1/policies", {
        headers: { Authorization: "Bearer token" },
      });
      const res2 = await authenticateAndAuthorize(req2, "policies:manage");
      assert.ok("errorResponse" in res2);
      assert.strictEqual(res2.errorResponse.status, 403);

      // 3. VIEWER trying to read system status
      (adminAuth as any).verifyIdToken = async () => ({ uid: viewerUid });
      const req3 = new Request("https://test/api/v1/system/status", {
        headers: { Authorization: "Bearer token" },
      });
      const res3 = await authenticateAndAuthorize(req3, "system:read");
      assert.ok("errorResponse" in res3);
      assert.strictEqual(res3.errorResponse.status, 403);

      // 4. SECURITY_ANALYST permitted to read system status
      (adminAuth as any).verifyIdToken = async () => ({ uid: analystUid });
      const req4 = new Request("https://test/api/v1/system/status", {
        headers: { Authorization: "Bearer token" },
      });
      const res4 = await authenticateAndAuthorize(req4, "system:read");
      assert.ok("uid" in res4);
      assert.strictEqual(res4.role, "SECURITY_ANALYST");
    } finally {
      (adminAuth as any).verifyIdToken = origVerify;
    }
  });

  test("Cross-Tenant Isolation: Tenant identity is resolved strictly on the server and cannot be spoofed by client headers", async () => {
    const origVerify = (adminAuth as any).verifyIdToken;
    try {
      (adminAuth as any).verifyIdToken = async () => ({
        uid: "user-tenant-a",
        email: "alice@org-a.com",
        tenant_id: "org-a",
      });

      // Attacker attempts to inject x-tenant-id or query param to access org-b
      const req = new Request("https://promptshield.io/api/v1/policies?tenantId=org-b", {
        headers: {
          Authorization: "Bearer token",
          "x-tenant-id": "org-b",
        },
      });

      const authRes = await authenticateAndAuthorize(req, "policies:read");
      assert.ok("uid" in authRes);
      assert.strictEqual(authRes.tenantId, "org-a", "Tenant ID must resolve to server-verified org-a, ignoring client header injection");
      assert.strictEqual(authRes.uid, "user-tenant-a");
    } finally {
      (adminAuth as any).verifyIdToken = origVerify;
    }
  });

  test("Cross-Tenant IDOR: Admin in Tenant A cannot modify users belonging to Tenant B", async () => {
    const { PATCH } = await import("@/app/api/v1/users/[id]/route");
    const origVerify = (adminAuth as any).verifyIdToken;
    const origCollection = adminDb.collection;

    const mockUsersDb: Record<string, any> = {
      "user-victim": {
        role: "VIEWER",
        tenantId: "org-victim",
        status: "Active",
      },
    };

    try {
      // Caller is ADMIN in Tenant A
      (adminAuth as any).verifyIdToken = async () => ({
        uid: "admin-a",
        tenant_id: "org-a",
      });
      setRoleOverrideForTest("admin-a", "ADMIN");

      (adminDb as any).collection = (colName: string) => {
        if (colName === "users") {
          return {
            doc: (docId: string) => ({
              get: async () => ({
                exists: Boolean(mockUsersDb[docId]),
                data: () => mockUsersDb[docId],
              }),
              update: async () => {},
            }),
          };
        }
        return (origCollection as any).call(adminDb, colName);
      };

      const req = new Request("https://promptshield.io/api/v1/users/user-victim", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "ADMIN" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "user-victim" }) });
      assert.strictEqual(res.status, 404, "Cross-tenant mutation must return 404 to prevent enumeration and unauthorized modification");
    } finally {
      (adminAuth as any).verifyIdToken = origVerify;
      (adminDb as any).collection = origCollection;
      clearRoleOverridesForTest();
    }
  });
});
