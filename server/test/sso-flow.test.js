// SSO de punta a punta: el módulo montado en un Express real contra un gateway falso (con `/auth/sso/exchange`) y un proveedor OIDC
// simulado. Cada prueba sigue un escenario de openspec/changes/add-sso/specs/single-sign-on.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const express = require('express');
const { createMfa } = require('../mfa');
const { openStore: openMfaStore } = require('../mfa/store');
const { createSso } = require('../sso');
const { startMockIdp } = require('../../scripts/mock-oidc-provider.cjs');

const KEY = crypto.randomBytes(32).toString('base64');
const USERS = {
  'ada@x.invalid': { id: 'u-ada', email: 'ada@x.invalid', role: 'tenant_admin', tenantId: 't1' },
  'ana@x.invalid': { id: 'u-ana', email: 'ana@x.invalid', role: 'agent', tenantId: 't1' },
  'sup@corp.example': { id: 'u-sup', email: 'sup@corp.example', role: 'super_admin', tenantId: 't2' },
  'olga@corp.example': { id: 'u-olga', email: 'olga@corp.example', role: 'agent', tenantId: 't2' },
  'ben@corp.example': { id: 'u-ben', email: 'ben@corp.example', role: 'tenant_admin', tenantId: 't2' },
  'off@x.invalid': { id: 'u-off', email: 'off@x.invalid', role: 'agent', tenantId: 't1', active: false },
};
const byToken = (auth) => Object.values(USERS).find((u) => `Bearer acc-${u.id}` === auth);

/** Gateway falso: `/auth/sso/exchange` (nunca crea cuentas), `/auth/me`; exige la clave de API. */
function startFakeGateway() {
  const exchanges = [];
  const server = http.createServer((req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (!req.headers['x-api-key']) return send(401, { message: 'sin clave' });
      if (req.method === 'POST' && req.url === '/api/v1/auth/sso/exchange') {
        const body = JSON.parse(raw || '{}');
        exchanges.push(body);
        const user = USERS[body.email];
        if (!user) return send(404, { message: 'no account' });
        if (user.active === false) return send(403, { message: 'disabled' });
        return send(200, { accessToken: `acc-${user.id}`, refreshToken: `ref-${user.id}`, expiresIn: 3600, user });
      }
      const me = byToken(req.headers.authorization);
      if (!me) return send(401, { message: 'no autorizado' });
      if (req.url === '/api/v1/auth/me') return send(200, me);
      return send(404, { message: 'no existe' });
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({ port: server.address().port, exchanges, close: () => server.close() })
    )
  );
}

const cleanups = [];
after(() => cleanups.forEach((fn) => fn()));

/** Todo montado: gateway, proveedor, SSO (y el segundo factor si se pide) en un Express. */
async function setup({ providers = 'google', env = {}, withMfa = false, mfaSetup, idpOptions } = {}) {
  const gateway = await startFakeGateway();
  const idp = await startMockIdp(idpOptions);
  const app = express();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const fullEnv = {
    GATEWAY_URL: `http://127.0.0.1:${gateway.port}`,
    GATEWAY_API_KEY: 'k',
    GATEWAY_MODE: 'real',
    MFA_SECRET_KEY: KEY,
    SSO_ENABLED_PROVIDERS: providers,
    SSO_REDIRECT_BASE_URL: base,
    SSO_ALLOW_INSECURE: 'true',
    SSO_DB_PATH: ':memory:',
    SSO_GOOGLE_CLIENT_ID: 'mock',
    SSO_GOOGLE_CLIENT_SECRET: 'mock',
    SSO_GOOGLE_ISSUER: idp.issuer,
    SSO_APPLE_ISSUER: idp.issuer,
    ...env,
  };
  let mfa = null;
  if (withMfa) {
    mfa = createMfa(fullEnv, {
      store: openMfaStore(':memory:'),
      mailer: { available: true, send: async () => {} },
      sms: { available: false },
    });
    mfaSetup?.(mfa);
    mfa.mount(app);
  }
  const sso = createSso(fullEnv, { mfa });
  sso.mount(app);
  cleanups.push(() => {
    server.close();
    server.closeAllConnections?.();
    gateway.close();
    idp.close();
  });
  return { base, idp, gateway, sso, server };
}

