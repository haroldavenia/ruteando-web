// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ensureAccess } from '@/lib/auth-flow';
import { ACCESS, clearSession, type GatewaySession, readSession, REFRESH, USER, writeSession } from '@/lib/session';
import { packUser, unpackUser } from '@/lib/session-token';

import { clearJar, history, jar, names, options } from './cookie-jar';

vi.mock('next/headers', async () => ({ cookies: async () => (await import('./cookie-jar')).jar }));

const user = {
  id: 'u1',
  email: 'ada@example.invalid',
  role: 'agent' as const,
  tenantId: 't1',
  firstName: 'Ada',
  lastName: 'A',
};
const session = (over: Partial<GatewaySession> = {}): GatewaySession => ({
  accessToken: 'acc-1',
  refreshToken: 'ref-1',
  expiresIn: 3600,
  user: { ...user, phone: '+573001234567', createdAt: '2026-01-01', emailVerified: true } as GatewaySession['user'],
  ...over,
});

let calls: { url: string; body: unknown; auth: string | null }[] = [];
let reply: () => Response = () => Response.json(session({ accessToken: 'acc-2' }));

beforeEach(() => {
  clearJar();
  calls = [];
  reply = () => Response.json(session({ accessToken: 'acc-2' }));
  vi.stubEnv('GATEWAY_URL', 'http://gw.internal:9');
  vi.stubEnv('GATEWAY_API_KEY', 'k');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    calls.push({
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) : null,
      auth: new Headers(init?.headers).get('authorization'),
    });
    return reply();
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('cookies de sesión', () => {
  test('writeSession: tres cookies httpOnly, SameSite=Lax y caducidades distintas', async () => {
    vi.stubEnv('COOKIE_SECURE', 'true');
    await writeSession(session());
    expect(names()).toEqual([ACCESS, REFRESH, USER].sort());
    for (const name of [ACCESS, REFRESH, USER]) {
      expect(options(name)).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
    }
    expect(options(ACCESS)?.maxAge).toBe(3600); // dura lo que el token
    expect(options(REFRESH)?.maxAge).toBe(60 * 60 * 24 * 7);
  });

  test('Secure sigue a COOKIE_SECURE (apagado para http en local)', async () => {
    vi.stubEnv('COOKIE_SECURE', 'false');
    await writeSession(session());
    expect(options(ACCESS)?.secure).toBe(false);
  });

  test('rt_user lleva solo lo necesario: sin teléfono ni fechas, y firmada', async () => {
    await writeSession(session());
    const packed = jar.get(USER)!.value;
    expect(unpackUser(packed)).toEqual(user);
    const body = Buffer.from(packed.split('.')[0], 'base64url').toString();
    expect(body).not.toContain('phone');
    expect(body).not.toContain('createdAt');
  });

  test('readSession devuelve los tokens y el usuario firmado; una cookie alterada da usuario nulo', async () => {
    await writeSession(session());
    expect(await readSession()).toMatchObject({ accessToken: 'acc-1', refreshToken: 'ref-1', user });
    jar.set(USER, packUser({ ...user, role: 'super_admin' }).replace(/.$/, 'x'));
    expect((await readSession()).user).toBeNull();
  });

  test('clearSession borra las tres', async () => {
    await writeSession(session());
    await clearSession();
    expect(names()).toEqual([]);
    expect(
      history
        .filter((h) => h.options.maxAge === 0)
        .map((h) => h.name)
        .sort()
    ).toEqual([ACCESS, REFRESH, USER].sort());
  });
});

describe('ensureAccess', () => {
  test('con la sesión vigente no llama al gateway', async () => {
    await writeSession(session());
    expect(await ensureAccess()).toMatchObject({ accessToken: 'acc-1', user });
    expect(calls).toHaveLength(0);
  });

  test('sin ninguna cookie, nada', async () => {
    expect(await ensureAccess()).toBeNull();
    expect(calls).toHaveLength(0);
  });

  test('con el access token caducado (la cookie ya no existe) renueva y reescribe las cookies', async () => {
    await writeSession(session());
    jar.delete(ACCESS);
    const out = await ensureAccess();
    expect(out?.accessToken).toBe('acc-2');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('http://gw.internal:9/api/v1/auth/refresh');
    expect(calls[0].body).toEqual({ refreshToken: 'ref-1' });
    expect(jar.get(ACCESS)?.value).toBe('acc-2');
  });

  test('si el gateway no rota el refresh token, se conserva el actual', async () => {
    await writeSession(session());
    jar.delete(ACCESS);
    reply = () => Response.json({ ...session({ accessToken: 'acc-2' }), refreshToken: '' });
    await ensureAccess();
    expect(jar.get(REFRESH)?.value).toBe('ref-1');
  });

  test('force ignora el access token vigente (tras un 401 del gateway)', async () => {
    await writeSession(session());
    expect((await ensureAccess(true))?.accessToken).toBe('acc-2');
    expect(calls).toHaveLength(1);
  });

  test('si el refresh falla (revocado o vencido) limpia la sesión', async () => {
    await writeSession(session());
    jar.delete(ACCESS);
    reply = () => new Response('{}', { status: 401 });
    expect(await ensureAccess()).toBeNull();
    expect(names()).toEqual([]);
  });

  test('varias peticiones a la vez comparten UNA llamada de renovación', async () => {
    await writeSession(session());
    jar.delete(ACCESS);
    reply = () => Response.json(session({ accessToken: 'acc-2' }));
    const all = await Promise.all([1, 2, 3, 4].map(() => ensureAccess()));
    expect(all.every((r) => r?.accessToken === 'acc-2')).toBe(true);
    expect(calls).toHaveLength(1);
  });

  test('con el gateway caído la excepción sube (el handler responde 502) y la sesión NO se borra', async () => {
    await writeSession(session());
    jar.delete(ACCESS);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(ensureAccess()).rejects.toMatchObject({ status: 502 });
    expect(jar.get(REFRESH)?.value).toBe('ref-1');
  });
});
