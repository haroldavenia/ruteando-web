// @vitest-environment node
import { afterEach, describe, expect, test, vi } from 'vitest';

import { GET as health } from '@/app/healthCheck/route';
import { register } from '@/instrumentation';
import { createCrypto } from '@/lib/mfa/crypto';
import { createSms, isValidPhone, maskPhone } from '@/lib/mfa/sms';
import { createGithubClient } from '@/lib/sso/github';
import { SsoError } from '@/lib/sso/http';
import { isPrivateAddress, safeFetch } from '@/lib/sso/safe-fetch';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const codec = createCrypto(Buffer.alloc(32, 7));
const res = (body: unknown, status = 200) => ({ status, text: async () => JSON.stringify(body) });

describe('healthCheck', () => {
  test('responde 200 con el estado', async () => {
    const r = await health();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: 'ok' });
  });
});

describe('arranque', () => {
  test('en producción sin SESSION_SECRET el proceso sale con código 1', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    register();
    expect(exit).toHaveBeenCalledWith(1);
  });

  test('con la configuración correcta no hace nada', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    expect(() => register()).not.toThrow();
    expect(exit).not.toHaveBeenCalled();
  });

  test('fuera de Node lanza en vez de salir', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    expect(() => register()).toThrow(/SESSION_SECRET/);
  });
});

describe('SMS', () => {
  test('teléfono en formato internacional y enmascarado', () => {
    expect(isValidPhone('+573001234567')).toBe(true);
    for (const bad of ['3001234567', '+0123456789', '+57 300', 'abc', '', undefined])
      expect(isValidPhone(bad)).toBe(false);
    expect(maskPhone('+573001234567')).toBe('+57•••••4567');
    expect(maskPhone('123')).toBe('•••••');
    expect(maskPhone(undefined)).toBe('•••••');
  });

  const mailer = (available = true) => ({ available, send: vi.fn(async () => undefined) });

  test.each([
    ['sin proveedor', {}, null],
    ['proveedor desconocido', { SMS_PROVIDER: 'otro' }, null],
    ['twilio sin credenciales', { SMS_PROVIDER: 'twilio' }, 'twilio'],
    ['dev sin SMTP', { SMS_PROVIDER: 'dev' }, 'dev'],
  ])('%s: no disponible', (_n, env, provider) => {
    const sms = createSms({ env, mailer: mailer(false), codec });
    expect(sms.available).toBe(false);
    expect(sms.provider).toBe(provider);
    expect(sms.sendCode).toBeUndefined();
  });

  test('twilio: envía y comprueba con la API REST de Verify, sin propagar el cuerpo de error', async () => {
    const calls: { url: string; body: string; auth: string }[] = [];
    let reply: { ok: boolean; status: number; json: () => Promise<unknown> } = {
      ok: true,
      status: 200,
      json: async () => ({ status: 'approved' }),
    };
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: String(init?.body), auth: (init?.headers as Record<string, string>).Authorization });
      return reply;
    }) as unknown as typeof fetch;
    const sms = createSms({
      env: {
        SMS_PROVIDER: 'twilio',
        TWILIO_ACCOUNT_SID: 'AC1',
        TWILIO_AUTH_TOKEN: 'tok',
        TWILIO_VERIFY_SERVICE_SID: 'VA1',
      },
      mailer: mailer(),
      codec,
      fetchImpl,
    });
    expect(sms.available).toBe(true);
    await sms.sendCode!('+573001234567');
    expect(calls[0].url).toBe('https://verify.twilio.com/v2/Services/VA1/Verifications');
    expect(calls[0].body).toContain('Channel=sms');
    expect(calls[0].auth).toBe(`Basic ${Buffer.from('AC1:tok').toString('base64')}`);

    expect(await sms.checkCode!('+573001234567', ' 123 456 ')).toBe(true);
    expect(calls[1].body).toContain('Code=123456'); // espacios fuera
    reply = { ok: true, status: 200, json: async () => ({ status: 'pending' }) };
    expect(await sms.checkCode!('+573001234567', '000000')).toBe(false);
    reply = { ok: false, status: 404, json: async () => ({}) };
    expect(await sms.checkCode!('+573001234567', '000000')).toBe(false); // 404 = código caducado: no es un fallo del servicio
    reply = { ok: false, status: 500, json: async () => ({ message: 'cuenta AC1 y número +573001234567' }) };
    await expect(sms.sendCode!('+573001234567')).rejects.toThrow(/^Twilio respondió 500$/); // sin el cuerpo del proveedor
  });

  test('dev: el SMS llega como correo y el código se comprueba en memoria', async () => {
    const m = mailer();
    const sms = createSms({ env: { SMS_PROVIDER: 'dev' }, mailer: m, codec });
    expect(sms.available).toBe(true);
    await sms.sendCode!('+573001234567');
    const sent = (m.send.mock.calls[0] as unknown as [{ to: string; text: string }])[0];
    expect(sent.to).toBe('sms+573001234567@sms.ruteando.local');
    const code = /(\d{6})/.exec(sent.text)![1];
    expect(await sms.checkCode!('+573001234567', '999999')).toBe(false);
    expect(await sms.checkCode!('+573001234567', code)).toBe(true);
    expect(await sms.checkCode!('+573001234567', code)).toBe(false); // de un solo uso
  });
});

