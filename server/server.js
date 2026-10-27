/**
 * Servidor de ruteando-web: publica la compilación de ng-ruteando y reenvía /gateway/** al
 * HanoIT Gateway (ver gateway-proxy.js). Variables de entorno: PORT, WEB_DIST y las del proxy (.env.example).
 */
var fs = require('fs');
var path = require('path');

var colors = require('colors');
var express = require('express');
var logger = require('morgan');

var gatewayProxy = require('./gateway-proxy');
gatewayProxy.loadEnvFile(); // carga ../.env (si existe) antes de leer la configuración

// Directorio con la compilación de navegador de ng-ruteando (se puede cambiar con WEB_DIST)
var WEB_DIST = path.resolve(process.env.WEB_DIST || path.join(__dirname, '..', 'ng-ruteando', 'dist', 'ng-ruteando', 'browser'));

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
// Proxy del gateway: antes del estático y del comodín del cliente
app.use('/gateway', gatewayProxy.createGatewayProxy());

// /api y /auth no son rutas del cliente: una URL de API mal escrita no debe devolver la página de la aplicación
app.use(['/api', '/auth'], function(req, res) {
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

// redirect: false -> el prerender deja carpetas como acceso/ y `GET /acceso` no debe redirigir a `/acceso/`
app.use(express.static(WEB_DIST, { index: false, redirect: false }));

app.get('*', function(req, res) {
  // Ficheros inexistentes (con extensión) y peticiones que no piden HTML no son rutas del cliente
  if (path.extname(req.path) || !req.accepts('html')) {
    return res.status(404).send({ message: 'Not found' });
  }
  var entry = webEntryFile();
  if (!entry) {
    return res.status(503).send({ message: 'El frontend no está compilado. Ejecuta "npm run build:web".' });
  }
  res.sendFile(entry);
});

if (!webEntryFile()) {
  console.log(('Frontend sin compilar en ' + WEB_DIST + '. Ejecuta `npm run build:web`.').yellow);
}

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
