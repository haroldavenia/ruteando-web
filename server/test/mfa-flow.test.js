// Segundo factor de punta a punta: el módulo montado en un Express real contra un gateway falso, con correo y SMS capturados y un reloj
// simulado. Cada prueba sigue un escenario de openspec/changes/add-mfa/specs/two-factor-authentication.
const { test, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const express = require('express');
const { createMfa } = require('../mfa');
const { openStore } = require('../mfa/store');
const { totpAt } = require('../mfa/totp');

const KEY = crypto.randomBytes(32).toString('base64');
const T1 = 't1';
const USERS = {
  'admin@x.invalid': { id: 'u-admin', email: 'admin@x.invalid', role: 'tenant_admin', tenantId: T1, firstName: 'Ada' },
  'agente@x.invalid': { id: 'u-agent', email: 'agente@x.invalid', role: 'agent', tenantId: T1, firstName: 'Ana' },
  'otra@x.invalid': { id: 'u-other', email: 'otra@x.invalid', role: 'tenant_admin', tenantId: 't2', firstName: 'Olga' },
  'super@x.invalid': { id: 'u-super', email: 'super@x.invalid', role: 'super_admin', tenantId: T1, firstName: 'Sol' },
};
const byToken = (auth) => Object.values(USERS).find((u) => `Bearer acc-${u.id}` === auth);

/** Gateway falso: login, /auth/me y /users/:id, y exige la clave de API como el real. */
function startFakeGateway() {
  const seenKeys = [];
  const server = http.createServer((req, res) => {
    seenKeys.push(req.headers['x-api-key']);
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (!req.headers['x-api-key']) return send(401, { message: 'sin clave' });
      if (req.method === 'POST' && req.url === '/api/v1/auth/login') {
        const body = JSON.parse(raw || '{}');
        const user = USERS[body.email];
        if (!user || body.password !== 'pw') return send(401, { message: 'Invalid credentials' });
        return send(200, { accessToken: `acc-${user.id}`, refreshToken: `ref-${user.id}`, expiresIn: 3600, user });
      }
      const me = byToken(req.headers.authorization);
      if (!me) return send(401, { message: 'no autorizado' });
      if (req.url === '/api/v1/auth/me') return send(200, me);
      const m = req.url.match(/^\/api\/v1\/users\/([^/]+)$/);
      if (m) {
        const user = Object.values(USERS).find((u) => u.id === m[1]);
        return user ? send(200, user) : send(404, { message: 'no existe' });
      }
      return send(404, { message: 'no existe' });
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ port: server.address().port, seenKeys, close: () => server.close() }))
  );
}

const cleanups = [];
after(() => cleanups.forEach((fn) => fn()));

