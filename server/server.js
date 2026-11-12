/**
 * Servidor de ruteando-web: publica la compilación de ng-ruteando y reenvía /gateway/** al
 * HanoIT Gateway (ver gateway-proxy.js). Variables de entorno: PORT, WEB_DIST y las del proxy (.env.example).
 */
var fs = require('fs');
var path = require('path');

var colors = require('colors');
var compression = require('compression');
var express = require('express');
var logger = require('morgan');

var gatewayProxy = require('./gateway-proxy');
var createMfa = require('./mfa').createMfa;
var securityHeaders = require('./security-headers').securityHeaders;
gatewayProxy.loadEnvFile(); // carga ../.env (si existe) antes de leer la configuración

// Directorio con la compilación de navegador de ng-ruteando (se puede cambiar con WEB_DIST)
var WEB_DIST = path.resolve(
  process.env.WEB_DIST || path.join(__dirname, '..', 'ng-ruteando', 'dist', 'ng-ruteando', 'browser')
);

var app = express();

app.set('port', process.env.PORT || 3000);
app.disable('x-powered-by');
// GET /healthCheck: público y sin sesión, lo consulta Jenkins (ver Jenkinsfile) para avisar si la aplicación se cae. Va antes del registro
// para no llenarlo con una línea cada pocos minutos. 200 = el servidor responde y el frontend está compilado; 503 si falta la compilación.
// No consulta el gateway: una caída del gateway no es una caída de esta aplicación.
app.get('/healthCheck', function (req, res) {
  var ok = !!webEntryFile();
  res
    .status(ok ? 200 : 503)
    .set('Cache-Control', 'no-store')
    .send({ status: ok ? 'ok' : 'error', frontend: ok ? 'ok' : 'sin compilar', uptime: Math.round(process.uptime()) });
});
app.use(logger('dev'));
// Cabeceras de seguridad en todas las respuestas, también las del proxy y el estático
app.use(securityHeaders(process.env));
// Compresión (brotli o gzip según el navegador) de lo que sea texto: HTML, JS, CSS, JSON, SVG. Va antes del proxy y del estático para
// que cubra también las respuestas del gateway; ignora lo que ya viene comprimido (imágenes, fuentes) y lo que trae Content-Encoding.
app.use(compression());
// Segundo factor (change add-mfa): intercepta POST /gateway/auth/login y atiende /gateway/mfa/**; va ANTES del proxy para que el login no pase
// directo. Sin MFA_SECRET_KEY queda apagado (/gateway/mfa responde 503 y el login se reenvía tal cual).
var mfa = createMfa(process.env);
if (!mfa.enabled) {
  console.log(('Segundo factor desactivado: ' + mfa.reason + '.').yellow);
}
mfa.mount(app);
// Proxy del gateway: antes del estático y del comodín del cliente
app.use('/gateway', gatewayProxy.createGatewayProxy());

// /api y /auth no son rutas del cliente: una URL de API mal escrita no debe devolver la página de la aplicación
app.use(['/api', '/auth'], function (req, res) {
  res.status(404).send({ message: 'Not found' });
});

function webEntryFile() {
  var candidates = ['index.csr.html', 'index.html'];
  for (var i = 0; i < candidates.length; i++) {
    var file = path.join(WEB_DIST, candidates[i]);
    if (fs.existsSync(file)) {
      return file;
    }
  }
  return null;
}

// El service worker, su lista de versiones y el manifiesto no se cachean: si el navegador guardara el worker, nunca vería una versión nueva.
var NO_CACHE_FILES = ['ngsw-worker.js', 'ngsw.json', 'safety-worker.js', 'worker-basic.min.js', 'manifest.webmanifest'];
// Los ficheros con hash en el nombre (main-7FRZEZGX.js, styles-RZOF6GUB.css) nunca cambian de contenido: se cachean un año.
var HASHED_FILE = /-[A-Z0-9]{8}\.(js|css)$/;
function cacheHeaders(res, file) {
  var name = path.basename(file);
  if (NO_CACHE_FILES.indexOf(name) !== -1) {
    res.setHeader('Cache-Control', 'no-cache');
  } else if (HASHED_FILE.test(name)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}

// redirect: false -> el prerender deja carpetas como acceso/ y `GET /access` no debe redirigir a `/access/`
app.use(express.static(WEB_DIST, { index: false, redirect: false, setHeaders: cacheHeaders }));

app.get('*', function (req, res) {
  // Ficheros inexistentes (con extensión) y peticiones que no piden HTML no son rutas del cliente
  if (path.extname(req.path) || !req.accepts('html')) {
    return res.status(404).send({ message: 'Not found' });
  }
  var entry = webEntryFile();
  if (!entry) {
    return res.status(503).send({ message: 'El frontend no está compilado. Ejecuta "pnpm run build:web".' });
  }
  res.sendFile(entry);
});

if (!webEntryFile()) {
  console.log(('Frontend sin compilar en ' + WEB_DIST + '. Ejecuta `pnpm run build:web`.').yellow);
}

app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
