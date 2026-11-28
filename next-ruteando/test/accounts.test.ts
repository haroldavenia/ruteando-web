// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { POST as forgot } from '@/app/middleware/auth/forgot-password/route';
import { POST as login } from '@/app/middleware/auth/login/route';
import { POST as register } from '@/app/middleware/auth/register/route';
import { POST as resetPassword } from '@/app/middleware/auth/reset-password/route';
import { POST as verifyEmail } from '@/app/middleware/auth/verify-email/route';
import { loginGate } from '@/lib/login-flow';
import { getMfa, resetMfaForTests } from '@/lib/mfa/service';
import { resetRateLimits } from '@/lib/rate-limit';
import type * as SessionModule from '@/lib/session';
import { writeSession } from '@/lib/session';

// `cookies()` solo existe dentro de una petición de Next: se sustituye la escritura de cookies y se comprueba cuándo se llama.
vi.mock('@/lib/session', async (original) => ({
  ...(await original<typeof SessionModule>()),
  writeSession: vi.fn(),
}));

const KEY = Buffer.alloc(32, 7).toString('base64');
const session = {
  message: null,
  accessToken: 'tok-acceso',
  refreshToken: 'tok-refresco',
  expiresIn: 3600,
  user: { id: 'u1', email: 'ada@example.invalid', role: 'tenant_admin', tenantId: 't1', phone: '+57300' },
};

