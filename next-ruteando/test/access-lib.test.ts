// @vitest-environment node
import { afterEach, describe, expect, test, vi } from 'vitest';

import { ApiError, failureMessage, postJson } from '@/lib/api-client';
import {
  listSsoProviders,
  login,
  logout,
  mfaComplete,
  mfaSend,
  mfaVerify,
  ssoComplete,
  ssoStartUrl,
  toLoginResult,
} from '@/lib/auth-client';
import { makeT } from '@/lib/i18n/core';
import { EN } from '@/lib/i18n/dictionaries/en';
import { PT } from '@/lib/i18n/dictionaries/pt';
import { cleanCode, MFA_HINT, MFA_ICON, MFA_LABEL } from '@/lib/mfa-labels';
import {
  meetsPolicy,
  missingRules,
  PASSWORD_POLICY_LENGTH,
  PASSWORD_REQUIREMENTS,
  PASSWORD_SYMBOLS,
} from '@/lib/password-policy';
import { SSO_ERRORS, ssoErrorKey } from '@/lib/sso-messages';
import { rememberSsoReturn, takeSsoReturn } from '@/lib/sso-return';

const t = makeT({}); // español: los textos fuente
const tEn = makeT(EN);

afterEach(() => vi.restoreAllMocks());

const reply = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('failureMessage', () => {
  test('lo que declara la operación manda: primero el código, luego el estado', () => {
    const own = { 401: 'Correo o contraseña incorrectos', INVALID_TOKEN: 'El enlace no es válido o ha caducado' };
    expect(failureMessage(401, undefined, undefined, t, own)).toBe('Correo o contraseña incorrectos');
    expect(failureMessage(401, 'INVALID_TOKEN', undefined, t, own)).toBe('El enlace no es válido o ha caducado');
  });

  test('traduce lo declarado al idioma activo', () => {
    expect(failureMessage(401, undefined, undefined, tEn, { 401: 'Correo o contraseña incorrectos' })).toBe(
      'Incorrect email or password'
    );
  });

  test('sin conexión y fallos del servicio, frases propias', () => {
    expect(failureMessage(0, undefined, undefined, t)).toBe('No hay conexión con el servidor');
    for (const status of [500, 502, 503, 504]) {
      expect(failureMessage(status, undefined, undefined, t)).toBe(
        'El servicio no está disponible, inténtalo más tarde'
      );
    }
  });

  test('el mensaje de un servicio propio (con su code) manda sobre el genérico del estado: un INVALID_CODE no es «sesión caducada»', () => {
    expect(failureMessage(401, 'INVALID_CODE', 'El código no es válido.', t)).toBe('El código no es válido.');
    expect(failureMessage(429, 'TOO_MANY_FAILURES', 'Demasiados códigos erróneos.', t)).toBe(
      'Demasiados códigos erróneos.'
    );
  });

  test('un fallo del servicio (5xx) nunca enseña el mensaje del servidor', () => {
    expect(failureMessage(500, 'MFA_ERROR', 'detalle interno', t)).toBe(
      'El servicio no está disponible, inténtalo más tarde'
    );
  });

  test('los estados habituales sin mensaje propio', () => {
    expect(failureMessage(401, undefined, undefined, t)).toBe('Tu sesión no es válida o ha caducado');
    expect(failureMessage(403, undefined, undefined, t)).toBe('No tienes permiso para realizar esta acción');
    expect(failureMessage(404, undefined, undefined, t)).toBe('No se encontró el recurso solicitado');
    expect(failureMessage(429, undefined, undefined, t)).toBe(
      'Demasiados intentos. Espera unos minutos e inténtalo de nuevo'
    );
    expect(failureMessage(418, undefined, undefined, t)).toBe('No se pudo completar la solicitud');
  });

  test('el mensaje en inglés del gateway (sin code propio) no se enseña', () => {
    expect(failureMessage(400, 'BAD_REQUEST', undefined, t)).toBe('No se pudo completar la solicitud');
  });
});

