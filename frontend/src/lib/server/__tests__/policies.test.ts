process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
process.env.FIREBASE_PRIVATE_KEY = "test-key";

import test, { mock, beforeEach } from "node:test";
import assert from "node:assert";
import { POST, GET } from "@/app/api/v1/policies/route";
import { PUT, DELETE } from "@/app/api/v1/policies/[id]/route";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const batchOps: any[] = [];
let batchShouldFail = false;

const mockBatch = {
  set: (ref: any, data: any) => { batchOps.push({ op: "set", ref, data }); return mockBatch; },
  update: (ref: any, data: any) => { batchOps.push({ op: "update", ref, data }); return mockBatch; },
  delete: (ref: any) => { batchOps.push({ op: "delete", ref }); return mockBatch; },
  commit: async () => {
    if (batchShouldFail) throw new Error("Simulated Firestore batch commit failure");
    return Promise.resolve();
  },
};

const store: Record<string, any> = {
  "user-policy": { uid: "test-uid", name: "User Policy", action: "BLOCK", status: "Active", isSystem: false },
  "other-user-policy": { uid: "victim-uid", name: "Victim Policy", action: "BLOCK", status: "Active", isSystem: false },
  "system-policy": { uid: "test-uid", name: "System Policy", action: "BLOCK", status: "Active", isSystem: true },
};

const mockDoc = (id: string) => ({
  id,
  get: async () => {
    if (store[id]) {
      return { exists: true, data: () => ({ ...store[id] }) };
    }
    return { exists: false, data: () => null };
  },
});

const mockCollection: any = {
  doc: (id?: string) => mockDoc(id || "new-id"),
  where: () => mockCollection,
  orderBy: () => mockCollection,
  add: async (data: any) => ({ id: "mock-id" }),
  get: async () => ({
    empty: false,
    docs: [
      { id: "p1", data: () => ({ uid: "test-uid", name: "Policy 1", action: "BLOCK", status: "Active", updatedAt: "2026-10-10" }) }
    ]
  }),
};

mock.method(adminDb, "collection", () => mockCollection);
mock.method(adminDb, "batch", () => mockBatch);
mock.method(adminAuth, "verifyIdToken", async (token: string, checkRevoked?: boolean) => {
  if (token === "good-token") return { uid: "test-uid" };
  throw { code: "auth/id-token-expired" };
});

beforeEach(() => {
  batchOps.length = 0;
  batchShouldFail = false;
});

// 1. Authentication Tests
test("Policies API - Unauthenticated requests return 401", async () => {
  const reqPost = new Request("https://test/api/v1/policies", { method: "POST" });
  assert.strictEqual((await POST(reqPost)).status, 401);

  const reqGet = new Request("https://test/api/v1/policies", { method: "GET" });
  assert.strictEqual((await GET(reqGet)).status, 401);

  const reqPut = new Request("https://test/api/v1/policies/user-policy", { method: "PUT" });
  assert.strictEqual((await PUT(reqPut, { params: Promise.resolve({ id: "user-policy" }) })).status, 401);

  const reqDel = new Request("https://test/api/v1/policies/user-policy", { method: "DELETE" });
  assert.strictEqual((await DELETE(reqDel, { params: Promise.resolve({ id: "user-policy" }) })).status, 401);
});

