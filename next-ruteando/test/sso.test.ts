// @vitest-environment node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { signEs256, verifyJwt } from '@/lib/sso/jwt';
import { isPrivateAddress } from '@/lib/sso/safe-fetch';
import { createSso, SSO_COOKIE, type SsoOverrides } from '@/lib/sso/service';
import { openSsoStore } from '@/lib/sso/store';
import type { GatewaySession, SessionUser } from '@/lib/session';

const KEY = Buffer.alloc(32, 7).toString('base64');
const ISS = 'https://idp.test';
const REDIRECT = 'https://app.test/gateway/sso/google/callback';

// ---------- proveedor OIDC falso con par RSA real ----------
const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...rsa.publicKey.export({ format: 'jwk' }), kid: 'k1', use: 'sig', alg: 'RS256' };
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
function mint(claims: object, header: object = { alg: 'RS256', kid: 'k1' }, key: crypto.KeyObject = rsa.privateKey) {
  const signed = `${b64(header)}.${b64(claims)}`;
  return `${signed}.${crypto.sign('sha256', Buffer.from(signed), key).toString('base64url')}`;
}

let nextClaims: Record<string, unknown> = {};
let txt: Record<string, string[][]> = {}; // registros TXT que «publica» cada dominio
let tokenStatus = 200;
const calls: string[] = [];
const fakeFetch: NonNullable<SsoOverrides['fetchImpl']> = async (url, init) => {
  calls.push(`${init?.method || 'GET'} ${url}`);
  const json = (body: unknown, status = 200) => ({ status, text: async () => JSON.stringify(body) });
  if (url.endsWith('/.well-known/openid-configuration')) {
    return json({ issuer: ISS, authorization_endpoint: `${ISS}/auth`, token_endpoint: `${ISS}/token`, jwks_uri: `${ISS}/jwks` });
  }
  if (url === `${ISS}/jwks`) return json({ keys: [jwk] });
  if (url === `${ISS}/token`) {
    return tokenStatus === 200 ? json({ id_token: mint(nextClaims) }) : json({ error: 'invalid_grant' }, tokenStatus);
  }
  return json({}, 404);
};

const user = (over: Partial<SessionUser> = {}): SessionUser => ({
  id: 'u1',
  email: 'ada@example.invalid',
  role: 'tenant_admin',
  tenantId: 't1',
  ...over,
});
const sessionOf = (u: SessionUser): GatewaySession => ({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600, user: u });

let clock = 1_700_000_000_000;
let exchangeStatus = 200;
let exchangeUser: SessionUser = user();
let exchanged: Record<string, unknown>[] = [];

function build(env: Record<string, string | undefined> = {}, over: SsoOverrides = {}) {
  const sso = createSso(
    {
      SSO_ENABLED_PROVIDERS: 'google,enterprise',
      SSO_REDIRECT_BASE_URL: 'https://app.test',
      MFA_SECRET_KEY: KEY,
      SSO_ALLOW_INSECURE: 'true',
      SSO_GOOGLE_ISSUER: ISS,
      SSO_GOOGLE_CLIENT_ID: 'cid',
      SSO_GOOGLE_CLIENT_SECRET: 'csecret',
      ...env,
    },
    {
      now: () => clock,
      fetchImpl: fakeFetch,
      resolveTxt: async (host) => txt[host] ?? [],
      store: openSsoStore(':memory:'),
      gateway: async (_path, init) => {
        exchanged.push(JSON.parse(String(init?.body)));
        return exchangeStatus === 200 ? Response.json(sessionOf(exchangeUser)) : new Response('{}', { status: exchangeStatus });
      },
      ...over,
    }
  );
  if (!sso.enabled) throw new Error('SSO apagado: ' + sso.reason);
  return sso;
}

const queryOf = (location: string) => Object.fromEntries(new URL(location).searchParams);
const hashOf = (location: string) => Object.fromEntries(new URLSearchParams(location.split('#')[1]));
const binding = (cookie?: string) => /ruteando_sso=([^;]+)/.exec(cookie || '')?.[1] || '';

