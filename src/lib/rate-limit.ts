import { ApiError } from "@/lib/api";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000)
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000)
  };
}

export function requireRateLimit(key: string, limit: number, windowMs: number) {
  const result = checkRateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw new ApiError(
      429,
      `Слишком много запросов. Повторите через ${result.retryAfter} сек.`,
      "RATE_LIMITED",
      { retryAfter: result.retryAfter }
    );
  }
  return result;
}
