export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
  unavailable: boolean;
};

export function normalizeRateLimitResult(
  data: unknown,
  hasError: boolean,
  maximumWindowSeconds: number,
): RateLimitResult {
  const row = Array.isArray(data) ? data[0] as { allowed?: unknown; retry_after_seconds?: unknown } | undefined : undefined;
  if (hasError || !row || typeof row.allowed !== 'boolean') {
    return { allowed: false, retryAfter: 60, unavailable: true };
  }
  return {
    allowed: row.allowed,
    retryAfter: Math.max(1, Math.min(Number(row.retry_after_seconds) || 1, maximumWindowSeconds)),
    unavailable: false,
  };
}