/** Hace el viaje de ida a Google y devuelve lo que el proveedor recibió. */
async function begin(sso: ReturnType<typeof build>, provider = 'google', email?: string) {
  const r = await sso.start(provider, email);
  const q = queryOf(r.location);
  return { ...r, q, cookie: binding(r.cookie) };
}
const claimsFor = (q: Record<string, string>, over: Record<string, unknown> = {}) => ({
  iss: ISS,
  aud: 'cid',
  sub: 'sub-1',
  email: 'ada@example.invalid',
  email_verified: true,
  exp: Math.floor(clock / 1000) + 600,
  nonce: q.nonce,
  ...over,
});

beforeEach(() => {
  clock = 1_700_000_000_000;
  exchangeStatus = 200;
  exchangeUser = user();
  exchanged = [];
  txt = {};
  tokenStatus = 200;
  calls.length = 0;
});

describe('primitivas', () => {
  test('JWT: acepta RS256 y rechaza none, HS256, firma ajena y clave desconocida', () => {
    const claims = { sub: 'x' };
    const jwks = { keys: [jwk] };
    expect(verifyJwt(mint(claims), jwks).payload.sub).toBe('x');
    expect(() => verifyJwt(`${b64({ alg: 'none' })}.${b64(claims)}.`, jwks)).toThrow();
    expect(() => verifyJwt(mint(claims, { alg: 'HS256', kid: 'k1' }), jwks)).toThrow(); // confusión de algoritmo
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    expect(() => verifyJwt(mint(claims, { alg: 'RS256', kid: 'k1' }, other.privateKey), jwks)).toThrow(); // otra firma
    expect(() => verifyJwt(mint(claims, { alg: 'RS256', kid: 'otra' }), jwks)).toThrow(); // kid desconocido
    expect(() => verifyJwt('basura', jwks)).toThrow();
  });

  test('secreto de Apple: ES256 verificable con la clave pública', () => {
    const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const pem = ec.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    const token = signEs256({ kid: 'K' }, { iss: 'team' }, pem);
    const ecJwk = { ...ec.publicKey.export({ format: 'jwk' }), kid: 'K' };
    expect(verifyJwt(token, { keys: [ecJwk] }).payload.iss).toBe('team');
  });

  test('SSRF: direcciones privadas, locales y reservadas se rechazan; las públicas pasan', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', '::ffff:127.0.0.1', '::ffff:7f00:1', 'fe80::1', 'fc00::1', '64:ff9b::7f00:1', '2002:7f00:1::', '2001:db8::1', 'no-es-ip']) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) expect(isPrivateAddress(ip), ip).toBe(false);
  });
});

describe('apagado', () => {
  test.each([
    ['sin proveedores', { SSO_ENABLED_PROVIDERS: '' }],
    ['sin URL de redirección', { SSO_REDIRECT_BASE_URL: '' }],
    ['sin clave maestra', { MFA_SECRET_KEY: '' }],
  ])('%s: lista vacía y todo falla cerrado', async (_n, env) => {
    const sso = createSso({ SSO_ENABLED_PROVIDERS: 'google', SSO_REDIRECT_BASE_URL: 'https://app.test', MFA_SECRET_KEY: KEY, ...env });
    expect(sso.enabled).toBe(false);
    expect(sso.listProviders().providers).toEqual([]);
    expect((await sso.start('google', undefined)).location).toContain('error=NO_PROVIDER');
    expect(sso.complete('t').status).toBe(503);
  });

  test('solo se ofrecen los proveedores con credenciales', () => {
    const sso = build({ SSO_ENABLED_PROVIDERS: 'google,github,apple', SSO_GITHUB_CLIENT_ID: '', SSO_APPLE_CLIENT_ID: 'x' });
    expect(sso.providers).toEqual(['google']);
    expect(sso.listProviders().providers).toEqual([{ id: 'google', label: 'Google' }]);
  });
});

