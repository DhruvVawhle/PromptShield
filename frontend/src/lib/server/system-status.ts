import { adminDb } from "@/lib/firebase-admin";
import { checkOmniRouteHealth } from "@/lib/omniroute";
import { analyzePromptServer } from "@/lib/server/security-engine";
import { DETECTION_RULES } from "@/lib/server/rules/rule-definitions";
import type {
  DependencyStatus,
  HealthState,
  LivenessStatus,
  SystemStatusResponse,
} from "@/lib/system-status";

const CHECK_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 5000;

let cachedStatus: SystemStatusResponse | null = null;
let lastCheckTime = 0;

// Test overrides
type HealthChecker = () => Promise<DependencyStatus>;
let firestoreCheckerOverride: HealthChecker | null = null;
let redisCheckerOverride: HealthChecker | null = null;
let omniRouteCheckerOverride: HealthChecker | null = null;
let securityEngineCheckerOverride: HealthChecker | null = null;

export function setSystemHealthOverridesForTest(overrides: {
  firestore?: HealthChecker | null;
  redis?: HealthChecker | null;
  omniRoute?: HealthChecker | null;
  securityEngine?: HealthChecker | null;
}) {
  if (overrides.firestore !== undefined) firestoreCheckerOverride = overrides.firestore;
  if (overrides.redis !== undefined) redisCheckerOverride = overrides.redis;
  if (overrides.omniRoute !== undefined) omniRouteCheckerOverride = overrides.omniRoute;
  if (overrides.securityEngine !== undefined) securityEngineCheckerOverride = overrides.securityEngine;
  cachedStatus = null;
  lastCheckTime = 0;
}

