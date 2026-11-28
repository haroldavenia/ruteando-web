// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createCrypto, parseMasterKey } from '@/lib/mfa/crypto';
import { createMfa, type MfaAuth, type MfaOverrides } from '@/lib/mfa/service';
import { openStore } from '@/lib/mfa/store';
import { base32Decode, base32Encode, generateSecret, totpAt, verifyTotp } from '@/lib/mfa/totp';
import type { GatewaySession, SessionUser } from '@/lib/session';

const KEY = Buffer.alloc(32, 7).toString('base64');
const user = (over: Partial<SessionUser> = {}): SessionUser => ({
  id: 'u1',
  email: 'ada@example.invalid',
  role: 'tenant_admin',
  tenantId: 't1',
  ...over,
});
const sessionOf = (u: SessionUser): GatewaySession => ({
  accessToken: 'tok',
  refreshToken: 'ref',
  expiresIn: 3600,
  user: u,
});

let clock = 1_700_000_000_000;
let sent: string[] = [];
function build(env: Record<string, string | undefined> = {}, over: MfaOverrides = {}) {
  const mailer = {
    available: true,
    send: vi.fn(async (m: { text: string }) => void sent.push(m.text)),
  };
  const store = openStore(':memory:');
  const mfa = createMfa(
    { MFA_SECRET_KEY: KEY, ...env },
    { now: () => clock, mailer, store, sms: { available: false, provider: null }, ...over }
  );
  if (!mfa.enabled) throw new Error('MFA apagado');
  return mfa;
}
const req = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request('http://app.test/middleware/mfa/x', {
    method,
    headers,
    body: body === undefined || method === 'GET' ? undefined : JSON.stringify(body),
  });
const call = (
  mfa: ReturnType<typeof build>,
  method: string,
  path: string,
  body?: unknown,
  auth: MfaAuth = { user: null },
  headers = {}
) => mfa.handle(req(method, body, headers), path, auth);
const lastCode = () => /es (\d{6})/.exec(sent.at(-1) ?? '')![1];

beforeEach(() => {
  clock = 1_700_000_000_000;
  sent = [];
});

describe('primitivas', () => {
  test('TOTP: vector de RFC 6238 y no reutiliza el mismo paso', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    expect(totpAt(secret, 59_000)).toBe('287082');
    expect(verifyTotp(secret, '287082', 59_000, null)).toBe(1);
    expect(verifyTotp(secret, '287082', 59_000, 1)).toBeNull(); // mismo paso otra vez
    expect(verifyTotp(secret, '000000', 59_000, null)).toBeNull();
    expect(base32Decode(generateSecret())).toHaveLength(20);
  });

  test('cifrado: ida y vuelta, y una alteración o clave distinta lanza', () => {
    const a = createCrypto(parseMasterKey(KEY)!);
    const token = a.encrypt('secreto');
    expect(a.decrypt(token)).toBe('secreto');
    const raw = Buffer.from(token, 'base64');
    raw[raw.length - 1] ^= 1;
    expect(() => a.decrypt(raw.toString('base64'))).toThrow();
    const b = createCrypto(parseMasterKey(Buffer.alloc(32, 9).toString('base64'))!);
    expect(() => b.decrypt(token)).toThrow();
    expect(parseMasterKey('corta')).toBeNull();
  });
});

describe('módulo apagado', () => {
  test('sin MFA_SECRET_KEY: login pasa y /mfa responde 503', async () => {
    const mfa = createMfa({});
    expect(mfa.enabled).toBe(false);
    expect(mfa.afterLogin(sessionOf(user()))).toBeNull();
    expect((await mfa.handle(req('GET'), '/status', { user: user() })).status).toBe(503);
  });
});

