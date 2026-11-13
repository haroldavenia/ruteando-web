// El módulo de segundo factor dentro del servidor real (server/server.js) con el gateway simulado: orden de las rutas, apagado sin clave
// y el reto de punta a punta por el mismo camino que usa el navegador.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, startServer } = require('./helpers');
const { totpAt } = require('../mfa/totp');

const servers = [];
const dirs = [];
after(async () => {
  // En Windows el SQLite sigue bloqueado hasta que el proceso termina: se espera a que salgan antes de borrar sus carpetas
  await Promise.all(
    servers.map(
      (s) =>
        new Promise((resolve) => {
          if (s.child.exitCode !== null) return resolve();
          s.child.once('exit', resolve);
          s.child.kill();
        })
    )
  );
  dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
});

async function startMock(extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mfa-server-'));
  dirs.push(dir);
  const server = await startServer({
    env: {
      GATEWAY_MODE: 'mock',
      GATEWAY_URL: undefined,
      GATEWAY_API_KEY: undefined,
      MOCK_GATEWAY_PORT: String(await freePort()),
      MOCK_GATEWAY_LATENCY_MS: '0',
      MOCK_GATEWAY_PASSWORD: 'contrasena-de-prueba-xyz',
      MFA_DB_PATH: path.join(dir, 'mfa.sqlite'),
      MFA_SECRET_KEY: '', // vacío (no undefined): server.js carga el .env local y solo respeta lo ya definido
      SMTP_HOST: '',
      SMS_PROVIDER: '',
      ...extraEnv,
    },
  });
  servers.push(server);
  return server;
}

async function json(server, method, url, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  // 502: el simulado aún está arrancando
  for (let attempt = 0; attempt < 40; attempt++) {
    res = await fetch(server.base + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status !== 502) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const text = await res.text();
  return { status: res.status, text, json: text.startsWith('{') ? JSON.parse(text) : null };
}

const credentials = { email: 'agente@example.invalid', password: 'contrasena-de-prueba-xyz' };

test('sin MFA_SECRET_KEY: /gateway/mfa responde 503 en JSON, avisa en el registro y el login sigue su camino al gateway', async () => {
  const server = await startMock();
  const status = await json(server, 'GET', '/gateway/mfa/status');
  assert.equal(status.status, 503);
  assert.equal(status.json.code, 'MFA_DISABLED');
  const login = await json(server, 'POST', '/gateway/auth/login', { body: credentials });
  assert.equal(login.status, 200);
  assert.ok(login.json.accessToken);
  assert.match(server.log(), /Segundo factor desactivado/);
});

test('con la clave: /gateway/mfa existe, nunca devuelve la página de la aplicación y el resto de /gateway se reenvía', async () => {
  const server = await startMock({ MFA_SECRET_KEY: crypto.randomBytes(32).toString('base64') });
  assert.doesNotMatch(server.log(), /Segundo factor desactivado/);
  const noSession = await json(server, 'GET', '/gateway/mfa/status');
  assert.equal(noSession.status, 401);
  assert.equal(noSession.json.code, 'UNAUTHORIZED');
  const unknown = await json(server, 'GET', '/gateway/mfa/no-existe');
  assert.ok(unknown.json && [401, 404].includes(unknown.status));
  const login = await json(server, 'POST', '/gateway/auth/login', { body: credentials });
  assert.equal(login.status, 200, 'sin 2FA activo el login es la sesión del gateway');
  const me = await json(server, 'GET', '/gateway/auth/me', { token: login.json.accessToken });
  assert.equal(me.status, 200, 'el resto de /gateway sigue reenviándose');
  assert.equal(me.json.email, credentials.email);
  assert.equal(
    (await json(server, 'POST', '/gateway/auth/login', { body: { ...credentials, password: 'mala' } })).status,
    401
  );
});

test('con el 2FA activo, ninguna variante de la ruta del login llega al gateway (no se salta el segundo factor)', async () => {
  const server = await startMock({ MFA_SECRET_KEY: crypto.randomBytes(32).toString('base64') });
  for (const p of [
    '/gateway//auth/login',
    '/gateway/auth//login',
    '/gateway/auth/%6cogin',
    '/gateway/auth/login;x=1',
    '/gateway/auth%2Flogin',
  ]) {
    const res = await json(server, 'POST', p, { body: credentials });
    assert.equal(res.status, 404, p);
    assert.ok(!res.text.includes('accessToken'), p);
  }
  // La ruta exacta sigue siendo la del módulo y el resto de /auth no se toca
  assert.equal((await json(server, 'POST', '/gateway/auth/login', { body: credentials })).status, 200);
  assert.equal((await json(server, 'POST', '/gateway/auth/forgot-password', { body: credentials })).status, 200);
});

test('de punta a punta por el servidor real: activar TOTP y luego el login ya no entrega tokens hasta verificar', async () => {
  const server = await startMock({ MFA_SECRET_KEY: crypto.randomBytes(32).toString('base64') });
  const first = await json(server, 'POST', '/gateway/auth/login', { body: credentials });
  const token = first.json.accessToken;
  const setup = await json(server, 'POST', '/gateway/mfa/totp/setup', { token });
  assert.equal(setup.status, 200);
  const confirm = await json(server, 'POST', '/gateway/mfa/totp/confirm', {
    token,
    body: { code: totpAt(setup.json.secret, Date.now()) },
  });
  assert.equal(confirm.status, 200);
  assert.equal(confirm.json.recoveryCodes.length, 10);

  const second = await json(server, 'POST', '/gateway/auth/login', { body: credentials });
  assert.equal(second.json.mfaRequired, true);
  assert.equal(second.json.accessToken, undefined);
  assert.ok(
    !second.text.includes('mock-acceso-') && !second.text.includes('mock-refresco-'),
    'ningún token del gateway en el reto'
  );

  const bad = await json(server, 'POST', '/gateway/mfa/login/verify', {
    body: { challengeId: second.json.challengeId, method: 'recovery', code: 'AAAAA-AAAAA' },
  });
  assert.equal(bad.status, 401);
  const ok = await json(server, 'POST', '/gateway/mfa/login/verify', {
    body: { challengeId: second.json.challengeId, method: 'recovery', code: confirm.json.recoveryCodes[0] },
  });
  assert.equal(ok.status, 200);
  assert.match(ok.json.accessToken, /^mock-acceso-/);
  assert.equal(ok.json.mfa.recoveryCodesLeft, 9);

  const log = server.log();
  assert.ok(!log.includes(setup.json.secret), 'el secreto TOTP no se escribe en el registro');
  assert.ok(!log.includes(credentials.password), 'la contraseña no se escribe en el registro');
  assert.ok(!log.includes(confirm.json.recoveryCodes[0]), 'los códigos de recuperación no se escriben en el registro');
});
