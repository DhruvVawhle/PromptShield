import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitTier = "AI_INFERENCE" | "PROMPT_ANALYSIS" | "STANDARD_API" | "AUTH_SENSITIVE";

export type RateLimitErrorType = "QUOTA_EXCEEDED" | "INFRASTRUCTURE_UNAVAILABLE";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
  retryAfter?: number; // In seconds
  reason?: string;
  errorType?: RateLimitErrorType;
}

interface TierConfig {
  requests: number;
  windowSeconds: number;
}

const TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  AI_INFERENCE: { requests: 10, windowSeconds: 60 },
  PROMPT_ANALYSIS: { requests: 30, windowSeconds: 60 },
  STANDARD_API: { requests: 60, windowSeconds: 60 },
  AUTH_SENSITIVE: { requests: 15, windowSeconds: 60 },
};

// In-memory sliding window store for local dev & testing fallback
class MemoryRateLimiter {
  private requests = new Map<string, number[]>();

  limit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (this.requests.get(key) || []).filter((t) => t > windowStart);

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0];
      const reset = oldestInWindow + windowMs;
      const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset,
        retryAfter,
        reason: "Rate limit exceeded (in-memory dev tier).",
      };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);

    // Periodically prune old keys
    if (this.requests.size > 10000) {
      for (const [k, ts] of this.requests.entries()) {
        const valid = ts.filter((t) => t > windowStart);
        if (valid.length === 0) this.requests.delete(k);
        else this.requests.set(k, valid);
      }
    }

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - timestamps.length,
      reset: now + windowMs,
    };
  }

  reset() {
    this.requests.clear();
  }
}

const memoryLimiter = new MemoryRateLimiter();

// Singleton Upstash clients and limiters cache
let cachedRedis: Redis | null = null;
const cachedUpstashLimiters = new Map<RateLimitTier, Ratelimit>();

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!cachedRedis) {
    cachedRedis = new Redis({ url, token });
  }
  return cachedRedis;
}

function getUpstashLimiter(tier: RateLimitTier): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  if (!cachedUpstashLimiters.has(tier)) {
    const config = TIER_CONFIGS[tier];
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, `${config.windowSeconds} s`),
      analytics: true,
      prefix: `@promptshield/rl/${tier.toLowerCase()}`,
    });
    cachedUpstashLimiters.set(tier, limiter);
  }
  return cachedUpstashLimiters.get(tier)!;
}

/**
 * Extracts client IP securely, preventing simple header injection / spoofing.
 * Only trusts Cloudflare headers if deployment is verified behind Cloudflare (TRUST_CLOUDFLARE=true or DEPLOYMENT_PLATFORM=cloudflare).
 * Only trusts reverse proxy headers (X-Forwarded-For, X-Real-IP) if TRUST_PROXY is explicitly enabled.
 * Direct-origin access without verified proxy infrastructure strictly ignores client headers.
 */
export function getClientIp(request: Request): string {
  // 1. Cloudflare edge-injected headers: ONLY trust when deployment is verified to be behind Cloudflare
  const trustCloudflare =
    process.env.TRUST_CLOUDFLARE === "true" || process.env.DEPLOYMENT_PLATFORM === "cloudflare";

  if (trustCloudflare) {
    const cfIp = request.headers.get("cf-connecting-ip") || request.headers.get("true-client-ip");
    if (cfIp) return cfIp.trim();
  }

  // 2. Only trust X-Forwarded-For or X-Real-IP if explicitly configured behind a trusted reverse proxy
  const trustProxy = process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY_HEADERS === "true";

  if (trustProxy) {
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      // In trusted proxy setups, parse client IP safely
      const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        if (process.env.TRUST_PROXY_HOPS) {
          const hops = Math.max(1, parseInt(process.env.TRUST_PROXY_HOPS, 10));
          const targetIndex = Math.max(0, parts.length - hops);
          return parts[targetIndex].replace(/:\d+$/, "");
        }
        return parts[0].replace(/:\d+$/, "");
      }
    }
  }

  // 3. Direct connection without verified edge proxy infrastructure:
  // Strictly do not trust client-supplied headers to prevent origin bypass spoofing.
  // In production, direct origin callers are categorized as an isolated untrusted pool
  // rather than falsely assuming trusted loopback 127.0.0.1.
  if (process.env.NODE_ENV === "production") {
    return "untrusted-direct-origin";
  }
  return "127.0.0.1";
}