describe('flujo de Google', () => {
  test('start: PKCE S256, state, nonce y cookie ligada al navegador', async () => {
    const r = await begin(build());
    expect(r.location.startsWith(`${ISS}/auth`)).toBe(true);
    expect(r.q).toMatchObject({ response_type: 'code', client_id: 'cid', redirect_uri: REDIRECT, code_challenge_method: 'S256' });
    expect(r.q.state).toBeTruthy();
    expect(r.q.nonce).toBeTruthy();
    expect(r.q.code_challenge).toBeTruthy();
    expect(r.cookie.length).toBeGreaterThan(20);
    const raw = (await build().start('google', undefined)).cookie!;
    expect(raw).toMatch(/HttpOnly/);
    expect(raw).toMatch(/Path=\/gateway\/sso/);
    expect(raw).toMatch(/SameSite=Lax/);
    expect(raw).toMatch(/Secure/); // la URL base es https
  });

  test('ida y vuelta: canjea el código, pide la sesión al gateway y entrega un ticket de un solo uso', async () => {
    const sso = build();
    const { q, cookie } = await begin(sso);
    nextClaims = claimsFor(q);
    const back = await sso.callback('google', { state: q.state, code: 'abc' }, cookie);
    const ticket = hashOf(back.location).ticket;
    expect(ticket).toBeTruthy();
    expect(back.cookie).toContain('Max-Age=0'); // la cookie ligada se borra
    expect(exchanged).toEqual([{ provider: 'google', subject: 'sub-1', email: 'ada@example.invalid', emailVerified: true }]);
    expect(sso.store.getIdentity('google', 'sub-1')?.userId).toBe('u1');

    const done = sso.complete(ticket);
    expect(done.status).toBe(200);
    expect(done.session?.accessToken).toBe('tok'); // la sesión va aparte, para cookies
    expect(JSON.stringify(done.json)).not.toContain('tok');
    expect(sso.complete(ticket).status).toBe(401); // un solo uso
  });

  test('el ticket caduca a los 5 minutos', async () => {
    const sso = build();
    const { q, cookie } = await begin(sso);
    nextClaims = claimsFor(q);
    const ticket = hashOf((await sso.callback('google', { state: q.state, code: 'c' }, cookie)).location).ticket;
    clock += 5 * 60_000 + 1;
    expect(sso.complete(ticket).status).toBe(401);
  });

  test('con el segundo factor activo el ticket da el reto, no la sesión: el SSO no lo sustituye', async () => {
    const pending = { status: 200, json: { mfaRequired: true, challengeId: 'c1' } };
    const afterLogin = vi.fn(() => pending);
    const sso = build({}, { mfa: { enabled: true, afterLogin } });
    const { q, cookie } = await begin(sso);
    nextClaims = claimsFor(q);
    const ticket = hashOf((await sso.callback('google', { state: q.state, code: 'c' }, cookie)).location).ticket;
    const done = sso.complete(ticket);
    expect(done.json).toEqual(pending.json);
    expect(done.session).toBeUndefined();
    expect(afterLogin).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'tok' }));
  });

  describe('rechazos', () => {
    const errorOf = (r: { location: string }) => hashOf(r.location).error;

    test('state desconocido, repetido o cookie ajena: STATE_INVALID', async () => {
      const sso = build();
      expect(errorOf(await sso.callback('google', { state: 'nope', code: 'c' }, 'x'))).toBe('STATE_INVALID');
      const a = await begin(sso);
      expect(errorOf(await sso.callback('google', { state: a.q.state, code: 'c' }, 'cookie-de-otro'))).toBe('STATE_INVALID');
      // el state se gasta aunque falle: no se puede reintentar con la cookie buena
      nextClaims = claimsFor(a.q);
      expect(errorOf(await sso.callback('google', { state: a.q.state, code: 'c' }, a.cookie))).toBe('STATE_INVALID');
      const b = await begin(sso);
      nextClaims = claimsFor(b.q);
      expect(hashOf((await sso.callback('google', { state: b.q.state, code: 'c' }, b.cookie)).location).ticket).toBeTruthy();
      expect(errorOf(await sso.callback('google', { state: b.q.state, code: 'c' }, b.cookie))).toBe('STATE_INVALID');
    });

    test('un flujo de un proveedor no se canjea en la dirección de otro', async () => {
      const sso = build();
      const { q, cookie } = await begin(sso);
      nextClaims = claimsFor(q);
      expect(errorOf(await sso.callback('github', { state: q.state, code: 'c' }, cookie))).toBe('STATE_INVALID');
    });

    test.each([
      ['correo sin verificar', { email_verified: false }, 'EMAIL_NOT_VERIFIED'],
      ['sin dato de verificación', { email_verified: undefined }, 'EMAIL_NOT_VERIFIED'],
      ['sin correo', { email: undefined }, 'EMAIL_MISSING'],
      ['nonce de otro flujo', { nonce: 'otro' }, 'INVALID_TOKEN'],
      ['audiencia ajena', { aud: 'otro-cliente' }, 'INVALID_TOKEN'],
      ['emisor ajeno', { iss: 'https://evil.test' }, 'INVALID_TOKEN'],
      ['token caducado', { exp: 1 }, 'INVALID_TOKEN'],
      ['sin sub', { sub: '' }, 'INVALID_TOKEN'],
    ])('%s', async (_n, over, code) => {
      const sso = build();
      const { q, cookie } = await begin(sso);
      nextClaims = claimsFor(q, over);
      expect(errorOf(await sso.callback('google', { state: q.state, code: 'c' }, cookie))).toBe(code);
      expect(exchanged).toHaveLength(0); // nunca se llega al gateway
    });

    test('el proveedor rechaza el código, o el usuario cancela', async () => {
      const sso = build();
      const a = await begin(sso);
      tokenStatus = 400;
      expect(errorOf(await sso.callback('google', { state: a.q.state, code: 'c' }, a.cookie))).toBe('PROVIDER_ERROR');
      const b = await begin(sso);
      expect(errorOf(await sso.callback('google', { state: b.q.state, error: 'access_denied' }, b.cookie))).toBe('DENIED');
      const c = await begin(sso);
      expect(errorOf(await sso.callback('google', { state: c.q.state }, c.cookie))).toBe('PROVIDER_ERROR');
    });

    test('el gateway: sin cuenta (404), cuenta desactivada (403) o caído', async () => {
      const sso = build();
      for (const [status, code] of [[404, 'NO_ACCOUNT'], [403, 'ACCOUNT_DISABLED'], [500, 'GATEWAY_ERROR']] as const) {
        exchangeStatus = status;
        const { q, cookie } = await begin(sso);
        nextClaims = claimsFor(q);
        expect(errorOf(await sso.callback('google', { state: q.state, code: 'c' }, cookie))).toBe(code);
      }
    });

    test('identidad ya enlazada a otra persona: IDENTITY_MISMATCH y no se reasigna', async () => {
      const sso = build();
      sso.store.putIdentity({ provider: 'google', subject: 'sub-1', userId: 'otra-persona', tenantId: 't1', email: 'x@x.co' });
      const { q, cookie } = await begin(sso);
      nextClaims = claimsFor(q);
      expect(errorOf(await sso.callback('google', { state: q.state, code: 'c' }, cookie))).toBe('IDENTITY_MISMATCH');
      expect(sso.store.getIdentity('google', 'sub-1')?.userId).toBe('otra-persona');
    });

    test('el SSO apagado por la empresa: SSO_DISABLED', async () => {
      const sso = build();
      sso.store.setPolicy({ tenantId: 't1', enabled: false });
      const { q, cookie } = await begin(sso);
      nextClaims = claimsFor(q);
      expect(errorOf(await sso.callback('google', { state: q.state, code: 'c' }, cookie))).toBe('SSO_DISABLED');
    });
  });
});