const json = (base, path, { method = 'GET', body, token, headers = {} } = {}) =>
  fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

/** Recorre el flujo del navegador: start → proveedor → regreso. Devuelve el `#hash` final (`ticket=…` o `error=…`). */
async function browserFlow(ctx, provider = 'google', { identity, query = '', cookie, mutateCallback } = {}) {
  if (identity !== undefined) ctx.idp.identity = identity;
  const start = await fetch(`${ctx.base}/gateway/sso/${provider}/start${query}`, { redirect: 'manual' });
  assert.equal(start.status, 302);
  const location = start.headers.get('location');
  if (location.startsWith('/access/sso#')) return { hash: location.split('#')[1], start };
  const setCookie = start.headers.get('set-cookie') || '';
  const jar = cookie ?? setCookie.split(';')[0];
  const authorize = await fetch(location, { redirect: 'manual' });
  let callback = authorize.headers.get('location');
  if (mutateCallback) callback = mutateCallback(callback);
  const back = await fetch(callback, { redirect: 'manual', headers: jar ? { Cookie: jar } : {} });
  assert.equal(back.status, 302);
  return { hash: back.headers.get('location').split('#')[1], start, location, callback, jar };
}
const ticketOf = (hash) => new URLSearchParams(hash).get('ticket');
const errorOf = (hash) => new URLSearchParams(hash).get('error');

const VERIFIED = (email, sub = `sub-${email}`) => ({ email, sub, email_verified: true, name: 'Prueba' });

