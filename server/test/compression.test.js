// Pruebas de la compresión de las respuestas: texto comprimido con brotli o gzip según el navegador, lo ya comprimido sin tocar y
// las cabeceras de caché intactas. Se arranca server/server.js de verdad con un directorio de compilación temporal.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { startServer } = require('./helpers');

const BIG_JS =
  '/* texto repetido */\n' + 'export const linea = "ruteando planifica rutas, flota y jornadas";\n'.repeat(600);
const BIG_HTML =
  '<!doctype html><html><body><app-root>' + '<p>ruteando-prueba</p>'.repeat(300) + '</app-root></body></html>';

let tmpDir;
let server;

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruteando-compresion-'));
  fs.writeFileSync(path.join(tmpDir, 'index.csr.html'), BIG_HTML);
  fs.writeFileSync(path.join(tmpDir, 'main-7FRZEZGX.js'), BIG_JS);
  fs.writeFileSync(
    path.join(tmpDir, 'icono.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg">' + '<path d="M0 0L10 10"/>'.repeat(200) + '</svg>'
  );
  fs.writeFileSync(path.join(tmpDir, 'fuente.woff2'), Buffer.alloc(4000, 7)); // ya está comprimida: no se vuelve a comprimir
  fs.writeFileSync(path.join(tmpDir, 'pequeno.js'), 'console.log(1);');
  server = await startServer({ webDist: tmpDir });
});

after(() => {
  if (server) server.child.kill();
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** GET sin descompresión automática: así se ve lo que viaja de verdad por la red. */
function get(pathname, acceptEncoding) {
  return new Promise((resolve, reject) => {
    const headers = acceptEncoding === undefined ? {} : { 'Accept-Encoding': acceptEncoding };
    http
      .get(server.base + pathname, { headers }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });
}

test('con brotli disponible, el JS viaja en brotli y mucho más pequeño', async () => {
  const res = await get('/main-7FRZEZGX.js', 'br, gzip');
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-encoding'], 'br');
  assert.ok(res.body.length < Buffer.byteLength(BIG_JS) / 5, `pesa ${res.body.length} de ${Buffer.byteLength(BIG_JS)}`);
  assert.equal(zlib.brotliDecompressSync(res.body).toString(), BIG_JS);
});

test('si el navegador solo acepta gzip, va en gzip', async () => {
  const res = await get('/main-7FRZEZGX.js', 'gzip');
  assert.equal(res.headers['content-encoding'], 'gzip');
  assert.equal(zlib.gunzipSync(res.body).toString(), BIG_JS);
});

test('sin Accept-Encoding no se comprime y la respuesta avisa de que varía', async () => {
  const res = await get('/main-7FRZEZGX.js');
  assert.equal(res.headers['content-encoding'], undefined);
  assert.equal(res.body.toString(), BIG_JS);
  assert.match(res.headers['vary'] ?? '', /Accept-Encoding/i);
});

test('el HTML de la aplicación y el SVG también se comprimen', async () => {
  const html = await get('/acceso', 'br, gzip');
  assert.equal(html.headers['content-encoding'], 'br');
  assert.equal(zlib.brotliDecompressSync(html.body).toString(), BIG_HTML);
  const svg = await get('/icono.svg', 'br');
  assert.equal(svg.headers['content-encoding'], 'br');
});

test('lo que ya está comprimido (fuentes) y lo muy pequeño no se tocan', async () => {
  const font = await get('/fuente.woff2', 'br, gzip');
  assert.equal(font.headers['content-encoding'], undefined);
  assert.equal(font.body.length, 4000);
  const small = await get('/pequeno.js', 'br, gzip');
  assert.equal(small.headers['content-encoding'], undefined);
});

test('comprimir no cambia la caché de los ficheros con hash ni las cabeceras de seguridad', async () => {
  const res = await get('/main-7FRZEZGX.js', 'br');
  assert.equal(res.headers['cache-control'], 'public, max-age=31536000, immutable');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});
