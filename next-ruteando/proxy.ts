import { type NextRequest, NextResponse } from 'next/server';

import { unpackUser } from '@/lib/session-token';

const PUBLIC = [/^\/access(\/|$)/, /^\/legal(\/|$)/, /^\/middleware(\/|$)/, /^\/gateway\/sso(\/|$)/];
/** Respuestas de autenticación y de datos: nunca se guardan en cachés (del navegador ni compartidas). */
const NO_STORE = [/^\/middleware(\/|$)/, /^\/gateway\/sso(\/|$)/];

/** CSP con nonce por petición. `CSP_MODE`: report-only (por defecto), enforce u off. */
export function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Los estilos en línea de React/Radix se resuelven con nonce; OpenLayers y las fuentes de Google se añaden en la fase 4/5.
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Guardia de acceso: sin una sesión creada por este servidor (cookie `rt_user` con firma válida y una de las dos de token) las páginas
  // privadas llevan a /access. No sustituye a la comprobación de cada página que muestre datos, y los Route Handlers de /middleware se
  // protegen solos (401 en JSON, no redirección).
  const signed = unpackUser(request.cookies.get('rt_user')?.value);
  const hasSession = Boolean(signed) && (request.cookies.has('rt_refresh') || request.cookies.has('rt_access'));
  if (!hasSession && !PUBLIC.some((re) => re.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = '/access';
    url.search = pathname === '/' ? '' : `?returnUrl=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const mode = process.env.CSP_MODE || 'report-only';
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  const csp = buildCsp(nonce);
  // Next lee el nonce de la CSP de la petición para marcar sus propios scripts.
  if (mode !== 'off') headers.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers } });
  if (mode === 'enforce') response.headers.set('content-security-policy', csp);
  else if (mode !== 'off') response.headers.set('content-security-policy-report-only', csp);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  // HSTS solo si la petición llegó por https (detrás de un proxy, por X-Forwarded-Proto): por http el navegador lo ignoraría.
  if (request.headers.get('x-forwarded-proto') === 'https' || request.nextUrl.protocol === 'https:') {
    response.headers.set('strict-transport-security', 'max-age=15552000; includeSubDomains');
  }
  if (NO_STORE.some((re) => re.test(pathname))) response.headers.set('cache-control', 'no-store');
  return response;
}

export const config = {
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico|healthCheck).*)' }],
};
