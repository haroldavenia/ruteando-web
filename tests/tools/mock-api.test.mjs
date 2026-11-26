/** Robustez del mock-api y de las sondas (FND-001, hallazgos del contendiente 2026-11-25). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockApi } from '../mock-api/server.mjs';
import { sanitize } from './capture-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const auth = { authorization: 'Bearer t', 'content-type': 'application/json' };
let base;
let mock;

before(async () => {
  mock = createMockApi();
  await new Promise((r) => mock.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${mock.server.address().port}/api/v1`;
});
after(() => new Promise((r) => mock.server.close(r)));

test('[FND-001 CA-3] GET por id: 404 si no existe, si está mal formado o tras borrarlo; las subrutas usan su fixture', async () => {
  const created = await (await fetch(`${base}/places`, { method: 'POST', headers: auth, body: '{"name":"Bodega"}' })).json();
  assert.equal((await fetch(`${base}/places/${created.id}`, { headers: auth })).status, 200);
  assert.equal((await fetch(`${base}/places/${created.id}`, { method: 'DELETE', headers: auth })).status, 204);
  const gone = await fetch(`${base}/places/${created.id}`, { headers: auth });
  assert.equal(gone.status, 404);
  assert.equal((await gone.json()).error, 'NOT_FOUND');
  assert.equal((await fetch(`${base}/places/id-mal-formado-$$`, { headers: auth })).status, 404);
  assert.equal((await fetch(`${base}/places/nearby?lon=-74&lat=4.6`, { headers: auth })).status, 200);
});

test('[FND-001 CA-3] /auth/me y /auth/change-password exigen Bearer; login y OTP son públicos', async () => {
  assert.equal((await fetch(`${base}/auth/me`)).status, 401);
  assert.equal((await fetch(`${base}/auth/change-password`, { method: 'PUT' })).status, 401);
  assert.notEqual((await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401);
  assert.notEqual((await fetch(`${base}/notifications/otp/send`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401);
});

test('[FND-001 CA-3] peticiones mal formadas responden 400 sin tumbar el mock; sin lote en paquetes', async () => {
  const bad = await fetch(`${base}/places/batch-delete`, { method: 'POST', headers: auth, body: '{"ids":"no-es-array"}' });
  assert.equal(bad.status, 400);
  assert.equal((await fetch(`${base}/packages/status`, { method: 'PATCH', headers: auth, body: '{"ids":"x","status":"attended"}' })).status, 400);
  assert.equal((await fetch(`${base}/places`, { method: 'POST', headers: auth, body: '["hola"]' })).status, 400);
  assert.equal((await fetch(`${base}/packages/batch-delete`, { method: 'POST', headers: auth, body: '{"ids":["a"]}' })).status, 404);
  assert.equal((await fetch(`${base}/zones/batch-delete`, { method: 'POST', headers: auth, body: '{"ids":["a"]}' })).status, 404);
  assert.equal((await fetch(`${base}/places?page=0&size=20`, { headers: auth })).status, 200); // sigue vivo
});

test('[FND-001 CA-4] x-mock-scenario fuera de 400–599 responde 400 y el mock sigue vivo', async () => {
  const r = await fetch(`${base}/places`, { headers: { ...auth, 'x-mock-scenario': '1000' } });
  assert.equal(r.status, 400);
  assert.equal((await fetch(`${base}/places`, { headers: { ...auth, 'x-mock-scenario': 'abc' } })).status, 400);
  const c = await fetch(`${base}/places`, { method: 'POST', headers: { ...auth, 'x-mock-scenario': '409' }, body: '{}' });
  assert.equal(c.status, 409);
  assert.equal((await c.json()).error, 'CONFLICT');
});

test('[FND-001 CA-2] capture-fixture anonimiza nombres de persona sin tocar nombres de lugares', () => {
  const out = sanitize({ inviterName: 'Harold Real', name: 'Bodega Norte', receiver: { name: 'Ana Real', phone: '+573001112233' }, sender: { name: 'Luis Real' } });
  assert.equal(out.inviterName, 'Persona ficticia');
  assert.equal(out.receiver.name, 'Persona ficticia');
  assert.equal(out.sender.name, 'Persona ficticia');
  assert.equal(out.receiver.phone, '+570000000000');
  assert.equal(out.name, 'Bodega Norte');
});

test('[FND-001 CA-6] con BACKEND_URL https y sin el PEM, las sondas se omiten con motivo (no fallan al cargar)', () => {
  const env = { ...process.env, BACKEND_URL: 'https://localhost:8443', BACKEND_CA_FILE: 'config/certs/no-existe.pem', SDD_NO_ENV_FILE: '1' };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/api/arnes-de-pruebas.api.test.mjs'], { cwd: root, encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /# SKIP BACKEND_CA_FILE no existe/);
  assert.match(r.stdout, /# fail 0/);
});