/**
 * Formats standard HTTP rate-limiting headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", Math.max(0, result.remaining).toString());
  headers.set("X-RateLimit-Reset", Math.ceil(result.reset / 1000).toString());
  if (!result.success && result.retryAfter !== undefined) {
    headers.set("Retry-After", result.retryAfter.toString());
  }
  if (result.errorType) {
    headers.set("X-RateLimit-Error-Type", result.errorType);
  }
  return headers;
}

type RateLimitMockFn = (key: string, tier?: RateLimitTier) => Promise<boolean | RateLimitResult>;
let testMockFn: RateLimitMockFn | null = null;

export function setRateLimiterForTest(mock: RateLimitMockFn | null) {
  testMockFn = mock;
}

/**
 * Main Rate Limiting Enforcement Engine.
 * 
 * Guarantees:
 * - Production fails closed when Upstash credentials are missing or errors occur,
 *   unless explicitly overridden with RATE_LIMIT_ALLOW_FALLBACK=true.
 * - Development/testing gracefully falls back to memory sliding window.
 * - Returns rich limit metadata including Retry-After.
 */
export async function enforceRateLimit(
  identifier: string,
  tier: RateLimitTier = "STANDARD_API"
): Promise<RateLimitResult> {
  if (testMockFn) {
    const mockRes = await testMockFn(identifier, tier);
    if (typeof mockRes === "boolean") {
      return {
        success: mockRes,
        limit: TIER_CONFIGS[tier].requests,
        remaining: mockRes ? 1 : 0,
        reset: Date.now() + TIER_CONFIGS[tier].windowSeconds * 1000,
        retryAfter: mockRes ? undefined : 60,
      };
    }
    return mockRes;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const config = TIER_CONFIGS[tier];

  const upstashLimiter = getUpstashLimiter(tier);

  if (!upstashLimiter) {
    if (isProduction) {
      // Production fail-closed: distributed rate limiting is mandatory
      // In-memory fallback is strictly prohibited in production under all circumstances
      console.error(
        `[RateLimiter] CRITICAL: Missing Upstash Redis credentials in production for identifier: ${identifier}. Failing closed.`
      );
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset: Date.now() + config.windowSeconds * 1000,
        retryAfter: config.windowSeconds,
        reason: "Rate limiting infrastructure unconfigured in production environment.",
        errorType: "INFRASTRUCTURE_UNAVAILABLE",
      };
    }

    // Development or test ONLY: in-memory limiter
    return memoryLimiter.limit(identifier, config.requests, config.windowSeconds * 1000);
  }

  try {
    const result = await upstashLimiter.limit(identifier);
    const reset = result.reset;
    const retryAfter = result.success ? undefined : Math.max(1, Math.ceil((reset - Date.now()) / 1000));

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset,
      retryAfter,
      reason: result.success ? undefined : "Too many requests. Quota exhausted.",
      errorType: result.success ? undefined : "QUOTA_EXCEEDED",
    };
  } catch (error) {
    console.error("[RateLimiter] Error communicating with Upstash Redis:", error);
    if (isProduction) {
      // Production fail-closed: do not silently allow traffic or switch to local memory on Redis outages
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset: Date.now() + config.windowSeconds * 1000,
        retryAfter: 30,
        reason: "Rate limiting service temporarily unavailable.",
        errorType: "INFRASTRUCTURE_UNAVAILABLE",
      };
    }

    // In dev or test ONLY: log and fall back to local memory window
    return memoryLimiter.limit(identifier, config.requests, config.windowSeconds * 1000);
  }
}

/**
 * Backwards-compatible checkRateLimit function.
 */
export const checkRateLimit = async (uid: string, tier: RateLimitTier = "STANDARD_API"): Promise<boolean> => {
  const result = await enforceRateLimit(uid, tier);
  return result.success;
};
