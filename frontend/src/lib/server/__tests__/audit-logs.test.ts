process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
process.env.FIREBASE_PRIVATE_KEY = "test-key";

import test, { mock, beforeEach } from "node:test";
import assert from "node:assert";
import { GET } from "@/app/api/v1/audit-logs/route";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

interface MockAuditRecord {
  id: string;
  uid: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

let shouldThrowDbError = false;
let mockDbRecords: MockAuditRecord[] = [];

class MockFirestoreQuery {
  private filters: Array<{ field: string; op: string; val: any }> = [];
  private orderField: string = "timestamp";
  private orderDir: "asc" | "desc" = "desc";
  private startAfterVal: any = null;
  private limitVal: number = 1000;

  where(field: string, op: string, val: any) {
    this.filters.push({ field, op, val });
    return this;
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc") {
    this.orderField = field;
    this.orderDir = dir;
    return this;
  }

  startAfter(val: any) {
    this.startAfterVal = val;
    return this;
  }

  limit(count: number) {
    this.limitVal = count;
    return this;
  }

  async get() {
    if (shouldThrowDbError) {
      throw new Error("Simulated Firestore query failure");
    }

    let results = [...mockDbRecords];

    for (const f of this.filters) {
      results = results.filter((doc) => {
        const docVal = (doc as any)[f.field];
        if (f.op === "==") return docVal === f.val;
        if (f.op === ">=") return docVal >= f.val;
        if (f.op === "<=") return docVal <= f.val;
        return true;
      });
    }

    results.sort((a, b) => {
      const aVal = (a as any)[this.orderField];
      const bVal = (b as any)[this.orderField];
      if (aVal < bVal) return this.orderDir === "desc" ? 1 : -1;
      if (aVal > bVal) return this.orderDir === "desc" ? -1 : 1;
      return 0;
    });

    if (this.startAfterVal !== null) {
      const idx = results.findIndex(
        (doc) => (doc as any)[this.orderField] === this.startAfterVal
      );
      if (idx !== -1) {
        results = results.slice(idx + 1);
      }
    }

    results = results.slice(0, this.limitVal);

    return {
      empty: results.length === 0,
      docs: results.map((d) => ({
        id: d.id,
        data: () => ({ ...d }),
      })),
    };
  }
}

mock.method(adminDb, "collection", (name: string) => {
  if (name === "audit_logs") {
    return new MockFirestoreQuery();
  }
  return {
    where: () => new MockFirestoreQuery(),
  };
});

mock.method(adminAuth, "verifyIdToken", async (token: string) => {
  if (token === "valid-user-token") {
    return { uid: "user-123", email: "user@example.com" };
  }
  if (token === "other-user-token") {
    return { uid: "user-456", email: "other@example.com" };
  }
  if (token === "expired-token") {
    const error: any = new Error("Token expired");
    error.code = "auth/id-token-expired";
    throw error;
  }
  throw new Error("Invalid token");
});

beforeEach(() => {
  shouldThrowDbError = false;
  mockDbRecords = [
    {
      id: "log-1",
      uid: "user-123",
      action: "POLICY_CREATED",
      timestamp: "2026-10-10T12:00:00.000Z",
      details: { policyName: "Test Policy 1", apiKey: "ps_live_123456789" },
    },
    {
      id: "log-2",
      uid: "user-123",
      action: "ALERT_GENERATED",
      timestamp: "2026-10-10T11:00:00.000Z",
      details: { severity: "HIGH", user_password: "supersecretpassword" },
    },
    {
      id: "log-3",
      uid: "user-123",
      action: "POLICY_UPDATED",
      timestamp: "2026-10-10T10:00:00.000Z",
      details: { policyName: "Updated Policy" },
    },
    {
      id: "log-victim",
      uid: "user-456",
      action: "SECURITY_EVENT_RESOLVED",
      timestamp: "2026-10-10T09:00:00.000Z",
      details: { secret_token: "victim_token_xyz" },
    },
  ];
});

// 1. Authentication Tests
test("Audit Log API - Missing Authorization header returns 401", async () => {
  const req = new Request("https://test/api/v1/audit-logs", { method: "GET" });
  const res = await GET(req);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes("Missing or invalid"));
});

test("Audit Log API - Invalid/Expired token returns 401", async () => {
  const reqExpired = new Request("https://test/api/v1/audit-logs", {
    headers: { Authorization: "Bearer expired-token" },
  });
  const resExpired = await GET(reqExpired);
  assert.strictEqual(resExpired.status, 401);
  const dataExpired = await resExpired.json();
  assert.ok(dataExpired.error.includes("Invalid or expired"));

  const reqInvalid = new Request("https://test/api/v1/audit-logs", {
    headers: { Authorization: "Bearer bad-token" },
  });
  const resInvalid = await GET(reqInvalid);
  assert.strictEqual(resInvalid.status, 401);
});

// 2. Tenant Isolation
test("Audit Log API - Enforces tenant isolation (only authenticated user records returned)", async () => {
  const req = new Request("https://test/api/v1/audit-logs", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.logs.length, 3);
  const ids = data.logs.map((l: any) => l.id);
  assert.ok(ids.includes("log-1"));
  assert.ok(ids.includes("log-2"));
  assert.ok(ids.includes("log-3"));
  assert.ok(!ids.includes("log-victim"), "Must NOT include other user's records");
});