export function resetSystemHealthCacheForTest() {
  cachedStatus = null;
  lastCheckTime = 0;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operationName} check timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function checkFirestoreHealth(): Promise<DependencyStatus> {
  if (firestoreCheckerOverride) return firestoreCheckerOverride();

  const start = performance.now();
  const now = new Date().toISOString();

  try {
    await withTimeout(
      adminDb.collection("policies").limit(1).get(),
      CHECK_TIMEOUT_MS,
      "Firestore"
    );

    const latencyMs = Math.round(performance.now() - start);
    return {
      name: "Firestore Database",
      category: "database",
      status: "healthy",
      required: true,
      message: "Firestore connection active and operational.",
      latencyMs,
      lastChecked: now,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isTimeout = rawMsg.includes("timed out");

    return {
      name: "Firestore Database",
      category: "database",
      status: "unhealthy",
      required: true,
      message: isTimeout
        ? "Firestore query timed out."
        : "Firestore database is unreachable or uninitialized.",
      latencyMs,
      lastChecked: now,
    };
  }
}

async function checkRedisHealth(): Promise<DependencyStatus> {
  if (redisCheckerOverride) return redisCheckerOverride();

  const start = performance.now();
  const now = new Date().toISOString();

  const hasRedisConfig = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (!hasRedisConfig) {
    return {
      name: "Upstash Redis (Rate Limiting)",
      category: "cache",
      status: "healthy",
      required: false,
      message: "Rate limiting unconfigured (bypassed / in-memory mode active).",
      latencyMs: 0,
      lastChecked: now,
    };
  }

  try {
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();

    const pingPromise = redis.ping();
    const result = await withTimeout(pingPromise, CHECK_TIMEOUT_MS, "Redis");

    const latencyMs = Math.round(performance.now() - start);
    const isPong = result === "PONG" || result === "pong" || result === "OK";

    return {
      name: "Upstash Redis (Rate Limiting)",
      category: "cache",
      status: isPong ? "healthy" : "degraded",
      required: false,
      message: isPong
        ? "Redis rate limiting store responsive."
        : "Redis returned unexpected ping response.",
      latencyMs,
      lastChecked: now,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isTimeout = rawMsg.includes("timed out");

    return {
      name: "Upstash Redis (Rate Limiting)",
      category: "cache",
      status: "degraded",
      required: false,
      message: isTimeout
        ? "Redis ping timed out; rate limiter in fail-open mode."
        : "Redis service unavailable; rate limiter in fail-open mode.",
      latencyMs,
      lastChecked: now,
    };
  }
}

async function checkOmniRouteDependency(): Promise<DependencyStatus> {
  if (omniRouteCheckerOverride) return omniRouteCheckerOverride();

  const start = performance.now();
  const now = new Date().toISOString();

  try {
    const health = await withTimeout(
      checkOmniRouteHealth(),
      CHECK_TIMEOUT_MS,
      "OmniRoute"
    );

    const latencyMs = Math.round(performance.now() - start);

    if (health.ok) {
      return {
        name: "OmniRoute AI Gateway",
        category: "gateway",
        status: "healthy",
        required: false,
        message: health.message,
        latencyMs,
        lastChecked: now,
        details: {
          model: health.model,
          availableModelsCount: health.availableModels.length,
        },
      };
    }

    const isUnconfigured = health.status === "unconfigured";
    return {
      name: "OmniRoute AI Gateway",
      category: "gateway",
      status: "degraded",
      required: false,
      message: isUnconfigured
        ? "OmniRoute API key not configured on server."
        : health.message || "OmniRoute gateway is currently degraded.",
      latencyMs,
      lastChecked: now,
      details: {
        model: health.model,
      },
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isTimeout = rawMsg.includes("timed out");

    return {
      name: "OmniRoute AI Gateway",
      category: "gateway",
      status: "degraded",
      required: false,
      message: isTimeout
        ? "OmniRoute health check timed out."
        : "OmniRoute gateway connection failed.",
      latencyMs,
      lastChecked: now,
    };
  }
}

async function checkSecurityEngineHealth(): Promise<DependencyStatus> {
  if (securityEngineCheckerOverride) return securityEngineCheckerOverride();

  const start = performance.now();
  const now = new Date().toISOString();

  try {
    const rulesCount = DETECTION_RULES.length;
    if (rulesCount === 0) {
      throw new Error("No heuristic detection rules loaded.");
    }

    const testAnalysis = await withTimeout(
      analyzePromptServer("System readiness diagnostic verification"),
      CHECK_TIMEOUT_MS,
      "Security Engine"
    );

    if (!testAnalysis || typeof testAnalysis.decision !== "string") {
      throw new Error("Security engine returned invalid evaluation structure.");
    }

    const latencyMs = Math.round(performance.now() - start);
    return {
      name: "PromptShield Security Engine",
      category: "security_engine",
      status: "healthy",
      required: true,
      message: `Operational with ${rulesCount} detection rules compiled and verified.`,
      latencyMs,
      lastChecked: now,
      details: {
        rulesLoaded: rulesCount,
        selfTestDecision: testAnalysis.decision,
      },
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isTimeout = rawMsg.includes("timed out");

    return {
      name: "PromptShield Security Engine",
      category: "security_engine",
      status: "unhealthy",
      required: true,
      message: isTimeout
        ? "Security engine self-test timed out."
        : "Security engine evaluation failed or rule definitions are unavailable.",
      latencyMs,
      lastChecked: now,
    };
  }
}

export async function getSystemStatus(fresh = false): Promise<SystemStatusResponse> {
  const nowMs = Date.now();
  if (!fresh && cachedStatus && nowMs - lastCheckTime < CACHE_TTL_MS) {
    return cachedStatus;
  }

  // 1. Process Liveness
  const liveness: LivenessStatus = {
    status: "alive",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
  };

  // 2. Parallel Dependency Readiness Checks
  const [firestoreRes, redisRes, omniRouteRes, secEngineRes] = await Promise.all([
    checkFirestoreHealth(),
    checkRedisHealth(),
    checkOmniRouteDependency(),
    checkSecurityEngineHealth(),
  ]);

  const dependencies: DependencyStatus[] = [
    firestoreRes,
    secEngineRes,
    redisRes,
    omniRouteRes,
  ];

  // 3. Compute Overall & Readiness Status
  const criticalUnhealthy = dependencies.some((d) => d.required && d.status === "unhealthy");
  const anyDegradedOrUnhealthy = dependencies.some((d) => d.status !== "healthy");

  let overallStatus: HealthState = "healthy";
  if (criticalUnhealthy) {
    overallStatus = "unhealthy";
  } else if (anyDegradedOrUnhealthy) {
    overallStatus = "degraded";
  }

  const result: SystemStatusResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    liveness,
    readiness: {
      status: overallStatus,
      dependencies,
    },
  };

  cachedStatus = result;
  lastCheckTime = nowMs;

  return result;
}