describe('proveedor de empresa', () => {
  const admin = { user: user(), accessToken: 'tok' };
  const put = (sso: ReturnType<typeof build>, body: object, auth = admin, tenant = '') =>
    sso.manage(new Request(`http://app.test/m${tenant}`, { method: 'PUT', body: JSON.stringify(body) }), '/enterprise', auth);
  const config = { name: 'Acme', issuer: ISS, clientId: 'cid', clientSecret: 's3cr3t', domains: ['acme.test'] };
  type DomainView = { domain: string; verified: boolean; txtHost: string; txtValue: string };
  const view = async (sso: ReturnType<typeof build>, auth = admin) =>
    ((await sso.manage(new Request('http://app.test/m'), '/enterprise', auth)).json as { domains: DomainView[] }).domains;
  const verifyReq = (sso: ReturnType<typeof build>, domain: string, auth = admin) =>
    sso.manage(new Request('http://app.test/m', { method: 'POST', body: JSON.stringify({ domain }) }), '/enterprise/verify', auth);
  /** Hace lo que haría el administrador: publica el TXT que pide la vista y pulsa «Verificar». */
  async function verify(sso: ReturnType<typeof build>, domain = 'acme.test', auth = admin) {
    const d = (await view(sso, auth)).find((x) => x.domain === domain)!;
    txt[d.txtHost] = [[d.txtValue]];
    return verifyReq(sso, domain, auth);
  }

  test('alta: valida, cifra el secreto y nunca lo devuelve', async () => {
    const sso = build();
    const res = await put(sso, config);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({
      configured: true,
      hasSecret: true,
      domains: [{ domain: 'acme.test', verified: false, txtHost: '_ruteando-verify.acme.test' }],
    });
    expect(JSON.stringify(res.json)).not.toContain('s3cr3t');
    expect(sso.store.getEnterprise('t1')?.secretEnc).not.toContain('s3cr3t'); // cifrado en el almacén
    // editar sin secreto conserva el anterior
    expect((await put(sso, { ...config, clientSecret: '' })).status).toBe(200);
    expect(sso.store.getEnterprise('t1')?.secretEnc).toBeTruthy();
  });

  test.each([
    ['sin nombre', { name: '' }],
    ['emisor http', { issuer: 'http://idp.test' }],
    ['emisor IP literal', { issuer: 'https://10.0.0.1' }],
    ['emisor localhost', { issuer: 'https://localhost' }],
    ['emisor interno', { issuer: 'https://idp.internal' }],
    ['sin cliente', { clientId: '' }],
    ['sin dominios', { domains: [] }],
    ['dominio inválido', { domains: ['no es dominio'] }],
    ['demasiados dominios', { domains: Array.from({ length: 11 }, (_, i) => `d${i}.test`) }],
  ])('rechaza %s', async (_n, over) => {
    // allowInsecure falso: el filtro de emisores es el de producción
    const sso = build({ SSO_ALLOW_INSECURE: 'false', SSO_GOOGLE_ISSUER: undefined });
    expect((await put(sso, { ...config, ...over })).status).toBe(400);
  });

  test('un dominio que otra empresa ya verificó da 409; el secreto es obligatorio la primera vez', async () => {
    const sso = build();
    await put(sso, config);
    await verify(sso);
    const other = { user: user({ tenantId: 't2' }), accessToken: 'tok' };
    expect((await put(sso, config, other)).status).toBe(409);
    expect((await put(build(), { ...config, clientSecret: '' })).status).toBe(400);
  });

  test('solo administradores; otra empresa solo para super_admin', async () => {
    const sso = build();
    expect((await put(sso, config, { user: user({ role: 'agent' }), accessToken: 't' })).status).toBe(403);
    expect((await put(sso, config, admin, '?tenantId=t9')).status).toBe(403);
    expect((await put(sso, config, { user: user({ role: 'super_admin' }), accessToken: 't' }, '?tenantId=t9')).status).toBe(200);
    expect(sso.store.getEnterprise('t9')).toBeTruthy();
  });

  async function enterpriseLogin(over: Record<string, unknown> = {}, who: Partial<SessionUser> = {}, email = 'ada@acme.test') {
    const sso = build();
    await put(sso, config);
    await verify(sso);
    exchangeUser = user(who);
    const { q, cookie, location } = await begin(sso, 'enterprise', email);
    expect(location.startsWith(`${ISS}/auth`)).toBe(true);
    nextClaims = claimsFor(q, { email, email_verified: undefined, ...over });
    return { sso, back: await sso.callback('enterprise', { state: q.state, code: 'c' }, cookie) };
  }

  test('ida y vuelta: el proveedor sin email_verified vale porque es la autoridad de sus dominios', async () => {
    const { sso, back } = await enterpriseLogin();
    expect(hashOf(back.location).ticket).toBeTruthy();
    expect(exchanged[0]).toMatchObject({ provider: 'enterprise:t1' });
    expect(sso.store.getIdentity('enterprise:t1', 'sub-1')).toBeTruthy();
  });

  test('start: dominio desconocido y SSO apagado dan el mismo error (no revela qué empresas lo tienen)', async () => {
    const sso = build();
    await put(sso, config);
    await verify(sso);
    const unknown = await sso.start('enterprise', 'x@otro.test');
    sso.store.setPolicy({ tenantId: 't1', enabled: false });
    const off = await sso.start('enterprise', 'ada@acme.test');
    expect(hashOf(unknown.location).error).toBe('NO_PROVIDER');
    expect(off.location).toBe(unknown.location);
  });

  test.each([
    ['correo de otro dominio', { email: 'ada@otro.test' }, {}, 'WRONG_DOMAIN'],
    ['correo marcado sin verificar', { email_verified: false }, {}, 'EMAIL_NOT_VERIFIED'],
    ['persona de otra empresa', {}, { tenantId: 't2' }, 'WRONG_TENANT'],
    ['un super_admin no entra por el proveedor de una empresa', {}, { role: 'super_admin' as const }, 'ROLE_NOT_ALLOWED'],
  ])('%s', async (_n, claims, who, code) => {
    const { back } = await enterpriseLogin(claims, who);
    expect(hashOf(back.location).error).toBe(code);
    expect(hashOf(back.location).ticket).toBeUndefined();
  });

  test('cambiar de emisor desenlaza las identidades y borrar el proveedor las quita todas', async () => {
    const sso = build();
    await put(sso, config);
    sso.store.putIdentity({ provider: 'enterprise:t1', subject: 's', userId: 'u1', tenantId: 't1', email: 'a@acme.test' });
    await put(sso, { ...config, issuer: 'https://otro-idp.test' });
    expect(sso.store.getIdentity('enterprise:t1', 's')).toBeNull();
    sso.store.putIdentity({ provider: 'enterprise:t1', subject: 's', userId: 'u1', tenantId: 't1', email: 'a@acme.test' });
    const del = await sso.manage(new Request('http://app.test/m', { method: 'DELETE' }), '/enterprise', admin);
    expect(del.status).toBe(200);
    expect(sso.store.getEnterprise('t1')).toBeNull();
    expect(sso.store.getIdentity('enterprise:t1', 's')).toBeNull();
    expect(sso.store.domainOwner('acme.test')).toBeNull();
  });
});

