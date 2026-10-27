// Pruebas del proxy del gateway: se arranca server/server.js de verdad apuntando a un gateway
// falso local que registra lo que recibe. No necesitan MongoDB ni red.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { freePort, startServer } = require('./helpers');

const API_KEY = 'clave-secreta-de-prueba-0123456789';
const TOKEN = 'token-secreto-de-prueba-abcdef';
const MARKER = '<app-root>ruteando-prueba</app-root>';

let fakeGateway;
let received;
let tmpDir;
let proxied; // servidor con gateway falso configurado
let slow; // servidor con tiempo de espera corto
let unreachable; // servidor cuyo gateway no acepta conexiones
let unconfigured; // servidor sin clave

function startFakeGateway() {
  received = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      received.push({ method: req.method, url: req.url, headers: req.headers, body });
      if (req.url.startsWith('/api/v1/slow')) {
        setTimeout(() => res.end('tarde'), 3000);
      } else if (req.url.startsWith('/api/v1/no-content')) {
        res.writeHead(204).end();
      } else if (req.url.startsWith('/api/v1/accepted')) {
        res.writeHead(202, { 'Content-Type': 'application/json' }).end('[]');
      } else if (req.url.startsWith('/api/v1/missing')) {
        res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ message: 'del gateway' }));
      } else if (req.url.startsWith('/api/v1/packages/upload')) {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(
          JSON.stringify({
            contentType: req.headers['content-type'],
            length: body.length,
            sha: crypto.createHash('sha256').update(body).digest('hex'),
          }),
        );
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(
          JSON.stringify({ method: req.method, url: req.url, contentType: req.headers['content-type'], body: body.toString() }),
        );
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruteando-gw-'));
  fs.writeFileSync(path.join(tmpDir, 'index.csr.html'), `<!doctype html><html><body>${MARKER}</body></html>`);
  fakeGateway = await startFakeGateway();
  const target = `http://127.0.0.1:${fakeGateway.address().port}`;
  const deadPort = await freePort();

  proxied = await startServer({ webDist: tmpDir, env: { GATEWAY_URL: target, GATEWAY_API_KEY: API_KEY } });
  slow = await startServer({
    webDist: tmpDir,
    env: { GATEWAY_URL: target, GATEWAY_API_KEY: API_KEY, GATEWAY_TIMEOUT_MS: '300' },
  });
  unreachable = await startServer({
    webDist: tmpDir,
    env: { GATEWAY_URL: `http://127.0.0.1:${deadPort}`, GATEWAY_API_KEY: API_KEY },
  });
  // Una cadena vacía cuenta como definida: el .env local (si existe) no la sustituye
  unconfigured = await startServer({ webDist: tmpDir, env: { GATEWAY_URL: target, GATEWAY_API_KEY: '' } });
});

