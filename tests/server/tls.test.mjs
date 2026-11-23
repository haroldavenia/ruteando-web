/** Proxy contra un backend HTTPS autofirmado (FND-002 CA-2, ADR-0002): confía solo en el PEM dado y verifica el nombre. */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import path from 'node:path';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { listen, shut } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { createApp, resolveCaFile } = require('../../server/app.js');
const { backendAgent } = require('../../server/proxy.js');

const dir = mkdtempSync(path.join(tmpdir(), 'tls-'));
const openssl = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
  '-addext', 'subjectAltName=DNS:localhost', '-keyout', path.join(dir, 'key.pem'), '-out', path.join(dir, 'cert.pem')], { encoding: 'utf8' });
const skip = openssl.status === 0 ? false : 'openssl no disponible para generar el certificado de prueba';

describe('backend HTTPS autofirmado', { skip }, () => {
  let backend;
  let port;
  before(async () => {
    backend = https.createServer({ key: readFileSync(path.join(dir, 'key.pem')), cert: readFileSync(path.join(dir, 'cert.pem')) },
      (req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ path: req.url })); });
    await new Promise((r) => backend.listen(0, '127.0.0.1', r));
    port = backend.address().port;
  });
  after(() => shut(backend));

  async function through(env) {
    const { server, url } = await listen(createApp(env));
    const res = await fetch(`${url}/api/v1/units`);
    const body = await res.json();
    await shut(server);
    return { status: res.status, body };
  }

  test('[FND-002 CA-2] con BACKEND_CA_FILE el proxy confía en el certificado del backend', async () => {
    const r = await through({ BACKEND_URL: `https://localhost:${port}`, BACKEND_CA_FILE: path.join(dir, 'cert.pem') });
    assert.equal(r.status, 200);
    assert.equal(r.body.path, '/api/v1/units');
  });

  test('[FND-002 CA-2] NODE_EXTRA_CA_CERTS leído desde .env también sirve (Node no lo aplica tras arrancar)', async () => {
    const r = await through({ BACKEND_URL: `https://localhost:${port}`, NODE_EXTRA_CA_CERTS: path.join(dir, 'cert.pem') });
    assert.equal(r.status, 200);
  });

  test('[FND-002 CA-5] sin el PEM, o llamando por un nombre que no está en el certificado, responde 502', async () => {
    const noCa = await through({ BACKEND_URL: `https://localhost:${port}` });
    assert.equal(noCa.status, 502);
    assert.equal(noCa.body.error, 'BAD_GATEWAY');
    const wrongName = await through({ BACKEND_URL: `https://127.0.0.1:${port}`, BACKEND_CA_FILE: path.join(dir, 'cert.pem') });
    assert.equal(wrongName.status, 502);
  });
});

test('[FND-002 CA-2] resolveCaFile prioriza BACKEND_CA_FILE y resuelve rutas relativas a la raíz', () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
  assert.equal(resolveCaFile({}), undefined);
  assert.equal(resolveCaFile({ BACKEND_CA_FILE: 'config/certs/hanoit-dev.pem', NODE_EXTRA_CA_CERTS: '/x.pem' }), path.join(root, 'config', 'certs', 'hanoit-dev.pem'));
  assert.equal(resolveCaFile({ NODE_EXTRA_CA_CERTS: path.join(root, 'a.pem') }), path.join(root, 'a.pem'));
});

test('[FND-002 CA-2] backendAgent rechaza archivos que no son PEM y acepta el certificado de hanoit', () => {
  const bad = path.join(dir, 'bad.pem');
  writeFileSync(bad, 'no es un certificado');
  assert.throws(() => backendAgent(bad), /no contiene un certificado PEM/);
  assert.equal(backendAgent(undefined), undefined);
  const agent = backendAgent(resolveCaFile({ BACKEND_CA_FILE: 'config/certs/hanoit-dev.pem' }));
  assert.ok(agent.options.ca.some((c) => c.includes('MIIDkjCCAnqgAwIBAgIJAMjw')));
});
