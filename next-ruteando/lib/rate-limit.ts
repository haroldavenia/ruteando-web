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

/**
 * IP del cliente según X-Forwarded-For. Solo vale la entrada que añadió NUESTRO proxy: se cuenta desde la derecha con
 * `TRUSTED_PROXY_HOPS` (1 por defecto: un solo proxy delante, como Render o nginx). Las entradas de la izquierda las escribe el cliente
 * y se ignoran; con 0 saltos no se confía en la cabecera y todos comparten cubo (mejor eso que dejarse falsificar).
 */
export function clientIp(request: Request, hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1)): string {
  if (!(hops > 0)) return 'local';
  const chain = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return chain[chain.length - hops] ?? 'local';
}
