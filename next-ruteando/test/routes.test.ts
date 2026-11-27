// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { POST as logout } from '@/app/middleware/auth/logout/route';
import { GET as me } from '@/app/middleware/auth/me/route';
import { POST as refresh } from '@/app/middleware/auth/refresh/route';
import {
  DELETE as dataDelete,
  GET as dataGet,
  PATCH as dataPatch,
  POST as dataPost,
} from '@/app/middleware/data/[...path]/route';
import { GET as mfaGet, POST as mfaPost } from '@/app/middleware/mfa/[...path]/route';
import { GET as ssoGet, POST as ssoPost } from '@/app/middleware/sso/[...path]/route';
import { getMfa, resetMfaForTests } from '@/lib/mfa/service';
import { totpAt } from '@/lib/mfa/totp';
import { resetRateLimits } from '@/lib/rate-limit';
import { ACCESS, type GatewaySession, REFRESH, USER, writeSession } from '@/lib/session';
import { resetSsoForTests } from '@/lib/sso/service';

import { clearJar, history, jar, names } from './cookie-jar';

vi.mock('next/headers', async () => ({ cookies: async () => (await import('./cookie-jar')).jar }));

const ORIGIN = 'http://app.test';
const KEY = Buffer.alloc(32, 7).toString('base64');
const sessionFor = (role: string, over: Partial<GatewaySession> = {}) =>
  ({
    accessToken: 'acc-1',
    refreshToken: 'ref-1',
    expiresIn: 3600,
    user: { id: 'u1', email: 'ada@example.invalid', role, tenantId: 't1' },
    ...over,
  }) as GatewaySession;
const signIn = (role = 'tenant_admin') => writeSession(sessionFor(role));

const req = (
  method: string,
  path: string,
  init: { body?: BodyInit; headers?: Record<string, string>; origin?: string | null } = {}
) => {
  const headers: Record<string, string> = { ...init.headers };
  if (init.origin !== null && !headers.origin) headers.origin = init.origin ?? ORIGIN;
  return new Request(`${ORIGIN}${path}`, { method, headers, body: init.body });
};
const json = (method: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
  req(method, path, { body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });
const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) });

type Call = { url: string; method: string; headers: Headers; body: string | null };
let calls: Call[] = [];
let gateway: (call: Call) => Response | Promise<Response> = () => Response.json({});

beforeEach(() => {
  clearJar();
  resetRateLimits();
  resetMfaForTests();
  resetSsoForTests();
  calls = [];
  gateway = () => Response.json({});
  vi.stubEnv('GATEWAY_URL', 'http://gw.internal:9');
  vi.stubEnv('GATEWAY_API_KEY', 'k');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const call: Call = {
      url: String(url),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      // el proxy reenvía el cuerpo como bytes: se decodifica para poder compararlo
      body: init?.body
        ? typeof init.body === 'string'
          ? init.body
          : new TextDecoder().decode(init.body as ArrayBuffer)
        : null,
    };
    calls.push(call);
    return gateway(call);
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('/middleware/auth/me, refresh y logout', () => {
  test('me: sin sesión 401; con sesión, el usuario sin llamar al gateway', async () => {
    expect((await me()).status).toBe(401);
    await signIn();
    const res = await me();
    expect(res.status).toBe(200);
    expect((await res.json()).user).toMatchObject({ id: 'u1', role: 'tenant_admin' });
    expect(calls).toHaveLength(0);
  });

  test('me restaura la sesión si solo queda el refresh token', async () => {
    await signIn();
    jar.delete(ACCESS);
    gateway = () => Response.json(sessionFor('tenant_admin', { accessToken: 'acc-2' }));
    expect((await me()).status).toBe(200);
    expect(jar.get(ACCESS)?.value).toBe('acc-2');
  });

  test('me con el gateway caído: 502 genérico', async () => {
    await signIn();
    jar.delete(ACCESS);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED gw.internal'));
    const res = await me();
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('gw.internal');
  });

  test('refresh: exige el mismo origen, renueva y, si el gateway lo rechaza, 401 y cookies fuera', async () => {
    expect((await refresh(req('POST', '/x', { origin: null }))).status).toBe(403);
    await signIn();
    gateway = () => Response.json(sessionFor('tenant_admin', { accessToken: 'acc-2' }));
    expect((await refresh(req('POST', '/x'))).status).toBe(200);
    expect(jar.get(ACCESS)?.value).toBe('acc-2');
    gateway = () => new Response('{}', { status: 401 });
    const res = await refresh(req('POST', '/x'));
    expect(res.status).toBe(401);
    expect(names()).toEqual([]);
  });

  test('refresh con el gateway caído: 502', async () => {
    await signIn();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('x'));
    expect((await refresh(req('POST', '/x'))).status).toBe(502);
  });

  test('logout: avisa al gateway con el refresh token y borra las tres cookies', async () => {
    expect((await logout(req('POST', '/x', { origin: 'http://evil.test' }))).status).toBe(403);
    await signIn();
    expect((await logout(req('POST', '/x'))).status).toBe(200);
    expect(calls[0].url).toBe('http://gw.internal:9/api/v1/auth/logout');
    expect(JSON.parse(calls[0].body!)).toEqual({ refreshToken: 'ref-1' });
    expect(calls[0].headers.get('authorization')).toBe('Bearer acc-1');
    expect(names()).toEqual([]);
  });

  test('logout cierra la sesión local aunque el gateway no responda', async () => {
    await signIn();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('x'));
    expect((await logout(req('POST', '/x'))).status).toBe(200);
    expect(names()).toEqual([]);
  });

  test('logout sin sesión también responde 200 y no llama al gateway', async () => {
    expect((await logout(req('POST', '/x'))).status).toBe(200);
    expect(calls).toHaveLength(0);
  });
});