describe('verificación de dominios', () => {
  const t1 = { user: user(), accessToken: 'tok' };
  const t2 = { user: user({ tenantId: 't2' }), accessToken: 'tok' };
  const config = { name: 'Acme', issuer: ISS, clientId: 'cid', clientSecret: 's', domains: ['acme.test'] };
  const put = (sso: ReturnType<typeof build>, body: object, auth = t1) =>
    sso.manage(new Request('http://app.test/m', { method: 'PUT', body: JSON.stringify(body) }), '/enterprise', auth);
  const get = async (sso: ReturnType<typeof build>, auth = t1) =>
    ((await sso.manage(new Request('http://app.test/m'), '/enterprise', auth)).json as { domains: { domain: string; verified: boolean; txtHost: string; txtValue: string }[] }).domains;
  const verifyReq = (sso: ReturnType<typeof build>, domain: string, auth = t1) =>
    sso.manage(new Request('http://app.test/m', { method: 'POST', body: JSON.stringify({ domain }) }), '/enterprise/verify', auth);
  const publish = async (sso: ReturnType<typeof build>, auth = t1, domain = 'acme.test') => {
    const d = (await get(sso, auth)).find((x) => x.domain === domain)!;
    txt[d.txtHost] = [[d.txtValue]];
    return d;
  };

  test('un dominio solo reclamado no enruta ni valida: hace falta demostrarlo', async () => {
    const sso = build();
    await put(sso, config);
    expect(hashOf((await sso.start('enterprise', 'ada@acme.test')).location).error).toBe('NO_PROVIDER');
    expect(sso.store.domainOwner('acme.test')).toBeNull();
    await publish(sso);
    expect((await verifyReq(sso, 'acme.test')).status).toBe(200);
    expect(sso.store.domainOwner('acme.test')).toBe('t1');
    expect((await sso.start('enterprise', 'ada@acme.test')).location.startsWith(`${ISS}/auth`)).toBe(true);
  });

  test('sin TXT, con otro valor o en otro dominio: 409 con las instrucciones', async () => {
    const sso = build();
    await put(sso, config);
    const none = await verifyReq(sso, 'acme.test');
    expect(none.status).toBe(409);
    expect(none.json).toMatchObject({ code: 'DOMAIN_NOT_VERIFIED' });
    expect(JSON.stringify(none.json)).toContain('_ruteando-verify.acme.test');
    txt['_ruteando-verify.acme.test'] = [['ruteando-verify=algo-que-no-es']];
    expect((await verifyReq(sso, 'acme.test')).status).toBe(409);
    txt['_ruteando-verify.otro.test'] = [['x']];
    expect((await verifyReq(sso, 'otro.test')).status).toBe(404); // ni está en la lista de la empresa
  });

  test('el valor depende de la empresa: el TXT de una no sirve para otra', async () => {
    const sso = build();
    await put(sso, config);
    await put(sso, config, t2);
    const mine = await publish(sso, t1);
    const theirs = (await get(sso, t2))[0];
    expect(theirs.txtValue).not.toBe(mine.txtValue);
    // t2 intenta verificar con lo que publicó t1
    expect((await verifyReq(sso, 'acme.test', t2)).status).toBe(409);
    expect(sso.store.domainOwner('acme.test')).toBeNull();
  });

  test('el TXT partido en trozos (255 bytes) se une antes de comparar', async () => {
    const sso = build();
    await put(sso, config);
    const d = (await get(sso))[0];
    txt[d.txtHost] = [[d.txtValue.slice(0, 10), d.txtValue.slice(10)]];
    expect((await verifyReq(sso, 'acme.test')).status).toBe(200);
  });

  test('reclamar es libre pero gana quien lo demuestra: el otro recibe DOMAIN_TAKEN', async () => {
    const sso = build();
    await put(sso, config); // t1 reclama (pendiente)
    await put(sso, config, t2); // t2 también: no está verificado, no choca
    await publish(sso, t2);
    expect((await verifyReq(sso, 'acme.test', t2)).status).toBe(200);
    await publish(sso, t1);
    const late = await verifyReq(sso, 'acme.test', t1);
    expect(late.status).toBe(409);
    expect(late.json).toMatchObject({ code: 'DOMAIN_TAKEN' });
    expect(sso.store.domainOwner('acme.test')).toBe('t2');
    // y a partir de ahí t1 ya no puede ni reclamarlo
    expect((await put(sso, config, t1)).status).toBe(409);
  });

  test('los dominios de correo públicos se rechazan aunque publiquen el TXT', async () => {
    const sso = build();
    for (const d of ['gmail.com', 'outlook.com', 'icloud.com', 'hotmail.es']) {
      expect((await put(sso, { ...config, domains: [d] })).status, d).toBe(400);
    }
    expect(sso.store.getEnterprise('t1')).toBeNull();
  });

  test('al guardar de nuevo se conserva lo verificado, lo nuevo queda pendiente y lo quitado se borra', async () => {
    const sso = build();
    await put(sso, { ...config, domains: ['acme.test', 'viejo.test'] });
    await publish(sso);
    await verifyReq(sso, 'acme.test');
    await put(sso, { ...config, domains: ['acme.test', 'nuevo.test'] });
    const now = await get(sso);
    expect(now.map((d) => [d.domain, d.verified])).toEqual([['acme.test', true], ['nuevo.test', false]]);
    // verificar dos veces es inofensivo
    expect((await verifyReq(sso, 'acme.test')).status).toBe(200);
  });

  test('un dominio que se verificó puede dejar de serlo al quitarlo: ya no enruta', async () => {
    const sso = build();
    await put(sso, config);
    await publish(sso);
    await verifyReq(sso, 'acme.test');
    await put(sso, { ...config, domains: ['otro.test'] });
    expect(sso.store.domainOwner('acme.test')).toBeNull();
    expect(hashOf((await sso.start('enterprise', 'ada@acme.test')).location).error).toBe('NO_PROVIDER');
  });

  test('si el administrador quita el dominio a mitad de un flujo, ese flujo ya no vale', async () => {
    const sso = build();
    await put(sso, config);
    await publish(sso);
    await verifyReq(sso, 'acme.test');
    exchangeUser = user();
    const { q, cookie } = await begin(sso, 'enterprise', 'ada@acme.test');
    nextClaims = claimsFor(q, { email: 'ada@acme.test', email_verified: undefined });
    await put(sso, { ...config, domains: ['otro.test'] }); // lo quita antes del regreso
    const back = await sso.callback('enterprise', { state: q.state, code: 'c' }, cookie);
    expect(hashOf(back.location).error).toBe('WRONG_DOMAIN');
    expect(exchanged).toHaveLength(0);
  });

  test('solo administradores verifican, y solo la empresa de quien llama (o super_admin con tenantId)', async () => {
    const sso = build();
    await put(sso, config);
    await publish(sso);
    expect((await verifyReq(sso, 'acme.test', { user: user({ role: 'agent' }), accessToken: 't' })).status).toBe(403);
    expect((await verifyReq(sso, 'acme.test', { user: null as never, accessToken: '' })).status).toBe(401);
    // un administrador de otra empresa no verifica el dominio de t1
    expect((await verifyReq(sso, 'acme.test', t2)).status).toBe(404);
  });

  test('el SSO empresarial apagado en el servidor responde 503', async () => {
    const sso = build({ SSO_ENABLED_PROVIDERS: 'google' });
    expect((await verifyReq(sso, 'acme.test')).status).toBe(503);
  });
});

