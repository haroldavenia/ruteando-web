// Pruebas de GATEWAY_MODE: el selector (gateway-mode.js) y el servidor real arrancado en modo mock.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { gatewayConfig } = require('../gateway-mode');
const { freePort, startServer } = require('./helpers');

test('sin GATEWAY_MODE o con real usa GATEWAY_URL y la clave del entorno', () => {
  const env = { GATEWAY_URL: 'https://gw.example.invalid///', GATEWAY_API_KEY: 'k' };
  assert.deepEqual(gatewayConfig(env), { mode: 'real', target: 'https://gw.example.invalid', apiKey: 'k' });
  assert.equal(gatewayConfig({ ...env, GATEWAY_MODE: ' REAL ' }).mode, 'real');
});

test('mock apunta al simulado local con clave ficticia, nunca con la real', () => {
  const env = { GATEWAY_MODE: 'mock', GATEWAY_URL: 'https://gw.example.invalid', GATEWAY_API_KEY: 'secreta' };
  assert.deepEqual(gatewayConfig(env), { mode: 'mock', target: 'http://127.0.0.1:4010', apiKey: 'mock' });
  assert.equal(gatewayConfig({ ...env, MOCK_GATEWAY_PORT: '4999' }).target, 'http://127.0.0.1:4999');
});

test('un GATEWAY_MODE desconocido se marca como inválido en vez de adivinar', () => {
  assert.equal(gatewayConfig({ GATEWAY_MODE: 'demo' }).invalid, true);
});

const servers = [];
after(() => servers.forEach((s) => s.child.kill()));

async function login(base, password) {
  return fetch(base + '/gateway/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.invalid', password }),
  });
}

test('el servidor en modo mock arranca el simulado y responde por /gateway, sin clave real', async () => {
  const server = await startServer({
    env: {
      GATEWAY_MODE: 'mock',
      GATEWAY_URL: undefined,
      GATEWAY_API_KEY: undefined,
      MOCK_GATEWAY_PORT: String(await freePort()),
      MOCK_GATEWAY_LATENCY_MS: '0',
      MOCK_GATEWAY_PASSWORD: 'contrasena-de-prueba-xyz',
    },
  });
  servers.push(server);

  let response;
  for (let attempt = 0; attempt < 30; attempt++) {
    response = await login(server.base, 'contrasena-de-prueba-xyz');
    if (response.status !== 502) break; // 502: el simulado aún está arrancando
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(response.status, 200);
  assert.ok((await response.json()).accessToken);
  assert.equal(
    (await login(server.base, 'demo1234')).status,
    401,
    'con MOCK_GATEWAY_PASSWORD la contraseña por defecto no sirve'
  );

  const log = server.log();
  assert.match(log, /MODO MOCK/);
  assert.ok(!log.includes('contrasena-de-prueba-xyz'), 'la contraseña no se escribe en el registro');
});

test('un GATEWAY_MODE inválido deja /gateway en 503 con aviso', async () => {
  const server = await startServer({ env: { GATEWAY_MODE: 'demo' } });
  servers.push(server);
  const response = await fetch(server.base + '/gateway/packages');
  assert.equal(response.status, 503);
  assert.match(server.log(), /GATEWAY_MODE debe ser/);
});
