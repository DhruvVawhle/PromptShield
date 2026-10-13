process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
process.env.FIREBASE_CLIENT_EMAIL = "test@test.com";
process.env.FIREBASE_PRIVATE_KEY = "test-key";

import test, { mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { GET } from "@/app/api/v1/system/status/route";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  setSystemHealthOverridesForTest,
  resetSystemHealthCacheForTest,
  getSystemStatus,
} from "@/lib/server/system-status";
import type { DependencyStatus } from "@/lib/system-status";

mock.method(adminAuth, "verifyIdToken", async (token: string) => {
  if (token === "valid-user-token") {
    return { uid: "user-123", email: "user@example.com" };
  }
  if (token === "expired-token") {
    const error: any = new Error("Token expired");
    error.code = "auth/id-token-expired";
    throw error;
  }
  throw new Error("Invalid token");
});

// Setup mock Firestore collection query
const mockCollection: any = {
  limit: () => mockCollection,
  get: async () => ({ empty: false, docs: [{ id: "p1", data: () => ({}) }] }),
};
mock.method(adminDb, "collection", () => mockCollection);

beforeEach(() => {
  resetSystemHealthCacheForTest();
  setSystemHealthOverridesForTest({
    firestore: null,
    redis: null,
    omniRoute: null,
    securityEngine: null,
  });
});

afterEach(() => {
  resetSystemHealthCacheForTest();
  setSystemHealthOverridesForTest({
    firestore: null,
    redis: null,
    omniRoute: null,
    securityEngine: null,
  });
});

// 1. Authentication Tests
test("System Status API - Missing Authorization header returns 401", async () => {
  const req = new Request("https://test/api/v1/system/status", { method: "GET" });
  const res = await GET(req);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes("Missing or invalid"));
});

test("System Status API - Invalid/Expired token returns 401", async () => {
  const reqExpired = new Request("https://test/api/v1/system/status", {
    headers: { Authorization: "Bearer expired-token" },
  });
  const resExpired = await GET(reqExpired);
  assert.strictEqual(resExpired.status, 401);
  const dataExpired = await resExpired.json();
  assert.ok(dataExpired.error.includes("Invalid or expired"));

  const reqInvalid = new Request("https://test/api/v1/system/status", {
    headers: { Authorization: "Bearer bad-token" },
  });
  const resInvalid = await GET(reqInvalid);
  assert.strictEqual(resInvalid.status, 401);
});

// 2. All Dependencies Healthy
test("System Status API - All dependencies healthy returns overall healthy status", async () => {
  setSystemHealthOverridesForTest({
    firestore: async (): Promise<DependencyStatus> => ({
      name: "Firestore Database",
      category: "database",
      status: "healthy",
      required: true,
      message: "Firestore connection active and operational.",
      latencyMs: 12,
      lastChecked: new Date().toISOString(),
    }),
    redis: async (): Promise<DependencyStatus> => ({
      name: "Upstash Redis (Rate Limiting)",
      category: "cache",
      status: "healthy",
      required: false,
      message: "Redis rate limiting store responsive.",
      latencyMs: 8,
      lastChecked: new Date().toISOString(),
    }),
    omniRoute: async (): Promise<DependencyStatus> => ({
      name: "OmniRoute AI Gateway",
      category: "gateway",
      status: "healthy",
      required: false,
      message: "OmniRoute is available.",
      latencyMs: 45,
      lastChecked: new Date().toISOString(),
    }),
    securityEngine: async (): Promise<DependencyStatus> => ({
      name: "PromptShield Security Engine",
      category: "security_engine",
      status: "healthy",
      required: true,
      message: "Operational with 10 rules loaded.",
      latencyMs: 2,
      lastChecked: new Date().toISOString(),
    }),
  });

  const req = new Request("https://test/api/v1/system/status", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.status, "healthy");
  assert.strictEqual(data.liveness.status, "alive");
  assert.strictEqual(typeof data.liveness.uptimeSeconds, "number");
  assert.strictEqual(data.readiness.status, "healthy");
  assert.strictEqual(data.readiness.dependencies.length, 4);
});

// 3. Partial Outage (Degraded)
test("System Status API - Auxiliary dependency failure results in degraded status", async () => {
  setSystemHealthOverridesForTest({
    firestore: async (): Promise<DependencyStatus> => ({
      name: "Firestore Database",
      category: "database",
      status: "healthy",
      required: true,
      message: "Firestore connection active.",
      latencyMs: 10,
      lastChecked: new Date().toISOString(),
    }),
    redis: async (): Promise<DependencyStatus> => ({
      name: "Upstash Redis (Rate Limiting)",
      category: "cache",
      status: "degraded",
      required: false,
      message: "Redis service unavailable; rate limiter in fail-open mode.",
      latencyMs: 50,
      lastChecked: new Date().toISOString(),
    }),
    omniRoute: async (): Promise<DependencyStatus> => ({
      name: "OmniRoute AI Gateway",
      category: "gateway",
      status: "degraded",
      required: false,
      message: "OmniRoute API key not configured on server.",
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
    }),
    securityEngine: async (): Promise<DependencyStatus> => ({
      name: "PromptShield Security Engine",
      category: "security_engine",
      status: "healthy",
      required: true,
      message: "Operational.",
      latencyMs: 1,
      lastChecked: new Date().toISOString(),
    }),
  });

  const req = new Request("https://test/api/v1/system/status", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.status, "degraded");
  assert.strictEqual(data.readiness.status, "degraded");
  const redis = data.readiness.dependencies.find((d: any) => d.category === "cache");
  assert.strictEqual(redis.status, "degraded");
});

