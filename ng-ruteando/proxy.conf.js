// Proxy de `ng serve`: reenvía /gateway a <GATEWAY_URL>/api/v1 y añade X-Api-Key desde el
// entorno, igual que server/gateway-proxy.js. Variables: GATEWAY_URL y GATEWAY_API_KEY
// (se leen del entorno o de ../.env, que no se versiona).
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile); // no pisa variables ya definidas
}

const target = (process.env.GATEWAY_URL || '').replace(/\/+$/, '');
const apiKey = process.env.GATEWAY_API_KEY || '';
const missing = [!target && 'GATEWAY_URL', !apiKey && 'GATEWAY_API_KEY'].filter(Boolean);

if (missing.length) {
  console.warn(`[proxy /gateway] Falta ${missing.join(' y ')} (ver .env.example): las peticiones a /gateway responderán 503.`);
}

module.exports = {
  '/gateway': {
    // Con variables ausentes se usa un destino ficticio; `bypass` responde 503 antes de reenviar
    target: target || 'http://127.0.0.1:9',
    changeOrigin: true,
    pathRewrite: { '^/gateway': '/api/v1' },
    // Sustituye cualquier X-Api-Key que mande el navegador
    headers: { 'X-Api-Key': apiKey },
    bypass(req, res) {
      if (missing.length && res) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ message: 'El gateway no está configurado en el servidor de desarrollo.' }));
        return false;
      }
      return undefined;
    },
  },
};
