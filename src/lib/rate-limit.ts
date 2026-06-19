import { getRedis } from "./redis";

export type RateLimitResult = { allowed: boolean; remaining: number };

// In-memory fallback for single-instance / local dev when Redis is absent.
const memory = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window rate limit (§6 Security). Redis-backed in production, in-memory
 * fallback otherwise. Returns `allowed: false` once `limit` is exceeded inside
 * `windowSec`. Callers should respond 429 when not allowed.
 */
export async function rateLimit(
  key: string,
  limit = 10,
  windowSec = 60
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis) {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSec);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  }

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }
  entry.count += 1;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

/** Best-effort client IP from proxy headers (the platform sets X-Forwarded-For). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}