const post = (path: string, body: unknown, headers: Record<string, string> = { origin: 'http://app.test' }) =>
  new Request(`http://app.test/middleware/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

let gatewayCalls: { url: string; body: Record<string, unknown> }[] = [];
let gatewayReply: () => Response = () => Response.json(session);

beforeEach(() => {
  resetRateLimits();
  resetMfaForTests();
  gatewayCalls = [];
  gatewayReply = () => Response.json(session);
  vi.mocked(writeSession).mockClear();
  vi.stubEnv('GATEWAY_URL', 'http://gw.internal:9');
  vi.stubEnv('GATEWAY_API_KEY', 'k');
  vi.stubEnv('MFA_SECRET_KEY', KEY);
  vi.stubEnv('MFA_DB_PATH', ':memory:');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    gatewayCalls.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
    return gatewayReply();
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('puerta de acceso', () => {
  test('sin segundo factor y sin autorización explícita, cerrada', () => {
    vi.stubEnv('MFA_SECRET_KEY', '');
    resetMfaForTests();
    expect(loginGate()?.status).toBe(503);
    vi.stubEnv('ALLOW_LOGIN_WITHOUT_MFA', 'true');
    expect(loginGate()).toBeNull();
  });

  test('con el módulo de segundo factor activo, abierta', () => {
    expect(loginGate()).toBeNull();
  });
});

describe('endpoints públicos: lo común', () => {
  test('exigen el mismo origen (CSRF)', async () => {
    for (const [fn, path] of [
      [login, 'login'],
      [register, 'register'],
      [forgot, 'forgot-password'],
      [resetPassword, 'reset-password'],
      [verifyEmail, 'verify-email'],
    ] as const) {
      expect((await fn(post(path, {}, {}))).status, path).toBe(403);
      expect((await fn(post(path, {}, { origin: 'http://evil.test' }))).status, path).toBe(403);
    }
    expect(gatewayCalls).toHaveLength(0);
  });

  test('rechazan JSON roto, campos que faltan, que no son cadenas o demasiado largos', async () => {
    expect((await forgot(post('forgot-password', '{no es json'))).status).toBe(400);
    expect((await forgot(post('forgot-password', '[]'))).status).toBe(400);
    expect((await forgot(post('forgot-password', {}))).status).toBe(400);
    expect((await forgot(post('forgot-password', { email: { $ne: '' } }))).status).toBe(400);
    expect((await forgot(post('forgot-password', { email: 'a'.repeat(300) }))).status).toBe(400);
    expect((await forgot(post('forgot-password', 'x'.repeat(30_000)))).status).toBe(413);
    expect(gatewayCalls).toHaveLength(0);
  });

  test('solo reenvían los campos esperados', async () => {
    await register(
      post('register', {
        email: 'a@b.co',
        password: 'p',
        firstName: 'A',
        lastName: 'B',
        tenantName: 'T',
        role: 'super_admin',
        tenantId: 'otra',
      })
    );
    expect(Object.keys(gatewayCalls[0].body).sort()).toEqual([
      'email',
      'firstName',
      'lastName',
      'password',
      'tenantName',
    ]);
  });

  test('los fallos del gateway no se filtran: 5xx genérico, 4xx solo error y mensaje', async () => {
    gatewayReply = () =>
      new Response(JSON.stringify({ error: 'X', trace: 'at secret.java:1', message: 'detalle interno' }), {
        status: 500,
      });
    const five = await forgot(post('forgot-password', { email: 'a@b.co' }));
    expect(five.status).toBe(502);
    expect(JSON.stringify(await five.json())).not.toContain('secret');
    gatewayReply = () =>
      new Response(JSON.stringify({ error: 'BAD_REQUEST', message: 'Token inválido', trace: 'at x' }), { status: 400 });
    const four = await resetPassword(post('reset-password', { token: 't', newPassword: 'p' }));
    expect(four.status).toBe(400);
    expect(await four.json()).toEqual({ error: 'BAD_REQUEST', message: 'Token inválido' });
  });

  test('recuperar y reenviar: tope por correo (no se puede inundar de mensajes a una persona)', async () => {
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await forgot(post('forgot-password', { email: 'Victima@B.co' }))).status);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect((await forgot(post('forgot-password', { email: 'otra@b.co' }))).status).toBe(200); // otra persona no se ve afectada
  });
});

describe('endpoints que no abren sesión no devuelven tokens', () => {
  test('restablecer y recuperar: solo el mensaje, aunque el gateway devuelva una sesión', async () => {
    const reset = await resetPassword(post('reset-password', { token: 't', newPassword: 'p' }));
    const body = JSON.stringify(await reset.json());
    expect(body).not.toContain('tok-');
    expect(JSON.parse(body)).toEqual({ message: null });
    expect(writeSession).not.toHaveBeenCalled();
  });

  test('registro: usuario, empresa y mensaje; sin tokens', async () => {
    gatewayReply = () => Response.json({ ...session, tenant: { id: 't1', name: 'T' }, message: 'ok' });
    const res = await register(
      post('register', { email: 'a@b.co', password: 'p', firstName: 'A', lastName: 'B', tenantName: 'T' })
    );
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('tok-');
    expect(text).toContain('"tenant"');
    expect(writeSession).not.toHaveBeenCalled();
  });
});

describe('rutas que entregan sesión pasan por el segundo factor', () => {
  const enroll = () =>
    getMfa().enabled &&
    (getMfa() as ReturnType<typeof getMfa> & { store: { putFactor: (f: object) => void } }).store.putFactor({
      userId: 'u1',
      tenantId: 't1',
      type: 'totp',
      secretEnc: 'x',
      verified: true,
    });

  test.each([
    ['login', login, { email: 'ada@example.invalid', password: 'demo1234' }],
    ['verify-email', verifyEmail, { token: 'abc' }],
  ] as const)('%s con un método activo: devuelve el reto, no la sesión', async (path, fn, body) => {
    enroll();
    const res = await fn(post(path, body));
    const json = await res.json();
    expect(json).toMatchObject({ mfaRequired: true });
    expect(JSON.stringify(json)).not.toContain('tok-');
    expect(writeSession).not.toHaveBeenCalled(); // ninguna cookie de sesión hasta superar el segundo factor
  });

  test.each([
    ['login', login, { email: 'ada@example.invalid', password: 'demo1234' }],
    ['verify-email', verifyEmail, { token: 'abc' }],
  ] as const)('%s sin métodos activos: cookies y solo el usuario en el JSON', async (path, fn, body) => {
    const res = await fn(post(path, body));
    expect(res.status).toBe(200);
    expect(writeSession).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(await res.json())).not.toContain('tok-');
  });

  test('verify-email con la puerta cerrada no gasta el token de un solo uso', async () => {
    vi.stubEnv('MFA_SECRET_KEY', '');
    resetMfaForTests();
    const res = await verifyEmail(post('verify-email', { token: 'abc' }));
    expect(res.status).toBe(503);
    expect(gatewayCalls).toHaveLength(0);
  });

  test('si el gateway no devuelve una sesión válida, 502 y nada se guarda', async () => {
    gatewayReply = () => Response.json({ accessToken: 'solo-esto' });
    expect((await verifyEmail(post('verify-email', { token: 'abc' }))).status).toBe(502);
    expect((await login(post('login', { email: 'a@b.co', password: 'p' }))).status).toBe(502);
    expect(writeSession).not.toHaveBeenCalled();
  });
});