// 4. Critical Dependency Failure (Unhealthy)
test("System Status API - Critical Firestore failure results in unhealthy status", async () => {
  setSystemHealthOverridesForTest({
    firestore: async (): Promise<DependencyStatus> => ({
      name: "Firestore Database",
      category: "database",
      status: "unhealthy",
      required: true,
      message: "Firestore database is unreachable or uninitialized.",
      latencyMs: 2500,
      lastChecked: new Date().toISOString(),
    }),
    redis: async (): Promise<DependencyStatus> => ({
      name: "Upstash Redis",
      category: "cache",
      status: "healthy",
      required: false,
      message: "Operational.",
      latencyMs: 5,
      lastChecked: new Date().toISOString(),
    }),
    omniRoute: async (): Promise<DependencyStatus> => ({
      name: "OmniRoute",
      category: "gateway",
      status: "healthy",
      required: false,
      message: "Operational.",
      latencyMs: 20,
      lastChecked: new Date().toISOString(),
    }),
    securityEngine: async (): Promise<DependencyStatus> => ({
      name: "PromptShield Security Engine",
      category: "security_engine",
      status: "healthy",
      required: true,
      message: "Operational.",
      latencyMs: 1,
      lastChecked: new Date().toISOString(),
    }),
  });

  const req = new Request("https://test/api/v1/system/status", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.status, "unhealthy");
  assert.strictEqual(data.readiness.status, "unhealthy");
  const firestore = data.readiness.dependencies.find((d: any) => d.category === "database");
  assert.strictEqual(firestore.status, "unhealthy");
  assert.strictEqual(firestore.required, true);
});

// 5. Timeouts
test("System Status API - Dependency timeout reports clear timeout message", async () => {
  setSystemHealthOverridesForTest({
    firestore: async (): Promise<DependencyStatus> => ({
      name: "Firestore Database",
      category: "database",
      status: "unhealthy",
      required: true,
      message: "Firestore query timed out.",
      latencyMs: 3000,
      lastChecked: new Date().toISOString(),
    }),
  });

  const status = await getSystemStatus(true);
  const firestore = status.readiness.dependencies.find((d) => d.category === "database");
  assert.ok(firestore);
  assert.strictEqual(firestore.status, "unhealthy");
  assert.ok(firestore.message.includes("timed out"));
});

// 6. Secret Redaction
test("System Status API - Does not leak secrets, API keys, or raw stack traces", async () => {
  const req = new Request("https://test/api/v1/system/status", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res = await GET(req);
  const rawBody = await res.text();

  assert.ok(!rawBody.includes("OMNIROUTE_API_KEY"));
  assert.ok(!rawBody.includes("UPSTASH_REDIS_REST_TOKEN"));
  assert.ok(!rawBody.includes("FIREBASE_PRIVATE_KEY"));
  assert.ok(!rawBody.includes("valid-user-token"));
  assert.ok(!rawBody.includes("at MockFirestoreQuery.get"));
});

// 7. Memoization & Fresh Bypass
test("System Status API - Caches results within TTL and refreshes when fresh=true", async () => {
  let callCount = 0;
  setSystemHealthOverridesForTest({
    firestore: async (): Promise<DependencyStatus> => {
      callCount++;
      return {
        name: "Firestore Database",
        category: "database",
        status: "healthy",
        required: true,
        message: `Call ${callCount}`,
        latencyMs: 5,
        lastChecked: new Date().toISOString(),
      };
    },
  });

  const req1 = new Request("https://test/api/v1/system/status", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res1 = await GET(req1);
  const data1 = await res1.json();
  const initialCallCount = callCount;

  // Immediate second call should use cache
  const req2 = new Request("https://test/api/v1/system/status", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const res2 = await GET(req2);
  const data2 = await res2.json();
  assert.strictEqual(callCount, initialCallCount);
  assert.deepStrictEqual(data1.timestamp, data2.timestamp);

  // Call with ?fresh=true should bypass cache
  const reqFresh = new Request("https://test/api/v1/system/status?fresh=true", {
    headers: { Authorization: "Bearer valid-user-token" },
  });
  const resFresh = await GET(reqFresh);
  const dataFresh = await resFresh.json();
  assert.strictEqual(callCount, initialCallCount + 1);
  assert.notStrictEqual(data1.timestamp, dataFresh.timestamp);
});