test('apagado: sin proveedores, /providers responde lista vacía y el resto 503', async () => {
  const app = express();
  createSso({ SSO_ENABLED_PROVIDERS: '' }).mount(app);
  const server = await new Promise((r) => {
    const s = app.listen(0, '127.0.0.1', () => r(s));
  });
  cleanups.push(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.deepEqual(await (await json(base, '/gateway/sso/providers')).json(), { providers: [] });
  const res = await json(base, '/gateway/sso/complete', { method: 'POST', body: { ticket: 'x' } });
  assert.equal(res.status, 503);
});

test('sin credenciales de un proveedor pedido, ese proveedor no se ofrece', async () => {
  const ctx = await setup({ providers: 'google,github', env: {} });
  const list = await (await json(ctx.base, '/gateway/sso/providers')).json();
  assert.deepEqual(list.providers, [{ id: 'google', label: 'Google' }]);
});

test('Google: el flujo entrega la sesión del gateway y enlaza la identidad', async () => {
  const ctx = await setup();
  const { hash, location } = await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid') });
  // PKCE S256, state y nonce en la dirección de autorización
  const q = new URL(location).searchParams;
  assert.equal(q.get('code_challenge_method'), 'S256');
  assert.ok(q.get('state') && q.get('nonce'));
  assert.equal(q.get('redirect_uri'), `${ctx.base}/gateway/sso/google/callback`);

  const ticket = ticketOf(hash);
  assert.ok(ticket);
  const res = await json(ctx.base, '/gateway/sso/complete', { method: 'POST', body: { ticket } });
  assert.equal(res.status, 200);
  const session = await res.json();
  assert.equal(session.user.email, 'ada@x.invalid');
  assert.equal(session.accessToken, 'acc-u-ada');
  assert.deepEqual(ctx.gateway.exchanges[0], {
    provider: 'google',
    subject: 'sub-ada@x.invalid',
    email: 'ada@x.invalid',
    emailVerified: true,
  });
  assert.equal(ctx.sso.store.identitiesOf('u-ada').length, 1);
  // el ticket es de un solo uso
  const again = await json(ctx.base, '/gateway/sso/complete', { method: 'POST', body: { ticket } });
  assert.equal(again.status, 401);
  assert.equal((await again.json()).code, 'TICKET_EXPIRED');
});

test('el regreso sin la cookie del navegador que empezó, o con otra, se rechaza (login CSRF)', async () => {
  const ctx = await setup();
  const none = await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid'), cookie: '' });
  assert.equal(errorOf(none.hash), 'STATE_INVALID');
  const other = await browserFlow(ctx, 'google', {
    identity: VERIFIED('ada@x.invalid'),
    cookie: 'ruteando_sso=otra',
  });
  assert.equal(errorOf(other.hash), 'STATE_INVALID');
  assert.equal(ctx.gateway.exchanges.length, 0);
});

test('un state se usa una sola vez y no vale en otro proveedor', async () => {
  const ctx = await setup({ providers: 'google,enterprise' });
  const first = await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid') });
  assert.ok(ticketOf(first.hash));
  const replay = await fetch(first.callback, { redirect: 'manual', headers: { Cookie: first.jar } });
  assert.equal(errorOf(replay.headers.get('location').split('#')[1]), 'STATE_INVALID');
  const swapped = await browserFlow(ctx, 'google', {
    identity: VERIFIED('ada@x.invalid'),
    mutateCallback: (url) => url.replace('/google/callback', '/enterprise/callback'),
  });
  assert.equal(errorOf(swapped.hash), 'STATE_INVALID');
});

test('un correo sin verificar o ausente nunca se enlaza', async () => {
  const ctx = await setup();
  const unverified = await browserFlow(ctx, 'google', {
    identity: { email: 'ada@x.invalid', sub: 's1', email_verified: false },
  });
  assert.equal(errorOf(unverified.hash), 'EMAIL_NOT_VERIFIED');
  const unknown = await browserFlow(ctx, 'google', { identity: { email: 'ada@x.invalid', sub: 's1' } });
  assert.equal(errorOf(unknown.hash), 'EMAIL_NOT_VERIFIED');
  const noEmail = await browserFlow(ctx, 'google', { identity: { sub: 's2', email_verified: true } });
  assert.equal(errorOf(noEmail.hash), 'EMAIL_MISSING');
  assert.equal(ctx.gateway.exchanges.length, 0);
});

test('sin cuenta en el gateway o con la cuenta inactiva no se crea nada y se explica', async () => {
  const ctx = await setup();
  const none = await browserFlow(ctx, 'google', { identity: VERIFIED('nadie@x.invalid') });
  assert.equal(errorOf(none.hash), 'NO_ACCOUNT');
  const off = await browserFlow(ctx, 'google', { identity: VERIFIED('off@x.invalid') });
  assert.equal(errorOf(off.hash), 'ACCOUNT_DISABLED');
});

test('id_token inválido: firma ajena, audiencia, nonce o emisor equivocados', async () => {
  const ctx = await setup();
  ctx.idp.wrongKey = true;
  assert.equal(
    errorOf((await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid') })).hash),
    'INVALID_TOKEN'
  );
  ctx.idp.wrongKey = false;
  for (const claims of [{ aud: 'otro' }, { nonce: 'otro' }, { iss: 'http://evil.example' }, { exp: 1 }, { sub: '' }]) {
    ctx.idp.claims = claims;
    const out = await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid') });
    assert.equal(errorOf(out.hash), 'INVALID_TOKEN', JSON.stringify(claims));
  }
  assert.equal(ctx.gateway.exchanges.length, 0);
});

test('un código de autorización incorrecto (PKCE o secreto) no entrega nada', async () => {
  const ctx = await setup({ env: { SSO_GOOGLE_CLIENT_SECRET: 'distinto' } });
  const out = await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid') });
  assert.equal(errorOf(out.hash), 'PROVIDER_ERROR');
  assert.ok(ctx.idp.tokenRequests[0].code_verifier);
});

test('la identidad enlazada a una persona no pasa a otra aunque llegue con el correo de esa otra', async () => {
  const ctx = await setup();
  const first = await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid', 'misma') });
  assert.ok(ticketOf(first.hash));
  const second = await browserFlow(ctx, 'google', { identity: VERIFIED('ana@x.invalid', 'misma') });
  assert.equal(errorOf(second.hash), 'IDENTITY_MISMATCH');
});

test('la empresa puede apagar el SSO: ya no entra nadie de ella', async () => {
  const ctx = await setup();
  ctx.sso.store.setPolicy({ tenantId: 't1', enabled: false });
  const out = await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid') });
  assert.equal(errorOf(out.hash), 'SSO_DISABLED');
});

test('el SSO pasa por el segundo factor: la empresa que lo exige recibe el reto de activación', async () => {
  const ctx = await setup({
    withMfa: true,
    mfaSetup: (mfa) =>
      mfa.store.setPolicy({
        tenantId: 't1',
        methods: { email: true, sms: false, totp: true },
        required: 'all',
        roles: [],
      }),
  });
  const { hash } = await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid') });
  const res = await json(ctx.base, '/gateway/sso/complete', { method: 'POST', body: { ticket: ticketOf(hash) } });
  const body = await res.json();
  assert.equal(body.mfaEnrollRequired, true);
  assert.ok(body.challengeId);
  assert.equal(body.accessToken, undefined, 'ningún token llega antes del segundo factor');
});

test('con un método activo, el SSO pide el código en lugar de entregar la sesión', async () => {
  const ctx = await setup({
    withMfa: true,
    mfaSetup: (mfa) =>
      mfa.store.putFactor({
        userId: 'u-ada',
        tenantId: 't1',
        type: 'email',
        destination: 'ada@x.invalid',
        verified: true,
      }),
  });
  const { hash } = await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid') });
  const body = await (
    await json(ctx.base, '/gateway/sso/complete', { method: 'POST', body: { ticket: ticketOf(hash) } })
  ).json();
  assert.equal(body.mfaRequired, true);
  assert.equal(body.accessToken, undefined);
});

test('identidades: se listan y se desvinculan solo con sesión', async () => {
  const ctx = await setup();
  await browserFlow(ctx, 'google', { identity: VERIFIED('ada@x.invalid') });
  assert.equal((await json(ctx.base, '/gateway/sso/identities')).status, 401);
  const list = await (await json(ctx.base, '/gateway/sso/identities', { token: 'acc-u-ada' })).json();
  assert.deepEqual(
    list.identities.map((i) => [i.provider, i.email]),
    [['google', 'ada@x.invalid']]
  );
  const del = await json(ctx.base, '/gateway/sso/identities/google', { method: 'DELETE', token: 'acc-u-ada' });
  assert.equal(del.status, 200);
  const again = await json(ctx.base, '/gateway/sso/identities/google', { method: 'DELETE', token: 'acc-u-ada' });
  assert.equal(again.status, 404);
});

test('política: solo la administran los administradores, y solo de su empresa', async () => {
  const ctx = await setup();
  assert.equal((await json(ctx.base, '/gateway/sso/policy', { token: 'acc-u-ana' })).status, 403);
  const put = await json(ctx.base, '/gateway/sso/policy', {
    method: 'PUT',
    token: 'acc-u-ada',
    body: { enabled: false },
  });
  assert.deepEqual((await put.json()).enabled, false);
  const other = await json(ctx.base, '/gateway/sso/policy?tenantId=t2', { token: 'acc-u-ada' });
  assert.equal(other.status, 403);
  const bad = await json(ctx.base, '/gateway/sso/policy', {
    method: 'PUT',
    token: 'acc-u-ada',
    body: { enabled: 'si' },
  });
  assert.equal(bad.status, 400);
});

test('SSO empresarial: alta validada, dominio por correo, empresa y dominio comprobados', async () => {
  const ctx = await setup({ providers: 'enterprise' });
  const corp = {
    name: 'Corp',
    issuer: ctx.idp.issuer,
    clientId: 'mock',
    clientSecret: 'mock',
    domains: ['corp.example'],
  };
  const admin = 'acc-u-ben';
  // validaciones
  for (const patch of [
    { issuer: 'ftp://x' },
    { domains: [] },
    { domains: ['no es dominio'] },
    { name: '' },
    { clientSecret: '' },
  ]) {
    const res = await json(ctx.base, '/gateway/sso/enterprise', {
      method: 'PUT',
      token: admin,
      body: { ...corp, ...patch },
    });
    assert.equal(res.status, 400, JSON.stringify(patch));
  }
  assert.equal(
    (await json(ctx.base, '/gateway/sso/enterprise', { method: 'PUT', token: 'acc-u-olga', body: corp })).status,
    403
  );
  const saved = await (
    await json(ctx.base, '/gateway/sso/enterprise', { method: 'PUT', token: admin, body: corp })
  ).json();
  assert.equal(saved.configured, true);
  assert.equal(saved.hasSecret, true);
  assert.equal('clientSecret' in saved || 'secretEnc' in saved, false, 'el secreto no vuelve al navegador');
  assert.equal(saved.redirectUri, `${ctx.base}/gateway/sso/enterprise/callback`);
  // otra empresa no puede quedarse con el dominio
  const taken = await json(ctx.base, '/gateway/sso/enterprise', { method: 'PUT', token: 'acc-u-ada', body: corp });
  assert.equal(taken.status, 409);

  // entrar: el dominio del correo escrito elige el proveedor; sin dominio conocido no hay proveedor
  const ok = await browserFlow(ctx, 'enterprise', {
    identity: { email: 'olga@corp.example', sub: 'o1' }, // sin email_verified: lo normal en algunos IdP
    query: '?email=olga@corp.example',
  });
  assert.ok(ticketOf(ok.hash));
  assert.equal(ctx.gateway.exchanges.at(-1).provider, 'enterprise:t2');
  const unknown = await browserFlow(ctx, 'enterprise', { query: '?email=a@desconocida.example' });
  assert.equal(errorOf(unknown.hash), 'NO_PROVIDER');
  // el proveedor de la empresa no puede dar acceso a personas de otra empresa ni de otro dominio
  const alien = await browserFlow(ctx, 'enterprise', {
    identity: { email: 'ada@x.invalid', sub: 'o2', email_verified: true },
    query: '?email=olga@corp.example',
  });
  assert.equal(errorOf(alien.hash), 'WRONG_DOMAIN');
  const liar = await browserFlow(ctx, 'enterprise', {
    identity: { email: 'ana@corp.example', sub: 'o3', email_verified: false },
    query: '?email=olga@corp.example',
  });
  assert.equal(errorOf(liar.hash), 'EMAIL_NOT_VERIFIED');

  // un super_admin de la empresa no entra por el proveedor que ella misma controla
  const sup = await browserFlow(ctx, 'enterprise', {
    identity: { email: 'sup@corp.example', sub: 'o4', email_verified: true },
    query: '?email=olga@corp.example',
  });
  assert.equal(errorOf(sup.hash), 'ROLE_NOT_ALLOWED');

  // al borrarlo se van el proveedor, los dominios y las identidades
  assert.equal((await json(ctx.base, '/gateway/sso/enterprise', { method: 'DELETE', token: admin })).status, 200);
  assert.equal(ctx.sso.store.domainOwner('corp.example'), null);
  const gone = await browserFlow(ctx, 'enterprise', { query: '?email=olga@corp.example' });
  assert.equal(errorOf(gone.hash), 'NO_PROVIDER');
});

test('SSO empresarial: el emisor privado o sin https se rechaza fuera de desarrollo (SSRF)', async () => {
  const { checkIssuer } = require('../sso/oidc');
  for (const bad of [
    'http://idp.example',
    'https://127.0.0.1',
    'https://10.0.0.5',
    'https://localhost',
    'https://[::1]',
    'https://db.internal',
    'nope',
  ]) {
    assert.equal(checkIssuer(bad, false), false, bad);
  }
  assert.equal(checkIssuer('https://login.empresa.com/tenant', false), true);
});

test('Apple: pide form_post, el regreso es un POST y el secreto de cliente es un JWT ES256 firmado', async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const ctx = await setup({
    providers: 'apple',
    idpOptions: { clientSecret: null },
    env: {
      SSO_APPLE_CLIENT_ID: 'mock',
      SSO_APPLE_TEAM_ID: 'TEAM123456',
      SSO_APPLE_KEY_ID: 'KEY1234567',
      SSO_APPLE_PRIVATE_KEY: pem.replace(/\n/g, '\\n'),
    },
  });
  ctx.idp.identity = { email: 'ada@x.invalid', sub: 'ap1', email_verified: 'true' }; // Apple manda "true" como texto
  const start = await fetch(`${ctx.base}/gateway/sso/apple/start`, { redirect: 'manual' });
  const cookie = start.headers.get('set-cookie');
  assert.match(cookie, /SameSite=None/);
  assert.match(cookie, /Secure/);
  const location = start.headers.get('location');
  assert.equal(new URL(location).searchParams.get('response_mode'), 'form_post');
  // el «navegador» sigue el formulario que devuelve el proveedor y lo envía por POST
  const formPage = await (await fetch(location)).text();
  const code = formPage.match(/name="code" value="([^"]+)"/)[1];
  const state = formPage.match(/name="state" value="([^"]+)"/)[1];
  const back = await fetch(`${ctx.base}/gateway/sso/apple/callback`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie.split(';')[0] },
    body: new URLSearchParams({ code, state }).toString(),
  });
  assert.ok(ticketOf(back.headers.get('location').split('#')[1]));
  const secret = ctx.idp.tokenRequests[0].client_secret;
  const [h, p, s] = secret.split('.');
  assert.equal(JSON.parse(Buffer.from(h, 'base64url')).kid, 'KEY1234567');
  assert.equal(JSON.parse(Buffer.from(p, 'base64url')).iss, 'TEAM123456');
  assert.ok(
    crypto.verify(
      'sha256',
      Buffer.from(`${h}.${p}`),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(s, 'base64url')
    )
  );
});

