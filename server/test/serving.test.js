// Pruebas de la publicación del frontend: arrancan server/server.js de verdad con un
// directorio de compilación temporal. No necesitan MongoDB (las rutas probadas no lo usan).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer } = require('./helpers');

const MARKER = '<app-root>ruteando-prueba</app-root>';

let tmpDir;
let withBuild;
let withoutBuild;

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruteando-web-'));
  const full = path.join(tmpDir, 'con-build');
  const empty = path.join(tmpDir, 'sin-build');
  fs.mkdirSync(full);
  fs.mkdirSync(empty);
  fs.writeFileSync(path.join(full, 'index.csr.html'), `<!doctype html><html><body>${MARKER}</body></html>`);
  fs.writeFileSync(path.join(full, 'app.js'), 'console.log("ok");');
  // El prerender de Angular deja una carpeta por ruta (acceso/index.html): no debe provocar redirecciones
  fs.mkdirSync(path.join(full, 'acceso'));
  fs.writeFileSync(path.join(full, 'acceso', 'index.html'), '<!doctype html><body>prerender</body>');
  withBuild = await startServer({ webDist: full });
  withoutBuild = await startServer({ webDist: empty });
});

after(() => {
  for (const s of [withBuild, withoutBuild]) {
    if (s) s.child.kill();
  }
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('GET / devuelve la página de la aplicación', async () => {
  const res = await fetch(withBuild.base + '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.ok((await res.text()).includes(MARKER));
});

test('un fichero compilado existente se sirve con su tipo', async () => {
  const res = await fetch(withBuild.base + '/app.js');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /javascript/);
});

test('una ruta profunda del cliente devuelve la aplicación', async () => {
  const res = await fetch(withBuild.base + '/rutas/listado', { headers: { Accept: 'text/html' } });
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes(MARKER));
});

test('una ruta del cliente que coincide con una carpeta del build no redirige: devuelve la aplicación', async () => {
  const res = await fetch(withBuild.base + '/acceso?returnUrl=%2Fjourneys', { redirect: 'manual', headers: { Accept: 'text/html' } });
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes(MARKER));
});

test('un fichero inexistente con extensión devuelve 404 y no la aplicación', async () => {
  const res = await fetch(withBuild.base + '/inexistente.js');
  assert.equal(res.status, 404);
  assert.ok(!(await res.text()).includes(MARKER));
});

test('GET /api/me sin cabecera Authorization devuelve 401 en JSON, no HTML', async () => {
  const res = await fetch(withBuild.base + '/api/me');
  assert.equal(res.status, 401);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.ok((await res.json()).message);
});

test('GET /auth/unlink/:provider lo atiende su manejador (401 en JSON)', async () => {
  const res = await fetch(withBuild.base + '/auth/unlink/google');
  assert.equal(res.status, 401);
  assert.match(res.headers.get('content-type'), /application\/json/);
});

test('POST /api/account lo atiende su manejador', async () => {
  const res = await fetch(withBuild.base + '/api/account', { method: 'POST' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('una ruta de API desconocida devuelve 404 en JSON, no la aplicación', async () => {
  const res = await fetch(withBuild.base + '/api/no-existe');
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
});

test('POST /auth/login llega a su manejador y no a la aplicación', async () => {
  // Sin MongoDB el manejador queda esperando; la aplicación habría respondido de inmediato.
  let body = null;
  try {
    const res = await fetch(withBuild.base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.c', password: 'x' }),
      signal: AbortSignal.timeout(1500),
    });
    body = await res.text();
  } catch (error) {
    assert.equal(error.name, 'TimeoutError');
  }
  if (body !== null) {
    assert.ok(!body.includes(MARKER), 'POST /auth/login no debe devolver la página de la aplicación');
  }
});

test('sin compilación: 503 con mensaje claro y aviso en el registro', async () => {
  const res = await fetch(withoutBuild.base + '/');
  assert.equal(res.status, 503);
  assert.match((await res.json()).message, /npm run build:web/);
  assert.match(withoutBuild.log(), /npm run build:web/);

  const api = await fetch(withoutBuild.base + '/api/me');
  assert.equal(api.status, 401, 'las rutas de API siguen funcionando sin compilación');
});