/** Monta todo: gateway falso, módulo, correo capturado y reloj; devuelve ayudantes para las pruebas. */
async function setup({ withKey = true, smsProvider = 'dev' } = {}) {
  const gw = await startFakeGateway();
  let clock = Date.UTC(2026, 10, 9, 12, 0, 0);
  const sent = [];
  const mailer = { available: true, send: async (m) => void sent.push(m) };
  const store = openStore(':memory:', { now: () => new Date(clock) });
  const mfa = createMfa(
    {
      MFA_SECRET_KEY: withKey ? KEY : undefined,
      GATEWAY_URL: `http://127.0.0.1:${gw.port}`,
      GATEWAY_API_KEY: 'clave-del-servidor',
      SMS_PROVIDER: smsProvider,
    },
    { now: () => clock, mailer, store }
  );
  const app = express();
  mfa.mount(app);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  cleanups.push(() => {
    server.closeAllConnections();
    server.close();
    gw.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function call(method, path, { body, token, challenge } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (challenge) headers['X-MFA-Challenge'] = challenge;
    const res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* no es JSON */
    }
    return { status: res.status, json, text };
  }
  const tokenOf = (email) => `acc-${USERS[email].id}`;
  const login = (email, password = 'pw') => call('POST', '/gateway/auth/login', { body: { email, password } });
  const lastCode = () => sent.at(-1).text.match(/es (\d{6})\./)[1];
  const tick = (ms) => (clock += ms);

  /** Activa TOTP para una persona ya con sesión y devuelve su secreto y los códigos de recuperación. */
  async function enableTotp(email) {
    const s = await call('POST', '/gateway/mfa/totp/setup', { token: tokenOf(email) });
    assert.equal(s.status, 200);
    const c = await call('POST', '/gateway/mfa/totp/confirm', {
      token: tokenOf(email),
      body: { code: totpAt(s.json.secret, clock) },
    });
    assert.equal(c.status, 200);
    tick(30_000); // el paso usado para confirmar no vale otra vez
    return { secret: s.json.secret, recoveryCodes: c.json.recoveryCodes };
  }
  return { gw, mfa, store, sent, call, login, tokenOf, lastCode, tick, now: () => clock, enableTotp };
}

let ctx;
beforeEach(async () => {
  ctx = await setup();
});

test('sin segundo factor exigido el login es la misma sesión del gateway, y un error del gateway pasa tal cual', async () => {
  const ok = await ctx.login('agente@x.invalid');
  assert.equal(ok.status, 200);
  assert.equal(ok.json.accessToken, 'acc-u-agent');
  assert.equal(ok.json.user.tenantId, T1);
  assert.equal(ctx.mfa.challenges.size(), 0);
  const bad = await ctx.login('agente@x.invalid', 'mala');
  assert.equal(bad.status, 401);
  assert.deepEqual(bad.json, { message: 'Invalid credentials' });
  assert.deepEqual(new Set(ctx.gw.seenKeys), new Set(['clave-del-servidor']), 'la clave del servidor viaja siempre');
});

test('con TOTP activo el login devuelve un reto sin tokens y solo el código correcto entrega la sesión', async () => {
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  const r = await ctx.login('agente@x.invalid');
  assert.equal(r.status, 200);
  assert.equal(r.json.mfaRequired, true);
  assert.equal(r.json.accessToken, undefined);
  assert.ok(
    !r.text.includes('acc-u-agent') && !r.text.includes('ref-u-agent'),
    'ningún token en la respuesta del reto'
  );
  assert.deepEqual(
    r.json.methods.map((m) => m.method),
    ['totp', 'recovery']
  );

  const wrong = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r.json.challengeId, method: 'totp', code: '000000' },
  });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.json.code, 'INVALID_CODE');
  assert.ok(!wrong.text.includes('acc-u-agent'));

  const good = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r.json.challengeId, method: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(good.status, 200);
  assert.equal(good.json.accessToken, 'acc-u-agent');
  assert.equal(good.json.refreshToken, 'ref-u-agent');
  const again = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r.json.challengeId, method: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(again.status, 401, 'el reto se consumió: no se puede reutilizar');
});

test('un código TOTP aceptado no sirve en el siguiente inicio de sesión del mismo paso', async () => {
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  const code = totpAt(secret, ctx.now());
  const first = await ctx.login('agente@x.invalid');
  assert.equal(
    (
      await ctx.call('POST', '/gateway/mfa/login/verify', {
        body: { challengeId: first.json.challengeId, method: 'totp', code },
      })
    ).status,
    200
  );
  const second = await ctx.login('agente@x.invalid');
  const replay = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: second.json.challengeId, method: 'totp', code },
  });
  assert.equal(replay.status, 401);
});

test('5 intentos fallidos bloquean el reto: después responde 429 aunque el código sea correcto', async () => {
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  const r = await ctx.login('agente@x.invalid');
  const id = r.json.challengeId;
  for (let i = 0; i < 4; i++) {
    assert.equal(
      (
        await ctx.call('POST', '/gateway/mfa/login/verify', {
          body: { challengeId: id, method: 'totp', code: '000000' },
        })
      ).status,
      401
    );
  }
  assert.equal(
    (await ctx.call('POST', '/gateway/mfa/login/verify', { body: { challengeId: id, method: 'totp', code: '000000' } }))
      .status,
    429
  );
  const late = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: id, method: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(late.status, 429);
  assert.equal(late.json.accessToken, undefined);
});

