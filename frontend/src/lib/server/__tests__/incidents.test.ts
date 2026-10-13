process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
process.env.FIREBASE_PRIVATE_KEY = "test-key";

import test, { mock, beforeEach } from "node:test";
import assert from "node:assert";
import { GET as listIncidents } from "@/app/api/v1/incidents/route";
import { GET as getIncident, PATCH as updateIncident } from "@/app/api/v1/incidents/[id]/route";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

interface MockIncidentRecord {
  id: string;
  uid: string;
  promptId: string;
  timestamp: string;
  riskScore: number;
  riskLevel: string;
  decision: string;
  status: string;
  threatCategory: string;
  categories: string[];
  promptSnippet?: string;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

let shouldThrowDbError = false;
let mockIncidentRecords: MockIncidentRecord[] = [];
const mockAuditRecords: any[] = [];

class MockIncidentQuery {
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

    let results = [...mockIncidentRecords];

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

const mockDocRef = (id: string) => ({
  id,
  get: async () => {
    if (shouldThrowDbError) throw new Error("Simulated Firestore doc failure");
    const found = mockIncidentRecords.find((r) => r.id === id);
    if (!found) {
      return { exists: false, data: () => null };
    }
    return { exists: true, data: () => ({ ...found }) };
  },
  update: async (data: any) => {
    if (shouldThrowDbError) throw new Error("Simulated Firestore update failure");
    const idx = mockIncidentRecords.findIndex((r) => r.id === id);
    if (idx !== -1) {
      mockIncidentRecords[idx] = { ...mockIncidentRecords[idx], ...data };
    }
    return Promise.resolve();
  },
});

mock.method(adminDb, "collection", (name: string) => {
  if (name === "security_events") {
    const query = new MockIncidentQuery();
    (query as any).doc = (id: string) => mockDocRef(id);
    return query;
  }
  if (name === "audit_logs") {
    return {
      add: async (data: any) => {
        mockAuditRecords.push(data);
        return { id: "audit-1" };
      },
    };
  }
  return {
    where: () => new MockIncidentQuery(),
    doc: (id: string) => mockDocRef(id),
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
  mockAuditRecords.length = 0;
  mockIncidentRecords = [
    {
      id: "inc-1",
      uid: "user-123",
      promptId: "p_101",
      timestamp: "2026-10-10T12:00:00.000Z",
      riskScore: 85,
      riskLevel: "CRITICAL",
      decision: "BLOCK",
      status: "OPEN",
      threatCategory: "DIRECT_INJECTION",
      categories: ["DIRECT_INJECTION"],
      promptSnippet: "Ignore previous instructions",
    },
    {
      id: "inc-2",
      uid: "user-123",
      promptId: "p_102",
      timestamp: "2026-10-10T11:00:00.000Z",
      riskScore: 65,
      riskLevel: "HIGH",
      decision: "WARN",
      status: "INVESTIGATING",
      threatCategory: "JAILBREAK",
      categories: ["JAILBREAK"],
      promptSnippet: "DAN mode activated",
    },
    {
      id: "inc-3",
      uid: "user-123",
      promptId: "p_103",
      timestamp: "2026-10-10T10:00:00.000Z",
      riskScore: 35,
      riskLevel: "MODERATE",
      decision: "SANITIZE",
      status: "RESOLVED",
      threatCategory: "SENSITIVE_DATA",
      categories: ["SENSITIVE_DATA"],
      promptSnippet: "User query sanitized",
      resolvedAt: "2026-10-10T10:30:00.000Z",
      resolvedBy: "user-123",
      resolutionNotes: "Sanitized credentials before forwarding",
    },
    {
      id: "inc-victim",
      uid: "user-456",
      promptId: "p_victim",
      timestamp: "2026-10-10T09:00:00.000Z",
      riskScore: 90,
      riskLevel: "CRITICAL",
      decision: "BLOCK",
      status: "OPEN",
      threatCategory: "PROMPT_LEAK",
      categories: ["PROMPT_LEAK"],
    },
  ];
});

// 1. Authentication Tests
test("Incidents API - Missing Authorization returns 401", async () => {
  const reqList = new Request("https://test/api/v1/incidents", { method: "GET" });
  assert.strictEqual((await listIncidents(reqList)).status, 401);

  const reqGet = new Request("https://test/api/v1/incidents/inc-1", { method: "GET" });
  assert.strictEqual((await getIncident(reqGet, { params: Promise.resolve({ id: "inc-1" }) })).status, 401);

  const reqPatch = new Request("https://test/api/v1/incidents/inc-1", {
    method: "PATCH",
    body: JSON.stringify({ status: "RESOLVED" }),
  });
  assert.strictEqual((await updateIncident(reqPatch, { params: Promise.resolve({ id: "inc-1" }) })).status, 401);
});

test("Incidents API - Invalid/Expired token returns 401", async () => {
  const req = new Request("https://test/api/v1/incidents", {
    headers: { Authorization: "Bearer expired-token" },
  });
  const res = await listIncidents(req);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes("Invalid or expired"));
});

// 2. Tenant & Ownership Isolation
test("Incidents API - List enforces tenant isolation (never returns other users' incidents)", async () => {
  const req = new Request("https://test/api/v1/incidents", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await listIncidents(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.incidents.length, 3);
  const ids = data.incidents.map((i: any) => i.id);
  assert.ok(ids.includes("inc-1"));
  assert.ok(ids.includes("inc-2"));
  assert.ok(ids.includes("inc-3"));
  assert.ok(!ids.includes("inc-victim"), "Cross-user data must be isolated");
});

test("Incidents API - IDOR protection returns uniform 404 for unowned incidents", async () => {
  const reqGet = new Request("https://test/api/v1/incidents/inc-victim", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const resGet = await getIncident(reqGet, { params: Promise.resolve({ id: "inc-victim" }) });
  assert.strictEqual(resGet.status, 404);

  const reqPatch = new Request("https://test/api/v1/incidents/inc-victim", {
    method: "PATCH",
    headers: { Authorization: "Bearer valid-user-token" },
    body: JSON.stringify({ status: "RESOLVED" }),
  });
  const resPatch = await updateIncident(reqPatch, { params: Promise.resolve({ id: "inc-victim" }) });
  assert.strictEqual(resPatch.status, 404);
});

// 3. Filtering & Pagination
test("Incidents API - Valid status and category filters return matching records", async () => {
  const req = new Request("https://test/api/v1/incidents?status=OPEN", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await listIncidents(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.incidents.length, 1);
  assert.strictEqual(data.incidents[0].id, "inc-1");
  assert.strictEqual(data.incidents[0].status, "OPEN");
});

test("Incidents API - Invalid status filter returns 400", async () => {
  const req = new Request("https://test/api/v1/incidents?status=DELETED", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await listIncidents(req);
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes("Invalid status filter"));
});

test("Incidents API - Date range validation rejects invalid dates and inverted ranges", async () => {
  const reqBadDate = new Request("https://test/api/v1/incidents?startDate=not-a-date", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  assert.strictEqual((await listIncidents(reqBadDate)).status, 400);

  const reqInverted = new Request(
    "https://test/api/v1/incidents?startDate=2026-10-15T00:00:00Z&endDate=2026-10-10T00:00:00Z",
    { headers: { Authorization: "Bearer valid-user-token" } }
  );
  assert.strictEqual((await listIncidents(reqInverted)).status, 400);
});

test("Incidents API - Bounded pagination and cursor advancement", async () => {
  const req = new Request("https://test/api/v1/incidents?limit=2", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await listIncidents(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.incidents.length, 2);
  assert.strictEqual(data.pagination.hasMore, true);
  assert.ok(data.pagination.nextCursor);

  // Next page via cursor
  const reqNext = new Request(`https://test/api/v1/incidents?limit=2&cursor=${data.pagination.nextCursor}`, {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const resNext = await listIncidents(reqNext);
  assert.strictEqual(resNext.status, 200);
  const dataNext = await resNext.json();

  assert.strictEqual(dataNext.incidents.length, 1);
  assert.strictEqual(dataNext.incidents[0].id, "inc-3");
  assert.strictEqual(dataNext.pagination.hasMore, false);
});

test("Incidents API - Malformed cursor returns 400", async () => {
  const req = new Request("https://test/api/v1/incidents?cursor=invalid-cursor-value!!", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  assert.strictEqual((await listIncidents(req)).status, 400);
});

// 4. Incident Status Transitions & Triage
test("Incidents API - Updates incident status to RESOLVED and records audit log", async () => {
  const req = new Request("https://test/api/v1/incidents/inc-1", {
    method: "PATCH",
    headers: { Authorization: "Bearer valid-user-token" },
    body: JSON.stringify({
      status: "RESOLVED",
      resolutionNotes: "Confirmed benign false positive in user application prompt.",
    }),
  });
  const res = await updateIncident(req, { params: Promise.resolve({ id: "inc-1" }) });
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.incident.status, "RESOLVED");
  assert.strictEqual(data.incident.resolvedBy, "user-123");
  assert.ok(data.incident.resolvedAt);
  assert.strictEqual(data.incident.resolutionNotes, "Confirmed benign false positive in user application prompt.");

  // Verify Audit Log was recorded
  assert.strictEqual(mockAuditRecords.length, 1);
  assert.strictEqual(mockAuditRecords[0].action, "INCIDENT_RESOLVED");
  assert.strictEqual(mockAuditRecords[0].details.incidentId, "inc-1");
  assert.strictEqual(mockAuditRecords[0].details.newStatus, "RESOLVED");
});

test("Incidents API - Reopening a resolved incident clears resolvedAt and records status change", async () => {
  const req = new Request("https://test/api/v1/incidents/inc-3", {
    method: "PATCH",
    headers: { Authorization: "Bearer valid-user-token" },
    body: JSON.stringify({
      status: "INVESTIGATING",
      resolutionNotes: "Re-opened for deeper payload review.",
    }),
  });
  const res = await updateIncident(req, { params: Promise.resolve({ id: "inc-3" }) });
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.incident.status, "INVESTIGATING");
  assert.strictEqual(data.incident.resolvedAt, null);
  assert.strictEqual(data.incident.resolvedBy, null);

  assert.strictEqual(mockAuditRecords.length, 1);
  assert.strictEqual(mockAuditRecords[0].action, "INCIDENT_STATUS_UPDATED");
});

// 5. Input Validation & Secret Sanitization
test("Incidents API - Rejects invalid status, notes length > 1000, and empty body", async () => {
  const reqBadStatus = new Request("https://test/api/v1/incidents/inc-1", {
    method: "PATCH",
    headers: { Authorization: "Bearer valid-user-token" },
    body: JSON.stringify({ status: "INVALID_STATUS" }),
  });
  assert.strictEqual((await updateIncident(reqBadStatus, { params: Promise.resolve({ id: "inc-1" }) })).status, 400);

  const reqLongNotes = new Request("https://test/api/v1/incidents/inc-1", {
    method: "PATCH",
    headers: { Authorization: "Bearer valid-user-token" },
    body: JSON.stringify({ resolutionNotes: "A".repeat(1001) }),
  });
  assert.strictEqual((await updateIncident(reqLongNotes, { params: Promise.resolve({ id: "inc-1" }) })).status, 400);

  const reqEmpty = new Request("https://test/api/v1/incidents/inc-1", {
    method: "PATCH",
    headers: { Authorization: "Bearer valid-user-token" },
    body: JSON.stringify({}),
  });
  assert.strictEqual((await updateIncident(reqEmpty, { params: Promise.resolve({ id: "inc-1" }) })).status, 400);
});

test("Incidents API - Sanitizes credentials and sensitive data in resolution notes", async () => {
  const req = new Request("https://test/api/v1/incidents/inc-1", {
    method: "PATCH",
    headers: { Authorization: "Bearer valid-user-token" },
    body: JSON.stringify({
      status: "INVESTIGATING",
      resolutionNotes: "Investigated user prompt containing Bearer eyJhbGciOiJIUzI1NiJ9.test and password: supersecretpassword",
    }),
  });
  const res = await updateIncident(req, { params: Promise.resolve({ id: "inc-1" }) });
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.ok(!data.incident.resolutionNotes.includes("supersecretpassword"));
  assert.ok(data.incident.resolutionNotes.includes("[REDACTED_CREDENTIAL]"));
});

// 6. Firestore Failure Handling
test("Incidents API - Database failure returns 500", async () => {
  shouldThrowDbError = true;
  const req = new Request("https://test/api/v1/incidents", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await listIncidents(req);
  assert.strictEqual(res.status, 500);
});
