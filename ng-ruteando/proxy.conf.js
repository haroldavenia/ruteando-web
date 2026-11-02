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

// Retraso artificial para ver los esqueletos de carga: GATEWAY_DELAY_MS=1500 retrasa cada petición 1,5 s; ausente, vacío,
// 0 o inválido lo apaga. Solo existe aquí (`ng serve`): el servidor de producción no lo lee. El proxy se carga al arrancar,
// así que cambiar el valor exige reiniciar `ng serve`.
const delayMs = Math.min(Math.max(Number.parseInt(process.env.GATEWAY_DELAY_MS || '', 10) || 0, 0), 30000);
if (delayMs) {
  console.warn(`[proxy /gateway] Retraso artificial de ${delayMs} ms en cada petición (GATEWAY_DELAY_MS).`);
}

module.exports = {
  '/gateway': {
    // Con variables ausentes se usa un destino ficticio; `bypass` responde 503 antes de reenviar
    target: target || 'http://127.0.0.1:9',
    changeOrigin: true,
    pathRewrite: { '^/gateway': '/api/v1' },
    // Sustituye cualquier X-Api-Key que mande el navegador
    headers: { 'X-Api-Key': apiKey },
    // La llamada al gateway es de servidor a servidor: el Origin del navegador activaría su filtro CORS (403)
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
      if (delayMs) {
        const web = proxy.web.bind(proxy);
        proxy.web = (req, res, ...rest) => {
          setTimeout(() => {
            if (!res.destroyed && !res.writableEnded) web(req, res, ...rest); // el navegador pudo cancelar mientras tanto
          }, delayMs);
        };
      }
    },
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