after(() => {
  for (const s of [proxied, slow, unreachable, unconfigured]) {
    if (s) s.child.kill();
  }
  if (fakeGateway) fakeGateway.close();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

function lastRequest() {
  return received[received.length - 1];
}

test('reescribe /gateway a /api/v1 y conserva la consulta', async () => {
  const res = await fetch(proxied.base + '/gateway/places?page=0&size=20');
  assert.equal(res.status, 200);
  assert.equal(lastRequest().method, 'GET');
  assert.equal(lastRequest().url, '/api/v1/places?page=0&size=20');
});

test('reenvía un cuerpo JSON y su tipo de contenido', async () => {
  const payload = JSON.stringify({ email: 'a@example.invalid', password: 'x' });
  const res = await fetch(proxied.base + '/gateway/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  const echo = await res.json();
  assert.equal(echo.url, '/api/v1/auth/login');
  assert.equal(echo.method, 'POST');
  assert.equal(echo.contentType, 'application/json');
  assert.equal(echo.body, payload);
});

test('conserva los estados 204 y 202', async () => {
  const noContent = await fetch(proxied.base + '/gateway/no-content');
  assert.equal(noContent.status, 204);
  const accepted = await fetch(proxied.base + '/gateway/accepted');
  assert.equal(accepted.status, 202);
  assert.deepEqual(await accepted.json(), []);
});

test('inyecta X-Api-Key cuando el cliente no la envía', async () => {
  await fetch(proxied.base + '/gateway/places');
  assert.equal(lastRequest().headers['x-api-key'], API_KEY);
});

test('sustituye la X-Api-Key que envíe el cliente', async () => {
  await fetch(proxied.base + '/gateway/places', { headers: { 'X-Api-Key': 'clave-falsa-del-cliente' } });
  assert.equal(lastRequest().headers['x-api-key'], API_KEY);
  assert.ok(!JSON.stringify(lastRequest().headers).includes('clave-falsa-del-cliente'));
});

test('no reenvía el Origin del navegador (el gateway lo rechazaría con 403 por CORS)', async () => {
  await fetch(proxied.base + '/gateway/places', { headers: { Origin: 'http://localhost:3000' } });
  assert.equal(lastRequest().headers.origin, undefined);
  assert.equal(lastRequest().headers['x-api-key'], API_KEY);
});

test('reenvía Authorization sin modificarla', async () => {
  await fetch(proxied.base + '/gateway/auth/me', { headers: { Authorization: `Bearer ${TOKEN}` } });
  assert.equal(lastRequest().headers.authorization, `Bearer ${TOKEN}`);
});

test('la clave no aparece en las cabeceras ni en el cuerpo de la respuesta', async () => {
  const res = await fetch(proxied.base + '/gateway/places');
  const headers = JSON.stringify([...res.headers.entries()]);
  const body = await res.text();
  assert.ok(!headers.includes(API_KEY));
  assert.ok(!body.includes(API_KEY));
});

test('reenvía multipart íntegro, con su tipo de contenido y boundary', async () => {
  const boundary = '----ruteandoBoundary7MA4YWxkTrZu0gW';
  const file = Buffer.alloc(200000, 'a,b,c\n1,2,3\n');
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="paquetes.csv"\r\nContent-Type: text/csv\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await fetch(proxied.base + '/gateway/packages/upload', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
  const info = await res.json();
  assert.equal(info.contentType, `multipart/form-data; boundary=${boundary}`);
  assert.equal(info.length, body.length);
  assert.equal(info.sha, crypto.createHash('sha256').update(body).digest('hex'));
});

test('un 404 del gateway llega tal cual, no como la página de la aplicación', async () => {
  const res = await fetch(proxied.base + '/gateway/missing', { headers: { Accept: 'text/html' } });
  assert.equal(res.status, 404);
  const text = await res.text();
  assert.ok(!text.includes(MARKER));
  assert.deepEqual(JSON.parse(text), { message: 'del gateway' });
});

test('las rutas /api y /auth ya no existen: 404 en JSON y el proxy no las recibe', async () => {
  const before = received.length;
  const me = await fetch(proxied.base + '/api/me');
  assert.equal(me.status, 404);
  assert.match(me.headers.get('content-type'), /application\/json/);
  const login = await fetch(proxied.base + '/auth/login', { method: 'POST' });
  assert.equal(login.status, 404);
  assert.equal(received.length, before, 'el gateway falso no debe recibir estas peticiones');
});

test('gateway inaccesible: 502 en JSON sin dirección ni clave', async () => {
  const res = await fetch(unreachable.base + '/gateway/places');
  assert.equal(res.status, 502);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const text = await res.text();
  assert.ok((JSON.parse(text).message || '').length > 0);
  assert.ok(!text.includes('127.0.0.1') && !text.includes(API_KEY));
});

test('gateway lento: 504 en JSON de mensaje genérico', async () => {
  const res = await fetch(slow.base + '/gateway/slow');
  assert.equal(res.status, 504);
  const text = await res.text();
  assert.ok((JSON.parse(text).message || '').length > 0);
  assert.ok(!text.includes(API_KEY));
});

test('sin GATEWAY_API_KEY: arranca, avisa en el registro y responde 503', async () => {
  assert.match(unconfigured.log(), /GATEWAY_API_KEY/);
  const res = await fetch(unconfigured.base + '/gateway/places');
  assert.equal(res.status, 503);
  assert.match((await res.json()).message, /gateway/i);
});

test('los registros del servidor no contienen la clave ni los tokens', async () => {
  await fetch(proxied.base + '/gateway/auth/me?x=1', { headers: { Authorization: `Bearer ${TOKEN}` } });
  for (const server of [proxied, slow, unreachable, unconfigured]) {
    assert.ok(!server.log().includes(API_KEY), 'el registro contiene la clave');
    assert.ok(!server.log().includes(TOKEN), 'el registro contiene un token');
  }
});