describe('postJson', () => {
  test('envía JSON y devuelve la respuesta', async () => {
    const spy = reply(200, { ok: true });
    expect(await postJson('/middleware/x', { a: 1 }, t, undefined, { 'x-extra': '1' })).toEqual({ ok: true });
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('/middleware/x');
    expect(init).toMatchObject({ method: 'POST', body: '{"a":1}' });
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
    expect(new Headers(init?.headers).get('x-extra')).toBe('1');
  });

  test('un fallo lanza ApiError con estado, código y el mensaje ya redactado', async () => {
    reply(401, { error: 'UNAUTHORIZED', message: 'Invalid credentials' });
    const err = await postJson('/x', {}, t, { 401: 'Correo o contraseña incorrectos' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 401, code: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' });
  });

  test('de un servicio propio llega su code y su mensaje', async () => {
    reply(401, { code: 'INVALID_CODE', message: 'El código no es válido.', attemptsLeft: 3 });
    expect(await postJson('/x', {}, t).catch((e) => e)).toMatchObject({
      status: 401,
      code: 'INVALID_CODE',
      message: 'El código no es válido.',
    });
  });

  test('sin red: ApiError de estado 0; respuesta que no es JSON: no revienta', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await postJson('/x', {}, t).catch((e) => e)).toMatchObject({
      status: 0,
      message: 'No hay conexión con el servidor',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>', { status: 502 }));
    expect(await postJson('/x', {}, t).catch((e) => e)).toMatchObject({
      status: 502,
      message: 'El servicio no está disponible, inténtalo más tarde',
    });
  });
});

describe('auth-client', () => {
  test('toLoginResult distingue sesión, reto y activación obligatoria', () => {
    expect(toLoginResult({ user: { id: 'u' } })).toEqual({ kind: 'session' });
    const challenge = { mfaRequired: true, challengeId: 'c', methods: [], expiresInSeconds: 300 };
    expect(toLoginResult(challenge)).toEqual({ kind: 'challenge', challenge });
    const enroll = { mfaEnrollRequired: true, challengeId: 'c', methods: ['totp'], expiresInSeconds: 300 };
    expect(toLoginResult(enroll)).toEqual({ kind: 'enroll', enroll });
    expect(toLoginResult(null)).toEqual({ kind: 'session' });
  });

  test('login: mensajes propios por estado (401, 423, 429, 400)', async () => {
    for (const [status, text] of [
      [401, 'Correo o contraseña incorrectos'],
      [423, 'La cuenta está bloqueada temporalmente. Inténtalo más tarde'],
      [429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo'],
      [400, 'Revisa los datos e inténtalo de nuevo'],
    ] as const) {
      reply(status, { error: 'X', message: 'english' });
      expect(await login('a@b.co', 'p', t).catch((e) => e)).toMatchObject({ message: text });
    }
  });

  test('login envía las credenciales al BFF y devuelve el resultado', async () => {
    const spy = reply(200, { mfaRequired: true, challengeId: 'c1', methods: [], expiresInSeconds: 300 });
    expect((await login('a@b.co', 'clave', t)).kind).toBe('challenge');
    expect(spy.mock.calls[0][0]).toBe('/middleware/auth/login');
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({ email: 'a@b.co', password: 'clave' });
  });

  test('mfaSend, mfaVerify, mfaComplete y ssoComplete llaman a su ruta del BFF', async () => {
    const spy = reply(200, { destination: 'a•••@b.co' });
    expect(await mfaSend('c1', 'email', t)).toBe('a•••@b.co');
    await mfaVerify('c1', 'totp', '123456', t);
    await mfaComplete('c1', t);
    expect((await ssoComplete('tk', t)).kind).toBe('session');
    expect(spy.mock.calls.map((c) => c[0])).toEqual([
      '/middleware/mfa/login/send',
      '/middleware/mfa/login/verify',
      '/middleware/mfa/login/complete',
      '/middleware/sso/complete',
    ]);
    expect(JSON.parse(String(spy.mock.calls[1][1]?.body))).toEqual({
      challengeId: 'c1',
      method: 'totp',
      code: '123456',
    });
  });

  test('ssoComplete traduce los errores del ticket', async () => {
    reply(401, { code: 'TICKET_EXPIRED', message: 'El inicio de sesión caducó. Inténtalo de nuevo.' });
    expect(await ssoComplete('tk', tEn).catch((e) => e)).toMatchObject({ message: 'The sign-in expired. Try again' });
  });

  test('listSsoProviders: la lista, o vacía si falla (el acceso con contraseña sigue igual)', async () => {
    reply(200, { providers: [{ id: 'google', label: 'Google' }] });
    expect(await listSsoProviders()).toEqual([{ id: 'google', label: 'Google' }]);
    reply(503, {});
    expect(await listSsoProviders()).toEqual([]);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('x'));
    expect(await listSsoProviders()).toEqual([]);
    reply(200, {});
    expect(await listSsoProviders()).toEqual([]);
  });

  test('ssoStartUrl escapa el correo', () => {
    expect(ssoStartUrl('google')).toBe('/gateway/sso/google/start');
    expect(ssoStartUrl('enterprise', 'a+b@x.co')).toBe('/gateway/sso/enterprise/start?email=a%2Bb%40x.co');
  });

  test('logout: true si el servidor responde bien, false si falla (la persona sale igual)', async () => {
    reply(200, { ok: true });
    expect(await logout()).toBe(true);
    reply(500, {});
    expect(await logout()).toBe(false);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('x'));
    expect(await logout()).toBe(false);
  });
});

describe('política de contraseña', () => {
  test('16 caracteres con mayúscula, minúscula, número y un símbolo del gateway', () => {
    expect(PASSWORD_POLICY_LENGTH).toBe(16);
    expect(meetsPolicy('Clave-segura-1234')).toBe(false); // el guion no es un símbolo del gateway
    expect(meetsPolicy('Clave-segura-123@')).toBe(true); // con un @ al final sí
    expect(meetsPolicy('ClaveSegura1234@!')).toBe(true);
  });

  test('missingRules dice exactamente qué falta', () => {
    expect([...missingRules('')].sort()).toEqual(['digit', 'length', 'lower', 'symbol', 'upper']);
    expect([...missingRules('abcdefghijklmnop')].sort()).toEqual(['digit', 'symbol', 'upper']);
    expect([...missingRules('ABCDEFGHIJKLMNOP1@')].sort()).toEqual(['lower']);
  });

  test('como el gateway: una É no cuenta como mayúscula y solo valen sus símbolos', () => {
    expect(missingRules('ÉÉÉÉÉÉÉÉÉÉÉÉÉÉÉÉ1a@').has('upper')).toBe(true);
    expect(missingRules('Aaaaaaaaaaaaaaaaa1#').has('symbol')).toBe(true);
    for (const symbol of PASSWORD_SYMBOLS) expect(missingRules(`Aaaaaaaaaaaaaaaa1${symbol}`).has('symbol')).toBe(false);
  });

  test('los requisitos de la lista tienen traducción en los dos idiomas', () => {
    for (const { label } of PASSWORD_REQUIREMENTS) {
      expect(EN[label], label).toBeTruthy();
      expect(PT[label], label).toBeTruthy();
    }
  });
});

describe('etiquetas de segundo factor', () => {
  test('cada método tiene nombre, icono y (los activables) frase, todos traducidos', () => {
    for (const method of ['email', 'sms', 'totp', 'recovery'] as const) {
      expect(EN[MFA_LABEL[method]], method).toBeTruthy();
      expect(PT[MFA_LABEL[method]], method).toBeTruthy();
      expect(MFA_ICON[method], method).toBeTruthy();
    }
    for (const method of ['email', 'sms', 'totp'] as const) {
      expect(EN[MFA_HINT[method]], method).toBeTruthy();
      expect(PT[MFA_HINT[method]], method).toBeTruthy();
    }
  });

  test('cleanCode quita espacios y guiones', () => {
    expect(cleanCode(' 123 456 ')).toBe('123456');
    expect(cleanCode('abcde-fghjk')).toBe('abcdefghjk');
    expect(cleanCode(null)).toBe('');
  });
});

describe('mensajes del SSO', () => {
  test('cada código tiene su mensaje, uno por defecto, y todos están traducidos', () => {
    const codes = [
      'DENIED',
      'NO_ACCOUNT',
      'ACCOUNT_DISABLED',
      'EMAIL_NOT_VERIFIED',
      'EMAIL_MISSING',
      'SSO_DISABLED',
      'WRONG_TENANT',
      'WRONG_DOMAIN',
      'ROLE_NOT_ALLOWED',
      'IDENTITY_MISMATCH',
      'NO_PROVIDER',
      'STATE_INVALID',
      'PROVIDER_UNAVAILABLE',
      'GATEWAY_ERROR',
      null,
      'INVENTADO',
    ];
    for (const code of codes) {
      const key = ssoErrorKey(code);
      expect(EN[key], String(code)).toBeTruthy();
      expect(PT[key], String(code)).toBeTruthy();
    }
    expect(ssoErrorKey('INVENTADO')).toBe(ssoErrorKey(null));
    expect(ssoErrorKey('EMAIL_MISSING')).toBe(ssoErrorKey('EMAIL_NOT_VERIFIED'));
    for (const key of Object.values(SSO_ERRORS)) expect(EN[key!], key).toBeTruthy();
  });
});

describe('destino tras el SSO', () => {
  const store = new Map<string, string>();
  const stub = () =>
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });

  test('se guarda, se valida con safeReturnUrl al leerlo y se olvida', () => {
    stub();
    rememberSsoReturn('/journeys/3');
    expect(takeSsoReturn()).toBe('/journeys/3');
    expect(takeSsoReturn()).toBe('/'); // ya se olvidó
    rememberSsoReturn('//evil.test');
    expect(takeSsoReturn()).toBe('/'); // un destino hostil nunca pasa
    rememberSsoReturn('/a');
    rememberSsoReturn(null);
    expect(takeSsoReturn()).toBe('/');
    vi.unstubAllGlobals();
  });

  test('sin almacenamiento (ventana privada) no revienta: se vuelve al inicio', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    });
    expect(() => rememberSsoReturn('/x')).not.toThrow();
    expect(takeSsoReturn()).toBe('/');
    vi.unstubAllGlobals();
  });
});