describe('activación y login con segundo factor', () => {
  async function enrollTotp(mfa: ReturnType<typeof build>, u = user()) {
    const setup = await call(mfa, 'POST', '/totp/setup', {}, { user: u });
    const { secret } = setup.json as { secret: string };
    const done = await call(mfa, 'POST', '/totp/confirm', { code: totpAt(secret, clock) }, { user: u });
    return { secret, done };
  }

  test('sin métodos ni obligatoriedad el login pasa tal cual', () => {
    expect(build().afterLogin(sessionOf(user()))).toBeNull();
  });

  test('activar TOTP entrega los códigos de recuperación una sola vez', async () => {
    const mfa = build();
    const { done } = await enrollTotp(mfa);
    expect(done.status).toBe(200);
    expect((done.json as { recoveryCodes: string[] }).recoveryCodes).toHaveLength(10);
    // activar un segundo método ya no los repite
    await call(mfa, 'POST', '/email/setup', {}, { user: user() });
    const second = await call(mfa, 'POST', '/email/confirm', { code: lastCode() }, { user: user() });
    expect((second.json as Record<string, unknown>).recoveryCodes).toBeUndefined();
  });

  test('con un método activo el login devuelve un reto y NO la sesión; verificar la entrega', async () => {
    const mfa = build();
    const { secret } = await enrollTotp(mfa);
    const pending = mfa.afterLogin(sessionOf(user()))!;
    const j = pending.json as { mfaRequired: boolean; challengeId: string; methods: { method: string }[] };
    expect(j.mfaRequired).toBe(true);
    expect(pending.session).toBeUndefined();
    expect(JSON.stringify(pending.json)).not.toContain('tok'); // el token no sale en el reto
    expect(j.methods.map((m) => m.method)).toEqual(['totp', 'recovery']);

    clock += 31_000; // paso nuevo: el de la activación ya está gastado
    const ok = await call(mfa, 'POST', '/login/verify', {
      challengeId: j.challengeId,
      method: 'totp',
      code: totpAt(secret, clock),
    });
    expect(ok.status).toBe(200);
    expect(ok.session?.accessToken).toBe('tok'); // la sesión viaja aparte, para cookies
    expect(JSON.stringify(ok.json)).not.toContain('tok');
    // el reto es de un solo uso
    const again = await call(mfa, 'POST', '/login/verify', {
      challengeId: j.challengeId,
      method: 'totp',
      code: totpAt(secret, clock),
    });
    expect(again.status).toBe(401);
  });

  test('5 códigos erróneos bloquean el reto (429) y descartan la sesión', async () => {
    const mfa = build();
    const { secret } = await enrollTotp(mfa);
    const id = (mfa.afterLogin(sessionOf(user()))!.json as { challengeId: string }).challengeId;
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push(
        (await call(mfa, 'POST', '/login/verify', { challengeId: id, method: 'totp', code: '000000' })).status
      );
    }
    expect(statuses).toEqual([401, 401, 401, 401, 429]);
    clock += 31_000;
    const good = await call(mfa, 'POST', '/login/verify', {
      challengeId: id,
      method: 'totp',
      code: totpAt(secret, clock),
    });
    expect(good.status).toBe(429);
    expect(good.session).toBeUndefined();
  });

  test('10 erróneos por persona bloquean también los retos nuevos', async () => {
    const mfa = build();
    await enrollTotp(mfa);
    for (let i = 0; i < 2; i++) {
      const id = (mfa.afterLogin(sessionOf(user()))!.json as { challengeId: string }).challengeId;
      for (let k = 0; k < 5; k++)
        await call(mfa, 'POST', '/login/verify', { challengeId: id, method: 'totp', code: '000000' });
    }
    const blocked = mfa.afterLogin(sessionOf(user()))!;
    expect(blocked.status).toBe(429);
    expect(blocked.session).toBeUndefined();
    clock += 16 * 60_000; // pasa la ventana
    expect(mfa.afterLogin(sessionOf(user()))!.status).toBe(200);
  });

  test('código de recuperación: sirve una vez', async () => {
    const mfa = build();
    const { done } = await enrollTotp(mfa);
    const [code] = (done.json as { recoveryCodes: string[] }).recoveryCodes;
    const id1 = (mfa.afterLogin(sessionOf(user()))!.json as { challengeId: string }).challengeId;
    const ok = await call(mfa, 'POST', '/login/verify', {
      challengeId: id1,
      method: 'recovery',
      code: code.toLowerCase().replace('-', ' '),
    });
    expect(ok.status).toBe(200);
    expect((ok.json as { mfa: { recoveryCodesLeft: number } }).mfa.recoveryCodesLeft).toBe(9);
    const id2 = (mfa.afterLogin(sessionOf(user()))!.json as { challengeId: string }).challengeId;
    expect((await call(mfa, 'POST', '/login/verify', { challengeId: id2, method: 'recovery', code })).status).toBe(401);
  });

  test('envío de códigos por correo: 3 cada 10 minutos', async () => {
    const mfa = build();
    const a = { user: user() };
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await call(mfa, 'POST', '/email/setup', {}, a)).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});

