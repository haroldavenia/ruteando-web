// Proxy de `ng serve`: reenvía /gateway a <GATEWAY_URL>/api/v1 y añade X-Api-Key desde el
// entorno, igual que server/gateway-proxy.js. Variables: GATEWAY_URL y GATEWAY_API_KEY
// (se leen del entorno o de ../.env, que no se versiona).
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile); // no pisa variables ya definidas
}

// GATEWAY_MODE=mock apunta al gateway falso (scripts/mock-gateway.mjs), que se arranca dentro de este mismo proceso y muere
// con `ng serve`; `real` (por defecto) usa GATEWAY_URL y GATEWAY_API_KEY. Lógica compartida con el servidor: server/gateway-mode.js
const { gatewayConfig, startMockGateway, MOCK_WARNING } = require('../server/gateway-mode');
const gateway = gatewayConfig(process.env);
const target = gateway.target || '';
const apiKey = gateway.apiKey || '';
const missing = gateway.invalid
  ? ['un GATEWAY_MODE válido (real o mock)']
  : [!target && 'GATEWAY_URL', !apiKey && 'GATEWAY_API_KEY'].filter(Boolean);
if (gateway.mode === 'mock') {
  console.warn(MOCK_WARNING);
  startMockGateway().catch((err) => console.warn(`[proxy /gateway] No se pudo arrancar el gateway falso: ${err.message}`));
}

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