test('GitHub: el correo es el principal verificado de la API, no el del perfil', async () => {
  const { createGithubClient } = require('../sso/github');
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(url);
    const ok = (body) => ({ status: 200, text: async () => JSON.stringify(body) });
    if (url.includes('access_token')) return ok({ access_token: 'gho_x' });
    if (url.endsWith('/user')) return ok({ id: 42, login: 'x', email: 'publico@falso.example', name: 'Ada' });
    return ok([
      { email: 'otro@x.invalid', primary: false, verified: true },
      { email: 'Ada@X.invalid', primary: true, verified: true },
    ]);
  };
  const client = createGithubClient({ clientId: 'c', clientSecret: 's', fetchImpl });
  const url = new URL(await client.authorizationUrl({ redirectUri: 'http://r', state: 's', codeChallenge: 'x' }));
  assert.equal(url.searchParams.get('scope'), 'read:user user:email');
  assert.deepEqual(await client.complete({ code: 'c', redirectUri: 'http://r', codeVerifier: 'v' }), {
    subject: '42',
    email: 'ada@x.invalid',
    emailVerified: true,
    name: 'Ada',
  });
  const unverified = createGithubClient({
    clientId: 'c',
    clientSecret: 's',
    fetchImpl: async (url) => ({
      status: 200,
      text: async () =>
        JSON.stringify(
          url.includes('access_token')
            ? { access_token: 'x' }
            : url.endsWith('/user')
              ? { id: 1 }
              : [{ email: 'a@b.c', primary: true, verified: false }]
        ),
    }),
  });
  const result = await unverified.complete({ code: 'c', redirectUri: 'r', codeVerifier: 'v' });
  assert.equal(result.emailVerified, false);
  assert.equal(result.email, '');
});

test('llamadas salientes: solo a direcciones públicas (SSRF, también por DNS)', async () => {
  const { isPrivateAddress, safeFetch } = require('../sso/safe-fetch');
  for (const ip of [
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    '::',
    'fe80::1',
    'fd00::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '::ffff:7f00:1',
    '::ffff:a00:1',
    '::127.0.0.1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::1',
    '2001:0:4136:e378:8000:63bf:3fff:fdd2',
    '2001:db8::1',
    'ff02::1',
    '224.0.0.1',
    'no-es-ip',
  ]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '100.128.0.1', '2606:4700:4700::1111']) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
  // `localhost` resuelve a bucle local: se rechaza antes de conectar; y http no se admite
  await assert.rejects(safeFetch('https://localhost:9/'), /no permitida/);
  await assert.rejects(safeFetch('http://example.com/'), /Solo https/);
});
