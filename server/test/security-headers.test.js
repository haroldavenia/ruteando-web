// Pruebas de las cabeceras de seguridad: el middleware solo y el servidor real.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildCsp, cspMode, securityHeaders } = require('../security-headers');
const { startServer } = require('./helpers');

function run(env, headers = {}, encrypted = false) {
  const set = {};
  const res = {
    setHeader: (name, value) => (set[name] = value),
    removeHeader: (name) => delete set[name],
  };
  let called = false;
  securityHeaders(env)({ headers, socket: { encrypted } }, res, () => (called = true));
  return { set, called };
}

test('cabeceras básicas y continúa la cadena', () => {
  const { set, called } = run({});
  assert.equal(called, true);
  assert.equal(set['X-Content-Type-Options'], 'nosniff');
  assert.equal(set['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(set['X-Frame-Options'], 'DENY');
  assert.equal(set['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.equal(set['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()');
});

test('por defecto la CSP solo informa; enforce la aplica; off la quita', () => {
  const byDefault = run({}).set;
  assert.ok(byDefault['Content-Security-Policy-Report-Only']);
  assert.equal(byDefault['Content-Security-Policy'], undefined);

  const enforce = run({ CSP_MODE: 'enforce' }).set;
  assert.ok(enforce['Content-Security-Policy']);
  assert.equal(enforce['Content-Security-Policy-Report-Only'], undefined);

  const off = run({ CSP_MODE: 'off' }).set;
  assert.equal(off['Content-Security-Policy'], undefined);
  assert.equal(off['Content-Security-Policy-Report-Only'], undefined);
  assert.equal(off['X-Content-Type-Options'], 'nosniff');
});

test('un CSP_MODE desconocido cae en solo informe', () => {
  assert.equal(cspMode({ CSP_MODE: 'bloquear' }), 'report-only');
  assert.equal(cspMode({}), 'report-only');
});

test('la política: scripts solo del propio origen y nada incrustable', () => {
  const csp = buildCsp({});
  const directive = (name) => csp.split('; ').find((d) => d.startsWith(name + ' '));
  assert.equal(directive('script-src'), "script-src 'self'");
  assert.equal(directive('object-src'), "object-src 'none'");
  assert.equal(directive('frame-ancestors'), "frame-ancestors 'none'");
  assert.equal(directive('base-uri'), "base-uri 'self'");
  assert.equal(directive('form-action'), "form-action 'self'");
  assert.match(directive('img-src'), /https:\/\/tile\.openstreetmap\.org/);
  assert.doesNotMatch(csp, /unsafe-eval/);
});

test('CSP_IMG_SRC añade orígenes de imagen sin quitar los de serie', () => {
  const img = buildCsp({ CSP_IMG_SRC: 'https://a.example.invalid  https://b.example.invalid' })
    .split('; ')
    .find((d) => d.startsWith('img-src'));
  assert.match(img, /https:\/\/a\.example\.invalid/);
  assert.match(img, /https:\/\/b\.example\.invalid/);
  assert.match(img, /tile\.openstreetmap\.org/);
});

test('HSTS solo cuando la petición llegó por HTTPS', () => {
  assert.equal(run({}).set['Strict-Transport-Security'], undefined);
  assert.ok(run({}, { 'x-forwarded-proto': 'https' }).set['Strict-Transport-Security']);
  assert.ok(run({}, {}, true).set['Strict-Transport-Security']);
});

test('quita X-Powered-By', () => {
  const set = { 'X-Powered-By': 'Express' };
  const res = { setHeader: (n, v) => (set[n] = v), removeHeader: (n) => delete set[n] };
  securityHeaders({})({ headers: {}, socket: {} }, res, () => {});
  assert.equal(set['X-Powered-By'], undefined);
});

// ---- Servidor real: todas las respuestas llevan las cabeceras y no cambian de contenido ----
let tmpDir;
let server;

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruteando-web-csp-'));
  fs.writeFileSync(path.join(tmpDir, 'index.csr.html'), '<!doctype html><body><app-root></app-root></body>');
  fs.writeFileSync(path.join(tmpDir, 'app.js'), 'console.log("ok");');
  server = await startServer({ webDist: tmpDir, env: { GATEWAY_URL: 'http://127.0.0.1:9', GATEWAY_API_KEY: '', CSP_MODE: '', CSP_IMG_SRC: '' } });
});

after(() => {
  if (server) server.child.kill();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

for (const [name, url, status] of [
  ['la página de la aplicación', '/', 200],
  ['una ruta del cliente', '/acceso/registro', 200],
  ['un fichero estático', '/app.js', 200],
  ['un fichero inexistente', '/no-existe.js', 404],
  ['una ruta /api', '/api/x', 404],
  ['el proxy del gateway', '/gateway/auth/me', 503],
]) {
  test(`${name} lleva las cabeceras y conserva su estado`, async () => {
    const res = await fetch(server.base + url, { headers: { accept: 'text/html,*/*' } });
    assert.equal(res.status, status);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.ok(res.headers.get('content-security-policy-report-only'));
    assert.equal(res.headers.get('content-security-policy'), null);
    assert.equal(res.headers.get('x-powered-by'), null);
  });
}