describe('/middleware/data (proxy con allowlist)', () => {
  test('GET permitido: reenvía método, ruta y consulta con la clave y el token del servidor', async () => {
    await signIn();
    gateway = () => Response.json({ content: [] }, { headers: { 'x-interno': 'secreto', 'set-cookie': 'a=b' } });
    const res = await dataGet(
      req('GET', '/middleware/data/places?page=0&size=5', {
        headers: {
          cookie: 'rt_access=acc-1',
          'x-custom': 'x',
          'x-api-key': 'del-cliente',
          authorization: 'Bearer del-cliente',
          accept: 'application/json',
          'accept-language': 'es',
        },
      }),
      ctx('places')
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('x-interno')).toBeNull(); // las cabeceras del gateway no se reenvían
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('content-type')).toContain('json');
    const c = calls[0];
    expect(c.url).toBe('http://gw.internal:9/api/v1/places?page=0&size=5');
    expect(c.headers.get('x-api-key')).toBe('k');
    expect(c.headers.get('authorization')).toBe('Bearer acc-1');
    expect(c.headers.has('cookie') || c.headers.has('x-custom') || c.headers.has('origin')).toBe(false);
    expect(c.headers.get('accept')).toBe('application/json');
    expect(c.headers.get('accept-language')).toBe('es');
  });

  test('POST, PATCH y DELETE reenvían el cuerpo y el método', async () => {
    await signIn();
    await dataPost(json('POST', '/middleware/data/places', { name: 'Depósito' }), ctx('places'));
    await dataPatch(
      json('PATCH', '/middleware/data/packages/p1/status/DONE', {}),
      ctx('packages', 'p1', 'status', 'DONE')
    );
    await dataDelete(req('DELETE', '/middleware/data/places/p1'), ctx('places', 'p1'));
    expect(calls.map((c) => [c.method, c.url.replace('http://gw.internal:9/api/v1', '')])).toEqual([
      ['POST', '/places'],
      ['PATCH', '/packages/p1/status/DONE'],
      ['DELETE', '/places/p1'],
    ]);
    expect(JSON.parse(calls[0].body!)).toEqual({ name: 'Depósito' });
  });

  test('exige el mismo origen en los métodos que cambian estado, no en GET', async () => {
    await signIn();
    expect((await dataPost(req('POST', '/x', { origin: null, body: '{}' }), ctx('places'))).status).toBe(403);
    expect((await dataDelete(req('DELETE', '/x', { origin: 'http://evil.test' }), ctx('places', 'p1'))).status).toBe(
      403
    );
    expect((await dataGet(req('GET', '/x', { origin: null }), ctx('places'))).status).toBe(200);
  });

  test('sin sesión: 401', async () => {
    expect((await dataGet(req('GET', '/x'), ctx('places'))).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  test('lo que no está en la lista no existe: 404 sin llamar al gateway (por rol, método y ruta)', async () => {
    await signIn('agent');
    for (const [fn, path] of [
      [dataGet, ['places']], // lugares: solo administradores
      [dataGet, ['users']],
      [dataGet, ['auth', 'login']],
      [dataGet, ['AUTH', 'me']],
      [dataGet, ['inexistente']],
      [dataGet, ['packages', '..', 'users']],
      [dataGet, ['packages', 'a/b']],
    ] as const) {
      expect((await fn(req('GET', '/x'), ctx(...path))).status, path.join('/')).toBe(404);
    }
    expect((await dataDelete(req('DELETE', '/x'), ctx('audit-logs'))).status).toBe(404); // solo lectura
    expect(calls).toHaveLength(0);
  });

  test('un 401 del gateway renueva la sesión UNA vez y reintenta', async () => {
    await signIn();
    let attempts = 0;
    gateway = (call) => {
      if (call.url.endsWith('/auth/refresh'))
        return Response.json(sessionFor('tenant_admin', { accessToken: 'acc-2' }));
      return ++attempts === 1 ? new Response('{}', { status: 401 }) : Response.json({ ok: true });
    };
    const res = await dataGet(req('GET', '/x'), ctx('places'));
    expect(res.status).toBe(200);
    expect(calls.map((c) => c.headers.get('authorization'))).toEqual(['Bearer acc-1', null, 'Bearer acc-2']);
  });

  test('si tras renovar sigue el 401 (o no se puede renovar), 401', async () => {
    await signIn();
    gateway = () => new Response('{}', { status: 401 }); // también el refresh
    expect((await dataGet(req('GET', '/x'), ctx('places'))).status).toBe(401);
    expect(names()).toEqual([]); // y la sesión se limpia
  });

  test('los fallos del gateway no se filtran: 5xx genérico; 4xx tal cual; 204 sin cuerpo', async () => {
    await signIn();
    gateway = () => new Response(JSON.stringify({ trace: 'at secret.java:1', message: 'interno' }), { status: 500 });
    const five = await dataGet(req('GET', '/x'), ctx('places'));
    expect(five.status).toBe(502);
    expect(await five.text()).not.toContain('secret');
    gateway = () => Response.json({ error: 'NOT_FOUND', message: 'No existe' }, { status: 404 });
    const four = await dataGet(req('GET', '/x'), ctx('places', 'zz'));
    expect(four.status).toBe(404);
    expect((await four.json()).error).toBe('NOT_FOUND');
    gateway = () => new Response(null, { status: 204 });
    const none = await dataDelete(req('DELETE', '/x'), ctx('places', 'p1'));
    expect(none.status).toBe(204);
    expect(await none.text()).toBe('');
  });

  test('gateway caído o lento: 502 / 504 genéricos; sin configurar: 503', async () => {
    await signIn();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED gw.internal:9'));
    const down = await dataGet(req('GET', '/x'), ctx('places'));
    expect(down.status).toBe(502);
    expect(await down.text()).not.toContain('gw.internal');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(Object.assign(new Error('t'), { name: 'TimeoutError' }));
    expect((await dataGet(req('GET', '/x'), ctx('places'))).status).toBe(504);
    vi.stubEnv('GATEWAY_URL', '');
    expect((await dataGet(req('GET', '/x'), ctx('places'))).status).toBe(503);
  });

  test('cuerpo de más de 10 MB: 413 sin llegar al gateway', async () => {
    await signIn();
    const res = await dataPost(req('POST', '/x', { body: 'a'.repeat(10 * 1024 * 1024 + 1) }), ctx('places'));
    expect(res.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  test('límite de 600 peticiones por minuto y por IP', async () => {
    const codes = new Set<number>();
    for (let i = 0; i < 602; i++) codes.add((await dataGet(req('GET', '/x'), ctx('places'))).status);
    expect(codes.has(429)).toBe(true);
  });
});

describe('/middleware/mfa (pegamento con las cookies)', () => {
  beforeEach(() => {
    vi.stubEnv('MFA_SECRET_KEY', KEY);
    vi.stubEnv('MFA_DB_PATH', ':memory:');
  });

  test('exige el mismo origen y una sesión (salvo el segundo paso del login)', async () => {
    expect((await mfaPost(json('POST', '/x', {}, { origin: 'http://evil.test' }), ctx('login', 'verify'))).status).toBe(
      403
    );
    expect((await mfaGet(req('GET', '/x'), ctx('status'))).status).toBe(401);
    expect((await mfaPost(json('POST', '/x', { challengeId: 'no' }), ctx('login', 'verify'))).status).toBe(401); // sin sesión, pero llega al servicio
    expect((await mfaPost(json('POST', '/x', { challengeId: 'no' }), ctx('login', 'complete'))).status).toBe(401);
    await signIn('agent');
    expect((await mfaGet(req('GET', '/x'), ctx('status'))).status).toBe(200);
  });

  test('límite de 60 peticiones por minuto y por IP', async () => {
    const codes = new Set<number>();
    for (let i = 0; i < 62; i++) codes.add((await mfaGet(req('GET', '/x'), ctx('status'))).status);
    expect(codes.has(429)).toBe(true);
  });

  test('activar TOTP, iniciar sesión de nuevo y superar el reto: la sesión llega como cookies, no en el JSON', async () => {
    await signIn('agent');
    const setup = await (await mfaPost(json('POST', '/x', {}), ctx('totp', 'setup'))).json();
    const confirm = await mfaPost(
      json('POST', '/x', { code: totpAt(setup.secret, Date.now()) }),
      ctx('totp', 'confirm')
    );
    expect(confirm.status).toBe(200);
    const [recovery] = (await confirm.json()).recoveryCodes as string[];

    // «inicia sesión de nuevo»: el servidor retiene la sesión en un reto y el navegador aún no tiene cookies
    clearJar();
    const challenge = (getMfa().afterLogin(sessionFor('agent'))!.json as { challengeId: string }).challengeId;
    const res = await mfaPost(
      json('POST', '/x', { challengeId: challenge, method: 'recovery', code: recovery }),
      ctx('login', 'verify')
    );
    expect(res.status).toBe(200);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain('acc-1');
    expect(body).not.toContain('ref-1');
    expect(names()).toEqual([ACCESS, REFRESH, USER].sort());
    expect(jar.get(ACCESS)?.value).toBe('acc-1');
  });

  test('un código erróneo no escribe ninguna cookie', async () => {
    await signIn('agent');
    const setup = await (await mfaPost(json('POST', '/x', {}), ctx('totp', 'setup'))).json();
    await mfaPost(json('POST', '/x', { code: totpAt(setup.secret, Date.now()) }), ctx('totp', 'confirm'));
    clearJar();
    const challenge = (getMfa().afterLogin(sessionFor('agent'))!.json as { challengeId: string }).challengeId;
    const res = await mfaPost(
      json('POST', '/x', { challengeId: challenge, method: 'totp', code: '000000' }),
      ctx('login', 'verify')
    );
    expect(res.status).toBe(401);
    expect(names()).toEqual([]);
  });
});

describe('/middleware/sso (pegamento con las cookies y el origen)', () => {
  const ssoEnv = () => {
    vi.stubEnv('MFA_SECRET_KEY', KEY);
    vi.stubEnv('MFA_DB_PATH', ':memory:');
    vi.stubEnv('SSO_DB_PATH', ':memory:');
    vi.stubEnv('SSO_ENABLED_PROVIDERS', 'google');
    vi.stubEnv('SSO_REDIRECT_BASE_URL', 'https://app.test');
    vi.stubEnv('SSO_ALLOW_INSECURE', 'true');
    vi.stubEnv('SSO_GOOGLE_ISSUER', 'https://idp.test');
    vi.stubEnv('SSO_GOOGLE_CLIENT_ID', 'cid');
    vi.stubEnv('SSO_GOOGLE_CLIENT_SECRET', 'sec');
    gateway = (call) =>
      call.url.endsWith('/.well-known/openid-configuration')
        ? Response.json({
            issuer: 'https://idp.test',
            authorization_endpoint: 'https://idp.test/auth',
            token_endpoint: 'https://idp.test/token',
            jwks_uri: 'https://idp.test/jwks',
          })
        : Response.json({});
  };

  test('providers es público', async () => {
    ssoEnv();
    const res = await ssoGet(req('GET', '/x', { origin: null }), ctx('providers'));
    expect(await res.json()).toEqual({ providers: [{ id: 'google', label: 'Google' }] });
  });

  test('start redirige al proveedor con la cookie ligada al navegador y sin caché', async () => {
    ssoEnv();
    const res = await ssoGet(req('GET', '/x', { origin: null }), ctx('google', 'start'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/^https:\/\/idp\.test\/auth\?/);
    expect(res.headers.get('set-cookie')).toMatch(/^ruteando_sso=.+HttpOnly/);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  test('start con un proveedor desconocido vuelve a la pantalla de acceso con el error', async () => {
    ssoEnv();
    const res = await ssoGet(req('GET', '/x', { origin: null }), ctx('facebook', 'start'));
    expect(res.headers.get('location')).toBe('/access/sso#error=NO_PROVIDER');
  });

  test('el callback NO pasa por la comprobación de origen (Apple hace POST desde otro sitio) y borra la cookie ligada', async () => {
    ssoEnv();
    const res = await ssoPost(
      req('POST', '/x', {
        origin: 'https://appleid.apple.com',
        body: 'state=x&code=y',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
      ctx('google', 'callback')
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/access/sso#error=STATE_INVALID');
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    const get = await ssoGet(req('GET', '/x?state=x&code=y', { origin: null }), ctx('google', 'callback'));
    expect(get.headers.get('location')).toBe('/access/sso#error=STATE_INVALID');
  });

  test('complete: exige origen; cerrado sin segundo factor; ticket inválido 401; JSON roto 400', async () => {
    ssoEnv();
    expect(
      (await ssoPost(json('POST', '/x', { ticket: 't' }, { origin: 'http://evil.test' }), ctx('complete'))).status
    ).toBe(403);
    expect((await ssoPost(json('POST', '/x', { ticket: 'no-existe' }), ctx('complete'))).status).toBe(401);
    expect((await ssoPost(req('POST', '/x', { body: '{no es json' }), ctx('complete'))).status).toBe(400);
    vi.stubEnv('MFA_SECRET_KEY', '');
    resetMfaForTests();
    resetSsoForTests();
    expect((await ssoPost(json('POST', '/x', { ticket: 't' }), ctx('complete'))).status).toBe(503);
  });

  test('complete sin la cookie del ticket no entra, y la respuesta siempre borra esa cookie (el ticket ya se gastó)', async () => {
    ssoEnv();
    const res = await ssoPost(
      json('POST', '/x', { ticket: 'cualquiera' }, { cookie: 'ruteando_sso_ticket=inventada' }),
      ctx('complete')
    );
    expect(res.status).toBe(401);
    expect(history).toContainEqual({
      name: 'ruteando_sso_ticket',
      value: '',
      options: { path: '/middleware/sso', httpOnly: true, maxAge: 0 },
    });
    expect(names()).toEqual([]); // ninguna cookie de sesión
  });

  test('la gestión exige sesión; con sesión responde', async () => {
    ssoEnv();
    expect((await ssoGet(req('GET', '/x'), ctx('identities'))).status).toBe(401);
    await signIn('agent');
    const res = await ssoGet(req('GET', '/x'), ctx('identities'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ identities: [] });
  });

  test('límite de 60 peticiones por minuto y por IP', async () => {
    ssoEnv();
    const codes = new Set<number>();
    for (let i = 0; i < 62; i++) codes.add((await ssoGet(req('GET', '/x', { origin: null }), ctx('providers'))).status);
    expect(codes.has(429)).toBe(true);
  });
});
