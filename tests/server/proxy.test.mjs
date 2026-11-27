/** Proxy del mismo origen y servidor web (FND-002), sobre mock-api (FND-001). */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';
import { startStack, listen, shut } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { createApp } = require('../../server/app.js');
const { createProxy, errorBody } = require('../../server/proxy.js');
const auth = { authorization: 'Bearer prueba' };

describe('proxy /api/v1 → BACKEND_URL', () => {
  let stack;
  before(async () => { stack = await startStack({ BACKEND_API_KEY: 'clave-ficticia' }); });
  after(() => stack.close());

  test('[FND-001 CA-3] mock-api sirve páginas con Bearer y 401 sin Bearer', async () => {
    const ok = await fetch(`${stack.mockUrl}/api/v1/places?page=0&size=20`, { headers: auth });
    assert.equal(ok.status, 200);
    const page = await ok.json();
    assert.deepEqual(Object.keys(page).sort(), ['content', 'page', 'size', 'totalElements', 'totalPages']);
    const denied = await fetch(`${stack.mockUrl}/api/v1/places?page=0&size=20`);
    assert.equal(denied.status, 401);
    assert.equal((await denied.json()).error, 'UNAUTHORIZED');
  });

  test('[FND-001 CA-4] x-mock-scenario: 409 responde CONFLICT con el formato del backend', async () => {
    const res = await fetch(`${stack.mockUrl}/api/v1/places`, { method: 'POST', headers: { ...auth, 'x-mock-scenario': '409', 'content-type': 'application/json' }, body: '{}' });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error, 'CONFLICT');
    assert.equal(body.path, '/api/v1/places');
    const limited = await fetch(`${stack.mockUrl}/api/v1/places`, { headers: { ...auth, 'x-mock-scenario': '429' } });
    assert.equal(limited.headers.get('retry-after'), '30');
  });

  test('[FND-001 CA-3] mock-api hace CRUD en memoria y usa fixtures para el resto', async () => {
    const created = await (await fetch(`${stack.mockUrl}/api/v1/places`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Bodega E2E', type: 'warehouse' }) })).json();
    assert.equal(created.name, 'Bodega E2E');
    const read = await (await fetch(`${stack.mockUrl}/api/v1/places/${created.id}`, { headers: auth })).json();
    assert.equal(read.id, created.id);
    const put = await fetch(`${stack.mockUrl}/api/v1/places/${created.id}`, { method: 'PUT', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Renombrada' }) });
    assert.equal((await put.json()).name, 'Renombrada');
    assert.equal((await fetch(`${stack.mockUrl}/api/v1/places/${created.id}`, { method: 'DELETE', headers: auth })).status, 204);
    assert.equal((await fetch(`${stack.mockUrl}/api/v1/places/${created.id}`, { method: 'DELETE', headers: auth })).status, 404);
    assert.equal((await fetch(`${stack.mockUrl}/api/v1/places/nope`, { method: 'PUT', headers: auth })).status, 404);
    const zones = await (await fetch(`${stack.mockUrl}/api/v1/zones`, { headers: auth })).json();
    assert.ok(Array.isArray(zones));
    const domains = await fetch(`${stack.mockUrl}/api/v1/master-domains/PackageStatus/values`, { headers: auth });
    assert.equal(domains.status, 200);
    const login = await fetch(`${stack.mockUrl}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"email":"a@b.c"}' });
    assert.equal((await login.json()).accessToken, 'acceso-ficticio');
    assert.equal((await fetch(`${stack.mockUrl}/api/v1/nada/x/y/z`, { headers: auth })).status, 404);
    assert.equal((await fetch(`${stack.mockUrl}/otra`, { headers: auth })).status, 404);
    assert.equal((await fetch(`${stack.mockUrl}/api/v1/places`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: '{malo' })).status, 400);
  });

  test('[FND-002 CA-2] reenvía sin Origin, con X-Api-Key y Bearer intactos', async () => {
    const res = await fetch(`${stack.webUrl}/api/v1/places?page=0&size=20`, { headers: { ...auth, origin: 'http://evil.example', cookie: 'a=b' } });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).page, 0);
    const seen = (await (await fetch(`${stack.mockUrl}/__mock/requests`)).json()).at(-1);
    assert.equal(seen.path, '/api/v1/places?page=0&size=20');
    assert.equal(seen.headers.origin, undefined);
    assert.equal(seen.headers.cookie, undefined);
    assert.equal(seen.headers['x-api-key'], 'clave-ficticia');
    assert.equal(seen.headers.authorization, 'Bearer prueba');
  });

  test('[FND-002 CA-3] un multipart de 1 MB llega íntegro (streaming)', async () => {
    const payload = Buffer.alloc(1024 * 1024, 7);
    const form = new FormData();
    form.append('file', new Blob([payload]), 'paquetes.csv');
    const res = await fetch(`${stack.webUrl}/api/v1/packages/upload`, { method: 'POST', headers: auth, body: form });
    assert.ok([200, 201, 404].includes(res.status));
    const seen = (await (await fetch(`${stack.mockUrl}/__mock/requests`)).json()).at(-1);
    assert.ok(seen.size > payload.length, `recibidos ${seen.size} bytes`);
    assert.match(seen.headers['content-type'], /^multipart\/form-data; boundary=/);
  });
});

describe('errores del proxy', () => {
  test('[FND-002 CA-4] sin BACKEND_URL responde 503 SERVICE_UNAVAILABLE', async () => {
    const { server, url } = await listen(createApp({}));
    const res = await fetch(`${url}/api/v1/places`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error, 'SERVICE_UNAVAILABLE');
    assert.equal(body.path, '/api/v1/places');
    const health = await (await fetch(`${url}/healthz`)).json();
    assert.equal(health.backend, 'missing');
    await shut(server);
  });

  test('[FND-002 CA-5] backend lento → 504; backend caído → 502', async () => {
    const stack = await startStack({ BACKEND_TIMEOUT_MS: '150' });
    const slow = await fetch(`${stack.webUrl}/api/v1/places`, { headers: { ...auth, 'x-mock-delay': '600' } });
    assert.equal(slow.status, 504);
    assert.equal((await slow.json()).error, 'GATEWAY_TIMEOUT');
    await stack.close();

    const { server, url } = await listen(createApp({ BACKEND_URL: 'http://127.0.0.1:1' }));
    const down = await fetch(`${url}/api/v1/places`);
    assert.equal(down.status, 502);
    assert.equal((await down.json()).error, 'BAD_GATEWAY');
    await shut(server);
  });

  test('[FND-002 CA-15] POST /journeys/plan usa BACKEND_PLAN_TIMEOUT_MS; el resto el general', async () => {
    const stack = await startStack({ BACKEND_TIMEOUT_MS: '150', BACKEND_PLAN_TIMEOUT_MS: '2000' });
    const plan = await fetch(`${stack.webUrl}/api/v1/journeys/plan`, { method: 'POST', headers: { ...auth, 'x-mock-delay': '500', 'content-type': 'application/json' }, body: '{}' });
    assert.notEqual(plan.status, 504);
    const other = await fetch(`${stack.webUrl}/api/v1/journeys`, { headers: { ...auth, 'x-mock-delay': '500' } });
    assert.equal(other.status, 504);
    await stack.close();
  });

  test('[FND-002 CA-15] sin BACKEND_PLAN_TIMEOUT_MS el plan corta a los 240 000 ms y el resto a los 60 000 ms', async (t) => {
    // Backend que acepta la petición y nunca responde; reloj simulado para no esperar 240 s.
    const backend = http.createServer(() => {});
    const b = await listen(backend);
    try {
      t.mock.timers.enable({ apis: ['setTimeout'] });
      const env = { BACKEND_URL: b.url }; // BACKEND_TIMEOUT_MS y BACKEND_PLAN_TIMEOUT_MS sin definir
      const proxy = createProxy({ backendUrl: env.BACKEND_URL, timeoutMs: env.BACKEND_TIMEOUT_MS, planTimeoutMs: env.BACKEND_PLAN_TIMEOUT_MS });
      const call = (method, url) => {
        const req = new PassThrough();
        Object.assign(req, { method, url, originalUrl: url, headers: { 'content-type': 'application/json' } });
        req.end();
        const res = { status: null, body: null, writeHead(s) { this.status = s; }, end(b2) { this.body = b2; }, destroy() {} };
        proxy(req, res);
        return res;
      };
      const plan = call('POST', '/api/v1/journeys/plan');
      const other = call('GET', '/api/v1/journeys');
      t.mock.timers.tick(59999);
      assert.equal(other.status, null);
      t.mock.timers.tick(1);
      assert.equal(other.status, 504);
      assert.match(JSON.parse(other.body).message, /60000 ms/);
      t.mock.timers.tick(239999 - 60000);
      assert.equal(plan.status, null, 'el plan no debe cortarse antes de 240 000 ms');
      t.mock.timers.tick(1);
      assert.equal(plan.status, 504);
      assert.equal(JSON.parse(plan.body).error, 'GATEWAY_TIMEOUT');
      assert.match(JSON.parse(plan.body).message, /240000 ms/);
    } finally {
      t.mock.timers.reset();
      await shut(b.server);
    }
  });

  test('[FND-002 CA-5] si el backend corta tras enviar cabeceras se cierra la conexión', async () => {
    const backend = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.write('{"a":'); setTimeout(() => res.destroy(), 20); });
    const b = await listen(backend);
    const { server, url } = await listen(createApp({ BACKEND_URL: b.url + '/' }));
    await assert.rejects(async () => { const r = await fetch(`${url}/api/v1/x`); await r.text(); });
    await shut(server);
    await shut(b.server);
  });

  test('[FND-002 CA-4] errorBody y createProxy usan el formato del backend y la ruta base del destino', async () => {
    const body = JSON.parse(errorBody(504, 'GATEWAY_TIMEOUT', 'm', '/api/v1/x'));
    assert.deepEqual(Object.keys(body), ['error', 'message', 'timestamp', 'path', 'details']);
    const backend = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/plain', connection: 'close' }); res.end(req.url); });
    const b = await listen(backend);
    const proxy = createProxy({ backendUrl: `${b.url}/base/` });
    const front = http.createServer((req, res) => proxy(req, res));
    const f = await listen(front);
    assert.equal(await (await fetch(`${f.url}/api/v1/units`)).text(), '/base/api/v1/units');
    await shut(f.server);
    await shut(b.server);
  });
});

describe('redirecciones de correo y estáticos', () => {
  test('[FND-002 CA-14] /verify-email y /reset-password redirigen a la SPA conservando el token', async () => {
    const { server, url } = await listen(createApp({ BACKEND_URL: 'http://127.0.0.1:1' }));
    const verify = await fetch(`${url}/verify-email?token=abc`, { redirect: 'manual' });
    assert.equal(verify.status, 302);
    assert.equal(verify.headers.get('location'), '/#/access/verify?token=abc');
    const reset = await fetch(`${url}/reset-password?token=x%2Fy`, { redirect: 'manual' });
    assert.equal(reset.headers.get('location'), '/#/access/reset?token=x%2Fy');
    const invite = await fetch(`${url}/invitations/accept`, { redirect: 'manual' });
    assert.equal(invite.headers.get('location'), '/#/access/invitation');
    const post = await fetch(`${url}/verify-email`, { method: 'POST', redirect: 'manual' });
    assert.equal(post.status, 404);
    const index = await fetch(`${url}/`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /data-ng-app="angle"/);
    await shut(server);
  });
});

describe('mock-api: lotes y búsqueda (contrato 2026-11-23)', () => {
  let stack;
  before(async () => { stack = await startStack(); });
  after(() => stack.close());
  const json = { ...auth, 'content-type': 'application/json' };

  test('[FND-002 CA-17] POST /{recurso}/batch-delete devuelve un resultado por id y 422 con más de 100', async () => {
    const created = await (await fetch(`${stack.mockUrl}/api/v1/places`, { method: 'POST', headers: json, body: '{"name":"Lote"}' })).json();
    const res = await fetch(`${stack.webUrl}/api/v1/places/batch-delete`, { method: 'POST', headers: { ...json, 'x-mock-conflict-ids': 'c1' }, body: JSON.stringify({ ids: [created.id, 'nope', 'c1'] }) });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).results.map((r) => r.status), ['deleted', 'not_found', 'conflict']);
    const many = await fetch(`${stack.webUrl}/api/v1/places/batch-delete`, { method: 'POST', headers: json, body: JSON.stringify({ ids: Array.from({ length: 101 }, (_, i) => `x${i}`) }) });
    assert.equal(many.status, 422);
  });

  test('[FND-002 CA-17] PATCH /packages/status y GET /packages?q= se simulan como en el contrato', async () => {
    const pkg = await (await fetch(`${stack.mockUrl}/api/v1/packages`, { method: 'POST', headers: json, body: '{"guideNumber":"G01-XYZ","name":"Tienda"}' })).json();
    const r = await (await fetch(`${stack.webUrl}/api/v1/packages/status`, { method: 'PATCH', headers: json, body: JSON.stringify({ ids: [pkg.id, 'nope'], status: 'unattended', reason: 'customer_absent' }) })).json();
    assert.deepEqual(r.results.map((x) => x.status), ['updated', 'not_found']);
    assert.equal((await fetch(`${stack.webUrl}/api/v1/packages/status`, { method: 'PATCH', headers: json, body: '{"ids":["a"]}' })).status, 422);
    const found = await (await fetch(`${stack.webUrl}/api/v1/packages?q=g01`, { headers: auth })).json();
    assert.ok(found.content.some((p) => p.id === pkg.id && p.status === 'unattended'));
    assert.equal((await fetch(`${stack.webUrl}/api/v1/packages?q=${'a'.repeat(81)}`, { headers: auth })).status, 422);
  });
});
