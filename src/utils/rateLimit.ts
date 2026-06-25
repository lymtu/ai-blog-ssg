interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

function getEntry(key: string) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now >= entry.resetAt) return null;
  return entry;
}

export function getRateLimitStatus(
  key: string,
  maxAttempts: number,
): RateLimitResult {
  const now = Date.now();
  const entry = getEntry(key);

  if (!entry) {
    return { allowed: true, remaining: maxAttempts, resetAt: now };
  }

  return {
    allowed: entry.count < maxAttempts,
    remaining: Math.max(0, maxAttempts - entry.count),
    resetAt: entry.resetAt,
  };
}

export function recordRateLimitFailure(
  key: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = getEntry(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: now + windowMs,
    };
  }

  entry.count += 1;
  return {
    allowed: entry.count < maxAttempts,
    remaining: Math.max(0, maxAttempts - entry.count),
    resetAt: entry.resetAt,
  };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}

export { parseDurationToSeconds as parseJwtExpiresIn } from "./duration";
