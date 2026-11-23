'use strict';
/**
 * Servidor web de ruteando (AngularJS). FND-002:
 *  - /api/v1/** → BACKEND_URL (proxy del mismo origen, ADR-0002)
 *  - redirecciones de los enlaces de correo a la SPA
 *  - estáticos: index.html, app/, vendor/
 * Variables en .env (ver .env.example). El ejemplo Satellizer/MongoDB queda tras LEGACY_SATELLIZER=1.
 */
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile);
}

const { createApp } = require('./app');

const app = createApp(process.env);
if (process.env.LEGACY_SATELLIZER === '1') {
  require('./legacy-satellizer')(app);
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`ruteando-web en http://localhost:${port} · backend: ${process.env.BACKEND_URL || '(sin configurar: /api/v1 responde 503)'}`);
});
