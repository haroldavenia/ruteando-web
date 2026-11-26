// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';

import { isAllowed, safeSegments } from '@/lib/allowlist';
import { verifySameOrigin } from '@/lib/csrf';
import { gatewayFetch } from '@/lib/gateway';
import { rateLimit, resetRateLimits } from '@/lib/rate-limit';
import { packUser, unpackUser, type SessionUser } from '@/lib/session';

const admin: SessionUser = { id: '1', email: 'a@b.c', role: 'tenant_admin', tenantId: 't' };

test('allowlist: recurso, método y rol', () => {
  expect(isAllowed(['places'], 'GET', 'tenant_admin')).toBe(true);
  expect(isAllowed(['places', 'abc'], 'DELETE', 'tenant_admin')).toBe(true);
  expect(isAllowed(['places'], 'GET', 'agent')).toBe(false); // lugares: solo administradores
  expect(isAllowed(['packages'], 'GET', 'agent')).toBe(true);
  expect(isAllowed(['master-domains', 'x', 'values'], 'POST', 'agent')).toBe(false);
  expect(isAllowed(['audit-logs'], 'DELETE', 'tenant_admin')).toBe(false); // solo lectura
  expect(isAllowed(['places'], 'GET', undefined)).toBe(false);
  expect(isAllowed(['inexistente'], 'GET', 'super_admin')).toBe(false);
});

test('allowlist: auth/** y variantes nunca pasan (regresión v1.20.1: 2FA saltado por la ruta)', () => {
  for (const variant of [
    ['auth', 'login'],
    ['AUTH', 'Login'],
    ['auth', 'sso', 'exchange'],
    ['auth', 'refresh'],
    ['', 'auth', 'login'],
    ['.', 'auth', 'login'],
    ['places', '..', 'auth', 'login'],
    ['places', '..%2Fauth'],
    ['auth;x=1', 'login'],
    ['places\\..\\auth'],
    ['places', 'a/b'],
    ['places?x'],
  ]) {
    expect(isAllowed(variant, 'POST', 'super_admin'), variant.join('|')).toBe(false);
  }
  expect(safeSegments([])).toBeNull();
});

test('CSRF: los métodos que cambian estado exigen el mismo origen', () => {
  const req = (method: string, headers: Record<string, string>) =>
    new Request('http://app.test/middleware/data/x', { method, headers });
  expect(verifySameOrigin(req('GET', {}))).toBe(true);
  expect(verifySameOrigin(req('POST', {}))).toBe(false); // sin Origin
  expect(verifySameOrigin(req('POST', { origin: 'http://evil.test' }))).toBe(false);
  expect(verifySameOrigin(req('POST', { origin: 'http://app.test' }))).toBe(true);
  expect(verifySameOrigin(req('DELETE', { origin: 'nonsense' }))).toBe(false);
});

test('cookie de usuario firmada: una alteración se rechaza', () => {
  const packed = packUser(admin);
  expect(unpackUser(packed)).toEqual(admin);
  const [body, mac] = packed.split('.');
  const forged = Buffer.from(JSON.stringify({ ...admin, role: 'super_admin' })).toString('base64url');
  expect(unpackUser(`${forged}.${mac}`)).toBeNull();
  expect(unpackUser(`${body}.AAAA`)).toBeNull();
  expect(unpackUser('basura')).toBeNull();
  expect(unpackUser(undefined)).toBeNull();
});

test('límite de peticiones: ventana fija', () => {
  resetRateLimits();
  expect([1, 2, 3, 4].map(() => rateLimit('k', 3, 1000, 0))).toEqual([true, true, true, false]);
  expect(rateLimit('k', 3, 1000, 1001)).toBe(true); // otra ventana
  expect(rateLimit('otro', 3, 1000, 0)).toBe(true);
});

beforeEach(() => vi.restoreAllMocks());

test('gateway: añade X-Api-Key, quita Origin/Cookie y no filtra la clave en los fallos', async () => {
  const env = { GATEWAY_URL: 'http://gw.internal:9', GATEWAY_API_KEY: 'secreto-123' };
  const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  await gatewayFetch('/places', {
    env,
    token: 'tok',
    headers: { origin: 'http://x', cookie: 'a=b', 'x-api-key': 'del-cliente', authorization: 'Bearer del-cliente' },
  });
  const [url, init] = spy.mock.calls[0];
  const h = new Headers((init as RequestInit).headers);
  expect(String(url)).toBe('http://gw.internal:9/api/v1/places');
  expect(h.get('x-api-key')).toBe('secreto-123');
  expect(h.get('authorization')).toBe('Bearer tok');
  expect(h.has('origin') || h.has('cookie')).toBe(false);

  spy.mockRejectedValue(new Error('connect ECONNREFUSED gw.internal secreto-123'));
  const err = await gatewayFetch('/x', { env }).catch((e) => e);
  expect(err.status).toBe(502);
  expect(err.message).not.toContain('secreto');
  await expect(gatewayFetch('/x', { env: {} })).rejects.toMatchObject({ status: 503 }); // sin configurar
  await expect(gatewayFetch('/x', { env: { GATEWAY_MODE: 'otro' } })).rejects.toMatchObject({ status: 503 });
});

test('refresh: varias peticiones con el mismo token comparten una sola llamada al gateway', async () => {
  vi.stubEnv('GATEWAY_URL', 'http://gw.internal:9');
  vi.stubEnv('GATEWAY_API_KEY', 'k');
  const session = { accessToken: 'a2', refreshToken: 'r', expiresIn: 3600, user: admin };
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    await new Promise((r) => setTimeout(r, 20));
    return Response.json(session);
  });
  const { refreshWithGateway } = await import('@/lib/auth-flow');
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => refreshWithGateway('r')));
  expect(spy).toHaveBeenCalledTimes(1);
  expect(results.every((r) => r?.accessToken === 'a2')).toBe(true);
  await refreshWithGateway('r'); // terminada la primera, una nueva sí llama otra vez
  expect(spy).toHaveBeenCalledTimes(2);
  vi.unstubAllEnvs();
});