// 3. Action Filter Validation
test("Audit Log API - Valid action filter returns filtered records", async () => {
  const req = new Request("https://test/api/v1/audit-logs?action=POLICY_CREATED", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.logs.length, 1);
  assert.strictEqual(data.logs[0].id, "log-1");
  assert.strictEqual(data.logs[0].action, "POLICY_CREATED");
});

test("Audit Log API - Invalid action filter returns 400 Bad Request", async () => {
  const req = new Request("https://test/api/v1/audit-logs?action=HACK_SYSTEM", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes("Invalid action filter"));
});

// 4. Date Range Validation
test("Audit Log API - Valid date range filters records correctly", async () => {
  const req = new Request(
    "https://test/api/v1/audit-logs?startDate=2026-10-10T10:30:00.000Z&endDate=2026-10-10T12:30:00.000Z",
    {
      headers: { Authorization: "Bearer valid-user-token" },
    }
  );
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.logs.length, 2);
  const ids = data.logs.map((l: any) => l.id);
  assert.ok(ids.includes("log-1"));
  assert.ok(ids.includes("log-2"));
  assert.ok(!ids.includes("log-3"));
});

test("Audit Log API - Malformed startDate returns 400", async () => {
  const req = new Request("https://test/api/v1/audit-logs?startDate=invalid-date", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes("Invalid startDate format"));
});

test("Audit Log API - startDate after endDate returns 400", async () => {
  const req = new Request(
    "https://test/api/v1/audit-logs?startDate=2026-10-15T00:00:00.000Z&endDate=2026-10-10T00:00:00.000Z",
    {
      headers: { Authorization: "Bearer valid-user-token" },
    }
  );
  const res = await GET(req);
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes("startDate must be before or equal to endDate"));
});

// 5. Page Size Limits
test("Audit Log API - Negative or zero limit returns 400", async () => {
  const reqZero = new Request("https://test/api/v1/audit-logs?limit=0", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  assert.strictEqual((await GET(reqZero)).status, 400);

  const reqNeg = new Request("https://test/api/v1/audit-logs?limit=-5", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  assert.strictEqual((await GET(reqNeg)).status, 400);
});

test("Audit Log API - Limit exceeding 100 returns 400", async () => {
  const req = new Request("https://test/api/v1/audit-logs?limit=150", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes("cannot exceed maximum of 100"));
});

// 6. Cursor-Based Pagination
test("Audit Log API - Pagination returns bounded page and valid nextCursor", async () => {
  const req = new Request("https://test/api/v1/audit-logs?limit=2", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.logs.length, 2);
  assert.strictEqual(data.pagination.hasMore, true);
  assert.ok(data.pagination.nextCursor, "Should provide nextCursor");

  // Advance to next page using nextCursor
  const reqNext = new Request(
    `https://test/api/v1/audit-logs?limit=2&cursor=${data.pagination.nextCursor}`,
    {
      headers: { Authorization: "Bearer valid-user-token" },
    }
  );
  const resNext = await GET(reqNext);
  assert.strictEqual(resNext.status, 200);
  const dataNext = await resNext.json();

  assert.strictEqual(dataNext.logs.length, 1);
  assert.strictEqual(dataNext.logs[0].id, "log-3");
  assert.strictEqual(dataNext.pagination.hasMore, false);
  assert.strictEqual(dataNext.pagination.nextCursor, null);
});

test("Audit Log API - Malformed cursor returns 400 instead of 500", async () => {
  const reqInvalidBase64 = new Request(
    "https://test/api/v1/audit-logs?cursor=not-valid-base64-json!!!",
    {
      headers: { Authorization: "Bearer valid-user-token" },
    }
  );
  const res1 = await GET(reqInvalidBase64);
  assert.strictEqual(res1.status, 400);

  // Valid base64 but missing fields
  const malformedJson = Buffer.from(JSON.stringify({ bad: 123 })).toString("base64");
  const reqBadJson = new Request(
    `https://test/api/v1/audit-logs?cursor=${malformedJson}`,
    {
      headers: { Authorization: "Bearer valid-user-token" },
    }
  );
  const res2 = await GET(reqBadJson);
  assert.strictEqual(res2.status, 400);
  const data2 = await res2.json();
  assert.ok(data2.error.includes("Invalid pagination cursor format"));
});

// 7. Empty Results
test("Audit Log API - Returns empty logs array when no records match", async () => {
  mockDbRecords = [];
  const req = new Request("https://test/api/v1/audit-logs", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.deepStrictEqual(data.logs, []);
  assert.strictEqual(data.pagination.hasMore, false);
  assert.strictEqual(data.pagination.nextCursor, null);
});

// 8. Firestore Failure Handling
test("Audit Log API - Returns 500 when Firestore query fails", async () => {
  shouldThrowDbError = true;
  const req = new Request("https://test/api/v1/audit-logs", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 500);
  const data = await res.json();
  assert.ok(data.error.includes("Failed to retrieve audit logs"));
});

// 9. Sensitive Metadata Handling
test("Audit Log API - Redacts sensitive credentials in audit log details", async () => {
  const req = new Request("https://test/api/v1/audit-logs", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  const log2 = data.logs.find((l: any) => l.id === "log-2");
  assert.ok(log2);
  assert.strictEqual(
    log2.details.user_password,
    "[REDACTED_CREDENTIAL]",
    "Password field must be redacted"
  );
});