test('un reto caduca a los 5 minutos y descarta los tokens', async () => {
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  const r = await ctx.login('agente@x.invalid');
  ctx.tick(5 * 60 * 1000 + 1);
  const v = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r.json.challengeId, method: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(v.status, 401);
  assert.equal(v.json.code, 'CHALLENGE_EXPIRED');
});

test('un método que la persona no tiene activo se rechaza con 400 y no cuenta como intento', async () => {
  await ctx.enableTotp('agente@x.invalid');
  const r = await ctx.login('agente@x.invalid');
  const v = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r.json.challengeId, method: 'sms', code: '123456' },
  });
  assert.equal(v.status, 400);
  assert.equal(ctx.mfa.challenges.get(r.json.challengeId).attempts, 0);
});

test('correo: se activa con el código recibido y el login lo usa, con un solo uso y máximo 3 envíos', async () => {
  const token = ctx.tokenOf('agente@x.invalid');
  assert.equal((await ctx.call('POST', '/gateway/mfa/email/setup', { token })).status, 200);
  assert.equal(ctx.sent.length, 1);
  assert.equal(ctx.sent[0].to, 'agente@x.invalid');
  const bad = await ctx.call('POST', '/gateway/mfa/email/confirm', { token, body: { code: '000000' } });
  assert.equal(bad.status, 401);
  const conf = await ctx.call('POST', '/gateway/mfa/email/confirm', { token, body: { code: ctx.lastCode() } });
  assert.equal(conf.status, 200);
  assert.equal(conf.json.recoveryCodes.length, 10, 'el primer método activado trae los códigos de recuperación');

  const r = await ctx.login('agente@x.invalid');
  assert.equal(r.json.methods[0].method, 'email');
  assert.equal(r.json.methods[0].destination, 'a•••@x.invalid');
  const before = ctx.sent.length;
  const sendRes = await ctx.call('POST', '/gateway/mfa/login/send', {
    body: { challengeId: r.json.challengeId, method: 'email' },
  });
  assert.equal(sendRes.status, 200);
  assert.ok(!sendRes.text.includes(ctx.lastCode()), 'la respuesta no incluye el código');
  assert.equal(ctx.sent.length, before + 1);
  const code = ctx.lastCode();
  const ok = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r.json.challengeId, method: 'email', code },
  });
  assert.equal(ok.status, 200);

  const r2 = await ctx.login('agente@x.invalid');
  await ctx.call('POST', '/gateway/mfa/login/send', { body: { challengeId: r2.json.challengeId, method: 'email' } });
  const reuse = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r2.json.challengeId, method: 'email', code },
  });
  assert.equal(reuse.status, 401, 'el código anterior ya no vale');
});

test('el cuarto envío en 10 minutos responde 429 y no manda ningún correo', async () => {
  const token = ctx.tokenOf('agente@x.invalid');
  for (let i = 0; i < 3; i++) assert.equal((await ctx.call('POST', '/gateway/mfa/email/setup', { token })).status, 200);
  const sentBefore = ctx.sent.length;
  const blocked = await ctx.call('POST', '/gateway/mfa/email/setup', { token });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.json.retryAfterSeconds > 0);
  assert.equal(ctx.sent.length, sentBefore);
  ctx.tick(10 * 60 * 1000 + 1);
  assert.equal((await ctx.call('POST', '/gateway/mfa/email/setup', { token })).status, 200);
});