describe('migración del almacén', () => {
  test('una base anterior (dominios sin verificar) se actualiza y sus dominios quedan PENDIENTES', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sso-')), 'sso.sqlite');
    openSsoStore(file).close(); // crea el esquema actual...
    const raw = new DatabaseSync(file); // ...y se devuelve a la versión 1, como la dejó la aplicación anterior
    raw.exec(`
      DROP INDEX sso_domain_verified; DROP TABLE sso_enterprise_domain;
      CREATE TABLE sso_enterprise_domain (domain TEXT PRIMARY KEY, tenant_id TEXT NOT NULL);
      INSERT INTO sso_enterprise_domain VALUES ('acme.test', 't1'), ('otra.test', 't2');
      INSERT INTO sso_enterprise VALUES ('t1', 'Acme', 'https://idp.test', 'cid', NULL, 'x');
      PRAGMA user_version = 1;`);
    raw.close();

    const store = openSsoStore(file);
    expect(store.schemaVersion()).toBe(2);
    expect(store.getEnterprise('t1')).toMatchObject({ domains: ['acme.test'], verifiedDomains: [] });
    expect(store.domainOwner('acme.test')).toBeNull(); // nadie lo demostró: hay que verificarlo de nuevo
    expect(store.verifyDomain('t1', 'acme.test')).toBe(true);
    expect(store.domainOwner('acme.test')).toBe('t1');
    expect(store.verifyDomain('t2', 'acme.test')).toBe(false); // el índice único parcial: un solo dueño
    store.close();
  });
});

