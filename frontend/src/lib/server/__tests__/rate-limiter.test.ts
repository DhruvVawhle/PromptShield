import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import {
  enforceRateLimit,
  getClientIp,
  getRateLimitHeaders,
  setRateLimiterForTest,
  type RateLimitTier,
} from "@/lib/server/rate-limiter";

describe("Rate Limiter - Production Hardening & Resilience", () => {
  beforeEach(() => {
    setRateLimiterForTest(null);
  });

  test("getClientIp extracts addresses under trusted proxy and rejects spoofed headers when untrusted", () => {
    // 1. Direct origin access without TRUST_CLOUDFLARE strictly ignores CF-Connecting-IP
    const reqUntrustedCf = new Request("https://test", {
      headers: { "cf-connecting-ip": "192.0.2.1" },
    });
    assert.strictEqual(getClientIp(reqUntrustedCf), "127.0.0.1");

    // 2. CF edge header is trusted when deployment is verified behind Cloudflare
    process.env.TRUST_CLOUDFLARE = "true";
    try {
      const reqCloudflare = new Request("https://test", {
        headers: { "cf-connecting-ip": "192.0.2.1" },
      });
      assert.strictEqual(getClientIp(reqCloudflare), "192.0.2.1");
    } finally {
      delete process.env.TRUST_CLOUDFLARE;
    }

    // 3. Untrusted proxy by default ignores client-forged X-Forwarded-For
    const reqUntrusted = new Request("https://test", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    assert.strictEqual(getClientIp(reqUntrusted), "127.0.0.1");

    // 4. When TRUST_PROXY=true, parses left-most client IP
    process.env.TRUST_PROXY = "true";
    try {
      const reqTrusted = new Request("https://test", {
        headers: { "x-forwarded-for": "203.0.113.195:443, 70.41.3.18" },
      });
      assert.strictEqual(getClientIp(reqTrusted), "203.0.113.195");

      const reqRealIp = new Request("https://test", {
        headers: { "x-real-ip": "198.51.100.42" },
      });
      assert.strictEqual(getClientIp(reqRealIp), "198.51.100.42");
    } finally {
      delete process.env.TRUST_PROXY;
    }
  });

  test("In development/fallback mode, in-memory limiter permits traffic within quota and enforces limit", async () => {
    const testId = `user_dev_${Date.now()}`;
    const tier: RateLimitTier = "AI_INFERENCE"; // 10 requests / 60s

    for (let i = 0; i < 10; i++) {
      const res = await enforceRateLimit(testId, tier);
      assert.strictEqual(res.success, true, `Request ${i + 1} should succeed`);
    }

    // 11th request must be rate-limited
    const exceeded = await enforceRateLimit(testId, tier);
    assert.strictEqual(exceeded.success, false);
    assert.strictEqual(exceeded.remaining, 0);
    assert.ok(exceeded.retryAfter !== undefined && exceeded.retryAfter > 0);

    const headers = getRateLimitHeaders(exceeded);
    assert.strictEqual(headers.get("X-RateLimit-Limit"), "10");
    assert.strictEqual(headers.get("X-RateLimit-Remaining"), "0");
    assert.ok(headers.has("Retry-After"));
  });

  test("Production fail-closed: fails closed when Upstash credentials are missing in production", async () => {
    const origEnv = process.env.NODE_ENV;
    const origFallback = process.env.RATE_LIMIT_ALLOW_FALLBACK;
    const origUrl = process.env.UPSTASH_REDIS_REST_URL;
    const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.RATE_LIMIT_ALLOW_FALLBACK;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const res = await enforceRateLimit("prod_user_test", "STANDARD_API");
      assert.strictEqual(res.success, false, "Must fail closed when Upstash credentials missing in production");
      assert.strictEqual(res.remaining, 0);
      assert.strictEqual(res.errorType, "INFRASTRUCTURE_UNAVAILABLE");
      assert.ok(res.reason?.includes("unconfigured in production"));
    } finally {
      (process.env as any).NODE_ENV = origEnv;
      if (origFallback) process.env.RATE_LIMIT_ALLOW_FALLBACK = origFallback;
      if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl;
      if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
    }
  });

  test("Supports mock overrides for automated testing", async () => {
    setRateLimiterForTest(async () => false);
    const blocked = await enforceRateLimit("mock_user", "STANDARD_API");
    assert.strictEqual(blocked.success, false);

    setRateLimiterForTest(async () => true);
    const allowed = await enforceRateLimit("mock_user", "STANDARD_API");
    assert.strictEqual(allowed.success, true);
  });

  test("Direct unproxied connections in production are identified as untrusted-direct-origin, not 127.0.0.1", () => {
    const origEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = "production";
      const reqDirect = new Request("https://promptshield.io/api/test");
      assert.strictEqual(getClientIp(reqDirect), "untrusted-direct-origin");
    } finally {
      (process.env as any).NODE_ENV = origEnv;
    }
  });

  test("TRUST_PROXY_HOPS correctly prevents client header spoofing in multi-hop topologies", () => {
    process.env.TRUST_PROXY = "true";
    process.env.TRUST_PROXY_HOPS = "1";
    try {
      // Attacker attempts to forge client IP by injecting 1.1.1.1, real client IP added by proxy is 203.0.113.50
      const req = new Request("https://promptshield.io/api/test", {
        headers: { "x-forwarded-for": "1.1.1.1, 203.0.113.50" },
      });
      assert.strictEqual(getClientIp(req), "203.0.113.50");
    } finally {
      delete process.env.TRUST_PROXY;
      delete process.env.TRUST_PROXY_HOPS;
    }
  });

  test("Enforces quota limits accurately under concurrent burst traffic", async () => {
    const burstUser = `burst_test_${Date.now()}`;
    const tier: RateLimitTier = "AI_INFERENCE"; // 10 requests max

    // Fire 20 concurrent requests simultaneously
    const requests = Array.from({ length: 20 }, () => enforceRateLimit(burstUser, tier));
    const results = await Promise.all(requests);

    const successful = results.filter((r) => r.success);
    const throttled = results.filter((r) => !r.success);

    assert.strictEqual(successful.length, 10, "Exactly 10 requests should succeed within quota window");
    assert.strictEqual(throttled.length, 10, "Remaining 10 burst requests must be rejected");
    assert.strictEqual(throttled[0].remaining, 0);
    assert.ok(throttled[0].retryAfter !== undefined && throttled[0].retryAfter > 0);
  });
});