describe('GitHub', () => {
  const client = (fetchImpl: Parameters<typeof createGithubClient>[0]['fetchImpl']) =>
    createGithubClient({ clientId: 'cid', clientSecret: 'sec', fetchImpl });
  const complete = (c: ReturnType<typeof client>) =>
    c.complete({ code: 'c', redirectUri: 'https://app/cb', codeVerifier: 'v', nonce: 'n' });

  test('la dirección de autorización lleva PKCE, state y los permisos mínimos', async () => {
    const url = new URL(
      await client(vi.fn()).authorizationUrl({
        redirectUri: 'https://app/cb',
        state: 's',
        nonce: 'n',
        codeChallenge: 'ch',
      })
    );
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'cid',
      redirect_uri: 'https://app/cb',
      state: 's',
      scope: 'read:user user:email',
      code_challenge: 'ch',
      code_challenge_method: 'S256',
    });
    expect(client(vi.fn()).usesFormPost).toBe(false);
  });

  test('usa el correo principal Y verificado, y el id numérico como sujeto', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/access_token')) return res({ access_token: 'gho_x' });
      if (url.endsWith('/user')) return res({ id: 4242, name: 'Ada', login: 'ada' });
      return res([
        { email: 'otro@x.co', primary: false, verified: true },
        { email: 'Ada@Example.Com', primary: true, verified: true },
      ]);
    });
    expect(await complete(client(fetchImpl))).toEqual({
      subject: '4242',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada',
    });
  });

  test('un correo principal sin verificar no cuenta: sin correo y sin verificar', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/access_token')) return res({ access_token: 'gho_x' });
      if (url.endsWith('/user')) return res({ id: 1 });
      return res([{ email: 'a@x.co', primary: true, verified: false }]);
    });
    expect(await complete(client(fetchImpl))).toMatchObject({ email: '', emailVerified: false });
  });

  test.each([
    ['GitHub rechaza el código (200 con error en el cuerpo)', async () => res({ error: 'bad_verification_code' })],
    ['el token no es una cadena', async () => res({ access_token: 5 })],
    ['estado de error', async () => res({}, 500)],
  ])('%s: PROVIDER_ERROR', async (_n, tokenReply) => {
    await expect(complete(client(vi.fn(tokenReply)))).rejects.toMatchObject({ code: 'PROVIDER_ERROR' });
  });

  test('perfil o correos incompletos: PROVIDER_ERROR', async () => {
    const withProfile = (user: unknown, emails: unknown, emailsStatus = 200) =>
      vi.fn(async (url: string) =>
        url.endsWith('/access_token')
          ? res({ access_token: 't' })
          : url.endsWith('/user')
            ? res(user)
            : res(emails, emailsStatus)
      );
    await expect(complete(client(withProfile({}, [])))).rejects.toBeInstanceOf(SsoError); // sin id
    await expect(complete(client(withProfile({ id: 1 }, [], 403)))).rejects.toMatchObject({ code: 'PROVIDER_ERROR' });
    await expect(complete(client(withProfile({ id: 1 }, { no: 'lista' })))).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
    });
  });
});

describe('safeFetch (SSRF)', () => {
  test('rechaza lo que no es https y las URL mal formadas', async () => {
    await expect(safeFetch('http://example.com/')).rejects.toThrow('Solo https');
    await expect(safeFetch('no es una url')).rejects.toThrow();
  });

  test.each([
    'https://127.0.0.1:9/',
    'https://[::1]:9/',
    'https://10.0.0.1:9/',
    'https://169.254.169.254/latest/meta-data',
    'https://[::ffff:127.0.0.1]/',
    'https://[fe80::1]/',
  ])('IP literal privada o reservada: se rechaza SIN intentar conectar (%s)', async (url) => {
    await expect(safeFetch(url)).rejects.toThrow('Dirección no permitida');
  });

  test('un nombre que resuelve a una dirección local se rechaza en la conexión (DNS)', async () => {
    await expect(safeFetch('https://localhost:9/')).rejects.toThrow('Dirección no permitida');
  });

  test('clasifica las direcciones privadas, locales y reservadas', () => {
    for (const ip of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '192.168.0.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '::1',
      '::ffff:7f00:1',
      'fe80::1',
      'fc00::1',
      '2002:7f00:1::',
      '2001:db8::1',
      'basura',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) expect(isPrivateAddress(ip), ip).toBe(false);
  });
});
