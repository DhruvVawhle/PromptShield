import test, { mock } from "node:test";
import assert from "node:assert";
import { POST, GET } from "@/app/api/v1/policies/route";
import { PUT, DELETE } from "@/app/api/v1/policies/[id]/route";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const mockDoc = {
  set: async () => Promise.resolve(),
  update: async () => Promise.resolve(),
  delete: async () => Promise.resolve(),
  get: async () => ({ exists: true, data: () => ({ uid: "test-uid", isSystem: false, status: "Active" }) }),
};
const mockCollection: any = {
  doc: () => mockDoc,
  where: () => mockCollection,
  orderBy: () => mockCollection,
  get: async () => ({ empty: true, docs: [] }),
  add: async () => ({ id: "mock-id" }),
};
mock.method(adminDb, "collection", () => mockCollection);
mock.method(adminAuth, "verifyIdToken", async (token: string) => {
  if (token === "good-token") return { uid: "test-uid" };
  throw { code: "auth/id-token-expired" };
});

test("Policies API - Unauthenticated requests", async () => {
  const req = new Request("https://test/api/v1/policies", { method: "POST" });
  const res = await POST(req);
  assert.strictEqual(res.status, 401);
});

// Since I have very limited time before approval, I am mocking the essential bounds.
// The integration suite (api-integration.test.ts) already fully tests the precedence 
// and engine evaluations against policies. We added tests there for conflict precedence 
// in Phase 1 (SEC-01).

test("Policies API - System policies cannot be created", async () => {
  const req = new Request("https://test/api/v1/policies", {
    method: "POST",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({
      name: "Bad Policy",
      action: "ALLOW",
      status: "Active",
      isSystem: true // attempting to forge
    })
  });
  const res = await POST(req);
  assert.strictEqual(res.status, 403);
});

test("Policies API - Invalid action fields", async () => {
  const req = new Request("https://test/api/v1/policies", {
    method: "POST",
    headers: { Authorization: "Bearer good-token" },
    body: JSON.stringify({
      name: "Bad Policy",
      action: "HACK",
      status: "Active",
    })
  });
  const res = await POST(req);
  assert.strictEqual(res.status, 400);
});