describe('gestión con sesión', () => {
  const call = (sso: ReturnType<typeof build>, method: string, path: string, body?: unknown, auth = { user: user(), accessToken: 't' }) =>
    sso.manage(new Request('http://app.test/m', { method, body: body === undefined ? undefined : JSON.stringify(body) }), path, auth);

  test('sin sesión: 401 en todo', async () => {
    const sso = build();
    for (const [m, p] of [['GET', '/identities'], ['DELETE', '/identities/google'], ['GET', '/policy'], ['PUT', '/policy'], ['GET', '/enterprise']] as const) {
      expect((await call(sso, m, p, undefined, { user: null as never, accessToken: '' })).status, `${m} ${p}`).toBe(401);
    }
  });

  test('identidades: se listan sin el sujeto y se desvinculan', async () => {
    const sso = build();
    sso.store.putIdentity({ provider: 'google', subject: 'secreto-sub', userId: 'u1', tenantId: 't1', email: 'a@b.co' });
    sso.store.putIdentity({ provider: 'enterprise:t1', subject: 'e', userId: 'u1', tenantId: 't1', email: 'a@b.co' });
    const list = await call(sso, 'GET', '/identities');
    expect(JSON.stringify(list.json)).not.toContain('secreto-sub');
    expect((list.json as { identities: { provider: string }[] }).identities.map((i) => i.provider)).toEqual(['google', 'enterprise']);
    expect((await call(sso, 'DELETE', '/identities/google')).status).toBe(200);
    expect((await call(sso, 'DELETE', '/identities/google')).status).toBe(404);
    expect((await call(sso, 'DELETE', '/identities/enterprise')).status).toBe(200);
    expect((await call(sso, 'DELETE', '/identities/facebook')).status).toBe(404);
  });

  test('política: solo administradores y valida el tipo', async () => {
    const sso = build();
    expect((await call(sso, 'PUT', '/policy', { enabled: false }, { user: user({ role: 'agent' }), accessToken: 't' })).status).toBe(403);
    expect((await call(sso, 'PUT', '/policy', { enabled: 'no' })).status).toBe(400);
    expect((await call(sso, 'PUT', '/policy', { enabled: false })).status).toBe(200);
    expect(sso.store.getPolicy('t1').enabled).toBe(false);
  });

  test('el SSO empresarial apagado en el servidor responde 503', async () => {
    const sso = build({ SSO_ENABLED_PROVIDERS: 'google' });
    expect((await call(sso, 'PUT', '/enterprise', { name: 'x' })).status).toBe(503);
  });
});