describe('activación obligatoria', () => {
  function required() {
    const mfa = build();
    mfa.store.setPolicy({
      tenantId: 't1',
      methods: { email: false, sms: false, totp: true },
      required: 'all',
      roles: [],
    });
    return mfa;
  }

  test('sin método activo y con política obligatoria: reto de activación; sin métodos disponibles, 503', () => {
    const pending = required().afterLogin(sessionOf(user()))!;
    expect(pending.json).toMatchObject({ mfaEnrollRequired: true, methods: ['totp'] });
    const none = build();
    none.store.setPolicy({
      tenantId: 't1',
      methods: { email: false, sms: false, totp: false },
      required: 'all',
      roles: [],
    });
    expect(none.afterLogin(sessionOf(user()))!.status).toBe(503);
  });

  test('el reto de activación solo sirve para activar: política, bajas y reinicios dan 403; /login/complete exige un método', async () => {
    const mfa = required();
    const id = (mfa.afterLogin(sessionOf(user()))!.json as { challengeId: string }).challengeId;
    const h = { 'x-mfa-challenge': id };
    for (const [m, p] of [
      ['GET', '/policy'],
      ['PUT', '/policy'],
      ['GET', '/users'],
      ['POST', '/users/u2/reset'],
      ['DELETE', '/methods/totp'],
      ['POST', '/recovery-codes/regenerate'],
      ['POST', '/session/send'],
    ] as const) {
      expect((await call(mfa, m, p, {}, { user: null }, h)).status, `${m} ${p}`).toBe(403);
    }
    expect((await call(mfa, 'POST', '/login/complete', { challengeId: id })).status).toBe(409);

    const setup = await call(mfa, 'POST', '/totp/setup', {}, { user: null }, h);
    const { secret } = setup.json as { secret: string };
    expect((await call(mfa, 'POST', '/totp/confirm', { code: totpAt(secret, clock) }, { user: null }, h)).status).toBe(
      200
    );
    const done = await call(mfa, 'POST', '/login/complete', { challengeId: id });
    expect(done.status).toBe(200);
    expect(done.session?.accessToken).toBe('tok');
  });

  test('un reto de verificación no vale como reto de activación ni al revés', async () => {
    const mfa = build();
    const { secret } = await (async () => {
      const s = await call(mfa, 'POST', '/totp/setup', {}, { user: user() });
      const sec = (s.json as { secret: string }).secret;
      await call(mfa, 'POST', '/totp/confirm', { code: totpAt(sec, clock) }, { user: user() });
      return { secret: sec };
    })();
    void secret;
    const verifyId = (mfa.afterLogin(sessionOf(user()))!.json as { challengeId: string }).challengeId;
    expect((await call(mfa, 'POST', '/login/complete', { challengeId: verifyId })).status).toBe(401);
    expect((await call(mfa, 'POST', '/totp/setup', {}, { user: null }, { 'x-mfa-challenge': verifyId })).status).toBe(
      401
    );
  });

  test('no se quita el último método si la empresa lo exige', async () => {
    const mfa = required();
    const u = user();
    const s = await call(mfa, 'POST', '/totp/setup', {}, { user: u });
    await call(
      mfa,
      'POST',
      '/totp/confirm',
      { code: totpAt((s.json as { secret: string }).secret, clock) },
      { user: u }
    );
    const res = await call(mfa, 'DELETE', '/methods/totp', { via: 'recovery', code: 'x' }, { user: u });
    expect(res.status).toBe(409);
  });
});