test("Policies API - Expired/Invalid token returns 401 (not 500)", async () => {
  const req = new Request("https://test/api/v1/policies", {
    method: "GET",
    headers: { Authorization: "Bearer bad-expired-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes("Invalid or expired"));
});

// 2. GET Policies
test("Policies API - GET returns user policies", async () => {
  const req = new Request("https://test/api/v1/policies", {
    method: "GET",
    headers: { Authorization: "Bearer good-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.policies));
  assert.strictEqual(data.policies.length, 1);
});

// 3. System Policy Protection
test("Policies API - POST cannot create system policies (403)", async () => {
  const req = new Request("https://test/api/v1/policies", {
    method: "POST",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({
      name: "Bad Policy",
      action: "ALLOW",
      status: "Active",
      isSystem: true
    })
  });
  const res = await POST(req);
  assert.strictEqual(res.status, 403);
});

test("Policies API - PUT cannot modify system policy (403)", async () => {
  const req = new Request("https://test/api/v1/policies/system-policy", {
    method: "PUT",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({ name: "Updated System Policy" })
  });
  const res = await PUT(req, { params: Promise.resolve({ id: "system-policy" }) });
  assert.strictEqual(res.status, 403);
});

test("Policies API - DELETE cannot delete system policy (403)", async () => {
  const req = new Request("https://test/api/v1/policies/system-policy", {
    method: "DELETE",
    headers: { Authorization: "Bearer good-token" }
  });
  const res = await DELETE(req, { params: Promise.resolve({ id: "system-policy" }) });
  assert.strictEqual(res.status, 403);
});

// 4. Field Validation
test("Policies API - POST rejects invalid action fields (400)", async () => {
  for (const badAction of ["INVALID", "", null, 123]) {
    const req = new Request("https://test/api/v1/policies", {
      method: "POST",
      headers: { Authorization: "Bearer good-token" },
      body: JSON.stringify({ name: "Test Policy", action: badAction, status: "Active" })
    });
    const res = await POST(req);
    assert.strictEqual(res.status, 400, `Expected 400 for action: ${badAction}`);
  }
});

test("Policies API - POST rejects invalid status values (case-sensitivity & invalid enums)", async () => {
  for (const badStatus of ["active", "enabled", "DISABLED", "random", null, ""]) {
    const req = new Request("https://test/api/v1/policies", {
      method: "POST",
      headers: { Authorization: "Bearer good-token" },
      body: JSON.stringify({ name: "Test Policy", action: "BLOCK", status: badStatus })
    });
    const res = await POST(req);
    assert.strictEqual(res.status, 400, `Expected 400 for status: ${badStatus}`);
  }
});

test("Policies API - PUT rejects falsy or invalid action updates (400)", async () => {
  for (const badAction of ["HACK", null, "", 99]) {
    const req = new Request("https://test/api/v1/policies/user-policy", {
      method: "PUT",
      headers: { Authorization: "Bearer good-token" },
      body: JSON.stringify({ action: badAction })
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "user-policy" }) });
    assert.strictEqual(res.status, 400, `Expected 400 for action update: ${badAction}`);
  }
});

test("Policies API - PUT rejects protected field updates (uid, isSystem)", async () => {
  const reqUid = new Request("https://test/api/v1/policies/user-policy", {
    method: "PUT",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({ uid: "attacker-uid" })
  });
  assert.strictEqual((await PUT(reqUid, { params: Promise.resolve({ id: "user-policy" }) })).status, 400);

  const reqSys = new Request("https://test/api/v1/policies/user-policy", {
    method: "PUT",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({ isSystem: true })
  });
  assert.strictEqual((await PUT(reqSys, { params: Promise.resolve({ id: "user-policy" }) })).status, 400);
});

// 5. Cross-User IDOR and Enumeration Protection
test("Policies API - IDOR protection returns uniform 404 for unowned policies", async () => {
  // Attacker tries to modify other user's policy
  const reqPut = new Request("https://test/api/v1/policies/other-user-policy", {
    method: "PUT",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({ name: "Hacked" })
  });
  const resPut = await PUT(reqPut, { params: Promise.resolve({ id: "other-user-policy" }) });
  assert.strictEqual(resPut.status, 404, "Must return 404 to prevent ID enumeration");

  // Attacker tries to modify non-existent policy
  const reqNonExistent = new Request("https://test/api/v1/policies/non-existent-id", {
    method: "PUT",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({ name: "Hacked" })
  });
  const resNonExistent = await PUT(reqNonExistent, { params: Promise.resolve({ id: "non-existent-id" }) });
  assert.strictEqual(resNonExistent.status, 404);

  // Cross-user delete also returns 404
  const reqDel = new Request("https://test/api/v1/policies/other-user-policy", {
    method: "DELETE",
    headers: { Authorization: "Bearer good-token" }
  });
  const resDel = await DELETE(reqDel, { params: Promise.resolve({ id: "other-user-policy" }) });
  assert.strictEqual(resDel.status, 404);
});

// 6. Atomic Batch Write & Audit Consistency
test("Policies API - POST performs atomic batch write of policy and audit record", async () => {
  const req = new Request("https://test/api/v1/policies", {
    method: "POST",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({
      name: "Valid Custom Policy",
      action: "BLOCK",
      status: "Active",
      category: "Prompt Security"
    })
  });
  const res = await POST(req);
  assert.strictEqual(res.status, 201);

  // Check batch operations: must contain both set for policy and set for audit_logs
  assert.strictEqual(batchOps.length, 2, "Batch must contain exactly policy set and audit log set");
  const auditEntry = batchOps.find(op => op.data?.action === "POLICY_CREATED");
  assert.ok(auditEntry, "Audit record must be included in batch");
  assert.strictEqual(auditEntry.data.uid, "test-uid");
});

test("Policies API - Batch write failure fails closed (500)", async () => {
  batchShouldFail = true;
  const req = new Request("https://test/api/v1/policies", {
    method: "POST",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({
      name: "Valid Custom Policy",
      action: "BLOCK",
      status: "Active"
    })
  });
  const res = await POST(req);
  assert.strictEqual(res.status, 500);
});