test('SMS con el proveedor de desarrollo: teléfono internacional, código por correo local y login', async () => {
  const token = ctx.tokenOf('agente@x.invalid');
  const bad = await ctx.call('POST', '/gateway/mfa/sms/setup', { token, body: { phone: '3001234567' } });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.code, 'INVALID_PHONE');
  const setup = await ctx.call('POST', '/gateway/mfa/sms/setup', { token, body: { phone: '+57 300 123 4567' } });
  assert.equal(setup.status, 200);
  assert.equal(setup.json.destination, '+57•••••4567');
  assert.match(ctx.sent.at(-1).to, /^sms\+573001234567@/);
  assert.equal(
    (await ctx.call('POST', '/gateway/mfa/sms/confirm', { token, body: { code: ctx.lastCode() } })).status,
    200
  );

  const r = await ctx.login('agente@x.invalid');
  assert.deepEqual(r.json.methods[0], { method: 'sms', destination: '+57•••••4567' });
  await ctx.call('POST', '/gateway/mfa/login/send', { body: { challengeId: r.json.challengeId, method: 'sms' } });
  const ok = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r.json.challengeId, method: 'sms', code: ctx.lastCode() },
  });
  assert.equal(ok.status, 200);
});

test('sin proveedor de SMS el método no se ofrece ni se puede activar', async () => {
  const c = await setup({ smsProvider: '' });
  const status = await c.call('GET', '/gateway/mfa/status', { token: c.tokenOf('agente@x.invalid') });
  assert.equal(status.json.methods.sms.available, false);
  const setupSms = await c.call('POST', '/gateway/mfa/sms/setup', {
    token: c.tokenOf('agente@x.invalid'),
    body: { phone: '+573001234567' },
  });
  assert.equal(setupSms.status, 503);
  assert.equal(c.sent.length, 0);
});

test('un código de recuperación vale una vez, avisa cuántos quedan y se pueden regenerar', async () => {
  const { recoveryCodes } = await ctx.enableTotp('agente@x.invalid');
  assert.equal(recoveryCodes.length, 10);
  const r = await ctx.login('agente@x.invalid');
  const ok = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: {
      challengeId: r.json.challengeId,
      method: 'recovery',
      code: recoveryCodes[0].toLowerCase().replace('-', ' '),
    },
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json.mfa, { method: 'recovery', recoveryCodesLeft: 9 });
  const r2 = await ctx.login('agente@x.invalid');
  const reuse = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r2.json.challengeId, method: 'recovery', code: recoveryCodes[0] },
  });
  assert.equal(reuse.status, 401);

  const token = ctx.tokenOf('agente@x.invalid');
  const noCode = await ctx.call('POST', '/gateway/mfa/recovery-codes/regenerate', {
    token,
    body: { via: 'recovery', code: 'AAAAA-AAAAA' },
  });
  assert.equal(noCode.status, 401);
  const regen = await ctx.call('POST', '/gateway/mfa/recovery-codes/regenerate', {
    token,
    body: { via: 'recovery', code: recoveryCodes[1] },
  });
  assert.equal(regen.status, 200);
  assert.equal(regen.json.recoveryCodes.length, 10);
  const r3 = await ctx.login('agente@x.invalid');
  const old = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r3.json.challengeId, method: 'recovery', code: recoveryCodes[2] },
  });
  assert.equal(old.status, 401, 'los códigos anteriores dejan de valer');
});

test('las rutas de gestión exigen una sesión válida del gateway', async () => {
  assert.equal((await ctx.call('GET', '/gateway/mfa/status')).status, 401);
  assert.equal((await ctx.call('GET', '/gateway/mfa/status', { token: 'falso' })).status, 401);
  assert.equal((await ctx.call('GET', '/gateway/mfa/status', { token: ctx.tokenOf('agente@x.invalid') })).status, 200);
  assert.equal((await ctx.call('GET', '/gateway/mfa/nada', { token: ctx.tokenOf('agente@x.invalid') })).status, 404);
});

