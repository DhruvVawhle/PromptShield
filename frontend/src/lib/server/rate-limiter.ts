import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export let checkRateLimit = async (uid: string): Promise<boolean> => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      analytics: true,
    });
    const { success } = await ratelimit.limit(`ratelimit_${uid}`);
    return success;
  }
  return true;
};

export function setRateLimiterForTest(mock: (uid: string) => Promise<boolean>) {
  checkRateLimit = mock;
}
