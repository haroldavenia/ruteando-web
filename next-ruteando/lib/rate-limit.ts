const hits = new Map<string, { count: number; reset: number }>();

/** Ventana fija en memoria (una sola réplica). `true` = permitido. */
export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  const hit = hits.get(key);
  if (!hit || hit.reset <= now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  return ++hit.count <= max;
}

export const resetRateLimits = () => hits.clear();

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}
