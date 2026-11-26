const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** CSRF: toda petición que cambia estado debe venir de este mismo origen (cabecera Origin; sin ella, se rechaza). */
export function verifySameOrigin(request: Request): boolean {
  if (SAFE.has(request.method)) return true;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