describe('sin sesión y administración', () => {
  test('rutas con sesión sin sesión: 401', async () => {
    const mfa = build();
    for (const [m, p] of [
      ['GET', '/status'],
      ['POST', '/totp/setup'],
      ['PUT', '/policy'],
      ['DELETE', '/methods/email'],
    ] as const) {
      expect((await call(mfa, m, p)).status, `${m} ${p}`).toBe(401);
    }
  });

  test('política: solo administradores, su empresa; super_admin puede elegir otra; valida los datos', async () => {
    const mfa = build();
    const agent = { user: user({ role: 'agent' }) };
    const admin = { user: user() };
    expect((await call(mfa, 'GET', '/policy', undefined, agent)).status).toBe(403);
    expect((await call(mfa, 'PUT', '/policy', { methods: {}, required: 'none' }, agent)).status).toBe(403);

    const put = (body: unknown, auth = admin) => call(mfa, 'PUT', '/policy', body, auth);
    expect((await put({ methods: { totp: true }, required: 'all' })).status).toBe(200);
    expect((await put({ methods: { totp: true }, required: 'bogus' })).status).toBe(400);
    expect((await put({ methods: { totp: true }, required: 'roles', roles: [] })).status).toBe(400);
    expect((await put({ methods: { totp: true }, required: 'roles', roles: ['jefe'] })).status).toBe(400);
    expect((await put({ methods: {}, required: 'all' })).status).toBe(400); // exigir sin permitir nada

    // otra empresa: admin normal no, super_admin sí
    const other = new Request('http://app.test/m?tenantId=t2', { method: 'GET' });
    expect((await mfa.handle(other, '/policy', admin)).status).toBe(403);
    const sup = await mfa.handle(other, '/policy', { user: user({ role: 'super_admin' }) });
    expect(sup.status).toBe(200);
    expect((sup.json as { tenantId: string }).tenantId).toBe('t2');
  });

  test('restablecer: la persona debe existir y ser de la empresa (salvo super_admin); borra sus factores', async () => {
    vi.stubEnv('GATEWAY_URL', 'http://gw.internal:9');
    vi.stubEnv('GATEWAY_API_KEY', 'k');
    const people: Record<string, object> = {
      u2: { id: 'u2', tenantId: 't1' },
      u3: { id: 'u3', tenantId: 't2' },
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const found = people[String(url).split('/').pop()!];
      return found ? Response.json(found) : new Response('{}', { status: 404 });
    });
    const mfa = build();
    mfa.store.putFactor({ userId: 'u2', tenantId: 't1', type: 'email', destination: 'x', verified: true });
    const admin = { user: user(), accessToken: 'tok' };
    expect((await call(mfa, 'POST', '/users/u9/reset', {}, admin)).status).toBe(404);
    expect((await call(mfa, 'POST', '/users/u3/reset', {}, admin)).status).toBe(403);
    expect((await call(mfa, 'POST', '/users/u2/reset', {}, { user: user({ role: 'agent' }) })).status).toBe(403);
    expect((await call(mfa, 'POST', '/users/u2/reset', {}, admin)).status).toBe(200);
    expect(mfa.store.getFactors('u2')).toHaveLength(0);
    expect(
      (await call(mfa, 'POST', '/users/u3/reset', {}, { user: user({ role: 'super_admin' }), accessToken: 'tok' }))
        .status
    ).toBe(200);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test('errores internos no filtran detalles; JSON roto da 400', async () => {
    const boom = new Error('smtp://usuario:clave@host');
    const mfa = build({}, { mailer: { available: true, send: async () => Promise.reject(boom) } });
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await call(mfa, 'POST', '/email/setup', {}, { user: user() });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.json)).not.toContain('clave');
    expect(JSON.stringify(logged.mock.calls)).not.toContain('clave'); // ni al registro del servidor
    const bad = new Request('http://app.test/m', { method: 'POST', body: '{no es json' });
    expect((await mfa.handle(bad, '/login/send', { user: null })).status).toBe(400);
    vi.restoreAllMocks();
  });
});
