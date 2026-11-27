// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { validateConfig } from '@/lib/config';
import { safeReturnUrl } from '@/lib/return-url';
import { packUser, type SessionUser } from '@/lib/session-token';
import { proxy } from '@/proxy';

const user: SessionUser = { id: 'u1', email: 'a@b.co', role: 'agent', tenantId: 't1' };
const req = (path: string, cookie = '', headers: Record<string, string> = {}) =>
  new NextRequest(`http://app.test${path}`, { headers: { ...(cookie ? { cookie } : {}), ...headers } });
const cookieFor = (u = user) => `rt_user=${packUser(u)}; rt_refresh=r`;

afterEach(() => vi.unstubAllEnvs());

describe('safeReturnUrl', () => {
  test('acepta rutas internas con consulta y fragmento', () => {
    expect(safeReturnUrl('/journeys/12?tab=map#x')).toBe('/journeys/12?tab=map#x');
  });

  test.each([
    ['vacío', ''],
    ['otro esquema', 'https://evil.test'],
    ['protocolo relativo', '//evil.test'],
    ['barra invertida', '/\\evil.test'],
    ['tabulador', '/\t/evil.test'],
    ['salto de línea', '/\n/evil.test'],
    ['javascript', 'javascript:alert(1)'],
    ['sin barra inicial', 'journeys'],
    ['vuelve al acceso', '/access'],
    ['acceso normalizado', '/a/../access/register'],
    ['con espacios', '/a b'],
  ])('rechaza %s', (_n, raw) => {
    expect(safeReturnUrl(raw)).toBe('/');
  });

  test('null y undefined dan /', () => {
    expect(safeReturnUrl(null)).toBe('/');
    expect(safeReturnUrl(undefined)).toBe('/');
  });
});

describe('validateConfig', () => {
  const ok = { NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(32) };

  test('fuera de producción no exige nada', () => {
    expect(validateConfig({})).toEqual([]);
    expect(validateConfig({ NODE_ENV: 'development' })).toEqual([]);
  });

  test('en producción exige SESSION_SECRET de al menos 32 caracteres', () => {
    expect(validateConfig(ok)).toEqual([]);
    expect(validateConfig({ NODE_ENV: 'production' })).toHaveLength(1);
    expect(validateConfig({ NODE_ENV: 'production', SESSION_SECRET: 'corta' })).toHaveLength(1);
  });

  test('en producción rechaza GATEWAY_MODE inválido y SSO_ALLOW_INSECURE', () => {
    expect(validateConfig({ ...ok, GATEWAY_MODE: 'otro' })).toHaveLength(1);
    expect(validateConfig({ ...ok, SSO_ALLOW_INSECURE: 'true' })).toHaveLength(1);
  });

  test('sin SESSION_SECRET la firma falla cerrada en producción', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', '');
    expect(() => packUser(user)).toThrow(/SESSION_SECRET/);
  });
});

describe('proxy: guardia de acceso', () => {
  test('sin cookies lleva a /access con el destino codificado', () => {
    const res = proxy(req('/journeys/12?x=1'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://app.test/access?returnUrl=%2Fjourneys%2F12%3Fx%3D1');
    expect(proxy(req('/')).headers.get('location')).toBe('http://app.test/access'); // la raíz no lleva destino
  });

  test.each([
    ['cookie inventada', 'rt_refresh=basura'],
    [
      'rt_user sin firma',
      `rt_user=${Buffer.from(JSON.stringify({ ...user, role: 'super_admin' })).toString('base64url')}.AAAA; rt_refresh=r`,
    ],
    ['rt_user válida pero sin token', `rt_user=${packUser(user)}`],
    ['solo tokens, sin rt_user', 'rt_refresh=r; rt_access=a'],
  ])('rechaza %s', (_n, cookie) => {
    expect(proxy(req('/journeys', cookie)).status).toBe(307);
  });

  test('una sesión con firma válida pasa', () => {
    const res = proxy(req('/journeys', cookieFor()));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  test('las rutas públicas y los handlers no redirigen', () => {
    for (const p of [
      '/access',
      '/access/register',
      '/legal/privacy',
      '/middleware/auth/me',
      '/gateway/sso/google/start',
    ]) {
      expect(proxy(req(p)).status, p).toBe(200);
    }
  });
});

describe('proxy: cabeceras', () => {
  test('cabeceras de seguridad y CSP con un nonce distinto por petición', () => {
    const a = proxy(req('/access'));
    const b = proxy(req('/access'));
    expect(a.headers.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(a.headers.get('permissions-policy')).toContain('camera=()');
    expect(a.headers.get('x-frame-options')).toBe('DENY');
    expect(a.headers.get('x-content-type-options')).toBe('nosniff');
    const nonce = (r: Response) => /nonce-([^']+)/.exec(r.headers.get('content-security-policy-report-only') ?? '')![1];
    expect(nonce(a)).not.toBe(nonce(b));
  });

  test('HSTS solo cuando la petición llegó por https', () => {
    expect(proxy(req('/access')).headers.get('strict-transport-security')).toBeNull();
    expect(
      proxy(req('/access', '', { 'x-forwarded-proto': 'https' })).headers.get('strict-transport-security')
    ).toContain('max-age=');
  });

  test('las respuestas de autenticación y SSO no se cachean', () => {
    expect(proxy(req('/middleware/auth/me')).headers.get('cache-control')).toBe('no-store');
    expect(proxy(req('/gateway/sso/providers')).headers.get('cache-control')).toBe('no-store');
    expect(proxy(req('/access')).headers.get('cache-control')).toBeNull();
  });

  test('CSP_MODE: enforce usa la cabecera que bloquea y off no pone ninguna', () => {
    vi.stubEnv('CSP_MODE', 'enforce');
    const enforce = proxy(req('/access'));
    expect(enforce.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(enforce.headers.get('content-security-policy-report-only')).toBeNull();
    vi.stubEnv('CSP_MODE', 'off');
    const off = proxy(req('/access'));
    expect(off.headers.get('content-security-policy')).toBeNull();
    expect(off.headers.get('content-security-policy-report-only')).toBeNull();
  });
});

describe('CSP', () => {
  test('scripts, estilos y fuentes solo del propio origen (las fuentes las aloja next/font)', async () => {
    const { buildCsp } = await import('@/proxy');
    const csp = buildCsp('NONCE');
    const directive = (name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';
    expect(directive('script-src')).toBe("script-src 'self' 'nonce-NONCE' 'strict-dynamic'");
    expect(directive('style-src')).toBe("style-src 'self' 'nonce-NONCE'");
    expect(directive('style-src-attr')).toBe("style-src-attr 'unsafe-inline'");
    expect(directive('font-src')).toBe("font-src 'self'");
    expect(directive('connect-src')).toBe("connect-src 'self'");
    // el único `unsafe-inline` es el de los atributos style (ver proxy.ts); nunca en script-src ni en style-src
    expect(csp.replace("style-src-attr 'unsafe-inline'", '')).not.toMatch(
      /googleapis|gstatic|unsafe-inline|unsafe-eval/
    );
    // lo único externo son las teselas del mapa (imágenes)
    expect(directive('img-src')).toContain('https://tile.openstreetmap.org');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});