test('desactivar un método pide un código válido de un método activo', async () => {
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  const token = ctx.tokenOf('agente@x.invalid');
  const none = await ctx.call('DELETE', '/gateway/mfa/methods/totp', { token, body: { via: 'totp', code: '000000' } });
  assert.equal(none.status, 401);
  assert.equal((await ctx.call('GET', '/gateway/mfa/status', { token })).json.methods.totp.active, true);
  const ok = await ctx.call('DELETE', '/gateway/mfa/methods/totp', {
    token,
    body: { via: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(ok.status, 200);
  const status = await ctx.call('GET', '/gateway/mfa/status', { token });
  assert.equal(status.json.methods.totp.active, false);
  assert.equal(status.json.recoveryCodesLeft, 0, 'sin métodos no quedan códigos de recuperación');
  assert.equal((await ctx.login('agente@x.invalid')).json.accessToken, 'acc-u-agent', 'sin métodos, entra sin reto');
});

test('la política solo la cambian los administradores de su empresa y rechaza lo imposible', async () => {
  const policy = { methods: { email: true, sms: false, totp: true }, required: 'none', roles: [] };
  assert.equal(
    (await ctx.call('PUT', '/gateway/mfa/policy', { token: ctx.tokenOf('agente@x.invalid'), body: policy })).status,
    403
  );
  const admin = ctx.tokenOf('admin@x.invalid');
  assert.equal((await ctx.call('PUT', '/gateway/mfa/policy', { token: admin, body: policy })).status, 200);
  assert.equal((await ctx.call('GET', '/gateway/mfa/policy', { token: admin })).json.methods.sms, false);

  const none = await ctx.call('PUT', '/gateway/mfa/policy', {
    token: admin,
    body: { ...policy, methods: { email: false, sms: false, totp: false }, required: 'all' },
  });
  assert.equal(none.status, 400);
  assert.equal(none.json.code, 'NO_METHOD_ALLOWED');
  assert.equal(
    (await ctx.call('PUT', '/gateway/mfa/policy', { token: admin, body: { ...policy, required: 'roles', roles: [] } }))
      .status,
    400
  );
  assert.equal(
    (
      await ctx.call('PUT', '/gateway/mfa/policy', {
        token: admin,
        body: { ...policy, required: 'roles', roles: ['jefe'] },
      })
    ).status,
    400
  );
  assert.equal(
    (await ctx.call('PUT', '/gateway/mfa/policy', { token: admin, body: { ...policy, required: 'siempre' } })).status,
    400
  );

  assert.equal(
    (await ctx.call('GET', '/gateway/mfa/policy?tenantId=t2', { token: admin })).status,
    403,
    'otra empresa'
  );
  assert.equal(
    (await ctx.call('GET', '/gateway/mfa/policy?tenantId=t2', { token: ctx.tokenOf('super@x.invalid') })).status,
    200
  );
  assert.equal(
    (await ctx.call('GET', '/gateway/mfa/policy', { token: ctx.tokenOf('otra@x.invalid') })).json.methods.sms,
    true,
    'la otra empresa no heredó nada'
  );
});

test('un método desactivado por la empresa no se ofrece en el login ni se puede activar, pero se conserva', async () => {
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  const admin = ctx.tokenOf('admin@x.invalid');
  await ctx.call('PUT', '/gateway/mfa/policy', {
    token: admin,
    body: { methods: { email: true, sms: true, totp: false }, required: 'none', roles: [] },
  });
  assert.equal(
    (await ctx.login('agente@x.invalid')).json.accessToken,
    'acc-u-agent',
    'sin métodos permitidos entra sin reto'
  );
  const setup = await ctx.call('POST', '/gateway/mfa/totp/setup', { token: ctx.tokenOf('agente@x.invalid') });
  assert.equal(setup.status, 403, 'la empresa no permite activarlo');
  assert.equal(ctx.store.getFactor('u-agent', 'totp').verified, true, 'el factor guardado se conserva');
  await ctx.call('PUT', '/gateway/mfa/policy', {
    token: admin,
    body: { methods: { email: true, sms: true, totp: true }, required: 'none', roles: [] },
  });
  const r = await ctx.login('agente@x.invalid');
  assert.equal(r.json.mfaRequired, true, 'al reactivarlo vuelve a pedirse');
  const ok = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: r.json.challengeId, method: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(ok.status, 200);
});

test('con el 2FA obligatorio y sin métodos el login exige activar uno antes de dar la sesión', async () => {
  const admin = ctx.tokenOf('admin@x.invalid');
  await ctx.call('PUT', '/gateway/mfa/policy', {
    token: admin,
    body: { methods: { email: true, sms: true, totp: true }, required: 'roles', roles: ['agent'] },
  });
  assert.equal(
    (await ctx.login('admin@x.invalid')).json.accessToken,
    'acc-u-admin',
    'el rol no obligado entra directo'
  );

  const r = await ctx.login('agente@x.invalid');
  assert.equal(r.json.mfaEnrollRequired, true);
  assert.equal(r.json.accessToken, undefined);
  assert.deepEqual(r.json.methods, ['email', 'sms', 'totp']);
  const early = await ctx.call('POST', '/gateway/mfa/login/complete', { body: { challengeId: r.json.challengeId } });
  assert.equal(early.status, 409);

  const s = await ctx.call('POST', '/gateway/mfa/totp/setup', { challenge: r.json.challengeId });
  assert.equal(s.status, 200);
  const c = await ctx.call('POST', '/gateway/mfa/totp/confirm', {
    challenge: r.json.challengeId,
    body: { code: totpAt(s.json.secret, ctx.now()) },
  });
  assert.equal(c.json.recoveryCodes.length, 10);
  const done = await ctx.call('POST', '/gateway/mfa/login/complete', { body: { challengeId: r.json.challengeId } });
  assert.equal(done.status, 200);
  assert.equal(done.json.accessToken, 'acc-u-agent');
  assert.equal(
    (await ctx.call('POST', '/gateway/mfa/login/complete', { body: { challengeId: r.json.challengeId } })).status,
    401
  );
  // un reto de verificación no sirve para gestionar métodos sin sesión
  const verifyChallenge = await ctx.login('agente@x.invalid');
  assert.equal(
    (await ctx.call('POST', '/gateway/mfa/totp/setup', { challenge: verifyChallenge.json.challengeId })).status,
    401
  );
});

test('con el 2FA obligatorio no se puede quitar el último método', async () => {
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  await ctx.call('PUT', '/gateway/mfa/policy', {
    token: ctx.tokenOf('admin@x.invalid'),
    body: { methods: { email: true, sms: true, totp: true }, required: 'all', roles: [] },
  });
  const last = await ctx.call('DELETE', '/gateway/mfa/methods/totp', {
    token: ctx.tokenOf('agente@x.invalid'),
    body: { via: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(last.status, 409);
  assert.equal(last.json.code, 'LAST_METHOD');
});

test('un administrador restablece el 2FA de alguien de su empresa y no el de otra', async () => {
  await ctx.enableTotp('agente@x.invalid');
  await ctx.enableTotp('otra@x.invalid');
  assert.equal(
    (await ctx.call('POST', '/gateway/mfa/users/u-agent/reset', { token: ctx.tokenOf('agente@x.invalid') })).status,
    403,
    'un agente no puede'
  );
  const admin = ctx.tokenOf('admin@x.invalid');
  assert.deepEqual((await ctx.call('GET', '/gateway/mfa/users', { token: admin })).json.userIds, ['u-agent']);
  assert.equal(
    (await ctx.call('POST', '/gateway/mfa/users/u-other/reset', { token: admin })).status,
    403,
    'otra empresa'
  );
  assert.equal((await ctx.call('POST', '/gateway/mfa/users/nadie/reset', { token: admin })).status, 404);
  assert.equal((await ctx.call('POST', '/gateway/mfa/users/u-agent/reset', { token: admin })).status, 200);
  assert.equal((await ctx.login('agente@x.invalid')).json.accessToken, 'acc-u-agent', 'ya no pide reto');
  assert.equal(ctx.store.getFactors('u-other').length, 1, 'la otra empresa sigue igual');
  assert.equal(
    (await ctx.call('POST', '/gateway/mfa/users/u-other/reset', { token: ctx.tokenOf('super@x.invalid') })).status,
    200,
    'super_admin sí'
  );
});

test('los secretos no llegan a las respuestas de estado ni a las del reto', async () => {
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  const status = await ctx.call('GET', '/gateway/mfa/status', { token: ctx.tokenOf('agente@x.invalid') });
  assert.ok(!status.text.includes(secret));
  const r = await ctx.login('agente@x.invalid');
  assert.ok(!r.text.includes(secret));
  const stored = ctx.store.getFactor('u-agent', 'totp');
  assert.ok(!stored.secretEnc.includes(secret), 'en el almacén el secreto va cifrado');
});

test('sin MFA_SECRET_KEY el módulo queda apagado: /gateway/mfa responde 503 y el login no se intercepta', async () => {
  const off = createMfa({ GATEWAY_URL: 'http://127.0.0.1:1', GATEWAY_API_KEY: 'k' });
  assert.equal(off.enabled, false);
  const app = express();
  off.mount(app);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  cleanups.push(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const res = await fetch(base + '/gateway/mfa/status');
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'MFA_DISABLED');
  assert.equal(
    (await fetch(base + '/gateway/auth/login', { method: 'POST' })).status,
    404,
    'sin ruta propia: lo reenvía el proxy'
  );
});

test('un método ya verificado no se pisa con una activación nueva: se desactiva antes, con un código', async () => {
  const token = ctx.tokenOf('agente@x.invalid');
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  await ctx.call('POST', '/gateway/mfa/sms/setup', { token, body: { phone: '+573001234567' } });
  await ctx.call('POST', '/gateway/mfa/sms/confirm', { token, body: { code: ctx.lastCode() } });
  await ctx.call('POST', '/gateway/mfa/email/setup', { token });
  await ctx.call('POST', '/gateway/mfa/email/confirm', { token, body: { code: ctx.lastCode() } });

  const sentBefore = ctx.sent.length;
  for (const [path, body] of [
    ['/gateway/mfa/sms/setup', { phone: '+573009999999' }],
    ['/gateway/mfa/email/setup', undefined],
    ['/gateway/mfa/totp/setup', undefined],
  ]) {
    const res = await ctx.call('POST', path, { token, body });
    assert.equal(res.status, 409, path);
    assert.equal(res.json.code, 'ALREADY_ACTIVE', path);
  }
  assert.equal(ctx.sent.length, sentBefore, 'no se envió ningún código');
  for (const type of ['sms', 'email', 'totp']) {
    assert.equal(ctx.store.getFactor('u-agent', type).verified, true, `${type} sigue verificado`);
  }
  assert.equal(ctx.store.getFactor('u-agent', 'sms').destination, '+573001234567', 'el teléfono no cambió');
  const r = await ctx.login('agente@x.invalid');
  assert.equal(r.json.mfaRequired, true, 'el segundo factor sigue exigiéndose');

  // Cambiar el teléfono: primero se desactiva con un código y luego se activa el nuevo
  const off = await ctx.call('DELETE', '/gateway/mfa/methods/sms', {
    token,
    body: { via: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(off.status, 200);
  assert.equal(
    (await ctx.call('POST', '/gateway/mfa/sms/setup', { token, body: { phone: '+573009999999' } })).status,
    200
  );
});

test('el reto de activación no es una sesión: no sirve para la política, los restablecimientos ni las bajas', async () => {
  const admin = ctx.tokenOf('admin@x.invalid');
  // la empresa lo exige a los administradores y este aún no tiene ningún método
  await ctx.call('PUT', '/gateway/mfa/policy', {
    token: admin,
    body: { methods: { email: true, sms: true, totp: true }, required: 'roles', roles: ['tenant_admin'] },
  });
  const r = await ctx.login('admin@x.invalid');
  assert.equal(r.json.mfaEnrollRequired, true);
  const challenge = r.json.challengeId;

  const none = { methods: { email: true, sms: true, totp: true }, required: 'none', roles: [] };
  const attempts = [
    ['PUT', '/gateway/mfa/policy', { body: none }],
    ['GET', '/gateway/mfa/policy', {}],
    ['GET', '/gateway/mfa/users', {}],
    ['POST', '/gateway/mfa/users/u-agent/reset', {}],
    ['POST', '/gateway/mfa/session/send', { body: { via: 'email' } }],
    ['POST', '/gateway/mfa/recovery-codes/regenerate', { body: { via: 'recovery', code: 'AAAAA-AAAAA' } }],
    ['DELETE', '/gateway/mfa/methods/totp', { body: { via: 'recovery', code: 'AAAAA-AAAAA' } }],
  ];
  for (const [method, path, opts] of attempts) {
    const res = await ctx.call(method, path, { ...opts, challenge });
    assert.equal(res.status, 403, `${method} ${path}`);
    assert.equal(res.json.code, 'FORBIDDEN', `${method} ${path}`);
  }
  // la política sigue exigiendo el segundo factor y el reto sigue valiendo para activar un método
  assert.equal(ctx.store.getPolicy(T1).required, 'roles');
  assert.equal((await ctx.call('GET', '/gateway/mfa/status', { challenge })).status, 200);
  assert.equal((await ctx.call('POST', '/gateway/mfa/totp/setup', { challenge })).status, 200);
});

test('los códigos erróneos se cuentan por persona: abrir retos nuevos no da intentos nuevos', async () => {
  const { secret } = await ctx.enableTotp('agente@x.invalid');
  const wrong = (challengeId) =>
    ctx.call('POST', '/gateway/mfa/login/verify', { body: { challengeId, method: 'totp', code: '000000' } });

  // 10 fallos repartidos en dos retos (cada uno agota sus 5 intentos, pero además suman por persona)
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await ctx.login('agente@x.invalid');
    for (let i = 0; i < 5; i++) await wrong(r.json.challengeId);
  }
  const blocked = await ctx.login('agente@x.invalid');
  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.code, 'TOO_MANY_FAILURES');
  assert.equal(blocked.json.accessToken, undefined);
  assert.equal(blocked.json.challengeId, undefined, 'no se abre ningún reto nuevo');
  assert.ok(blocked.json.retryAfterSeconds > 0);

  // el bloqueo no es de un solo canal: tampoco deja confirmar con el código bueno desde la sesión
  const session = ctx.tokenOf('agente@x.invalid');
  const viaSession = await ctx.call('DELETE', '/gateway/mfa/methods/totp', {
    token: session,
    body: { via: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(viaSession.status, 429);
  assert.equal(ctx.store.getFactor('u-agent', 'totp').verified, true);

  // otra persona no se ve afectada, y pasada la ventana la persona vuelve a poder entrar
  assert.equal((await ctx.login('admin@x.invalid')).status, 200);
  ctx.tick(15 * 60 * 1000 + 1);
  const again = await ctx.login('agente@x.invalid');
  assert.equal(again.json.mfaRequired, true);
  const ok = await ctx.call('POST', '/gateway/mfa/login/verify', {
    body: { challengeId: again.json.challengeId, method: 'totp', code: totpAt(secret, ctx.now()) },
  });
  assert.equal(ok.status, 200);
});

test('un código por correo se descarta tras 5 intentos erróneos: hay que pedir otro', async () => {
  const token = ctx.tokenOf('agente@x.invalid');
  await ctx.call('POST', '/gateway/mfa/email/setup', { token });
  const real = ctx.lastCode();
  for (let i = 0; i < 5; i++) {
    const res = await ctx.call('POST', '/gateway/mfa/email/confirm', {
      token,
      body: { code: real === '000000' ? '111111' : '000000' },
    });
    assert.equal(res.status, 401);
  }
  const late = await ctx.call('POST', '/gateway/mfa/email/confirm', { token, body: { code: real } });
  assert.equal(late.status, 401, 'el código bueno ya no vale tras 5 intentos fallidos');
  assert.equal(ctx.store.getFactor('u-agent', 'email').verified, false);
  // pidiendo otro, se puede activar
  await ctx.call('POST', '/gateway/mfa/email/setup', { token });
  assert.equal(
    (await ctx.call('POST', '/gateway/mfa/email/confirm', { token, body: { code: ctx.lastCode() } })).status,
    200
  );
});
