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
  startMockGateway().catch((err) =>
    console.warn(`[proxy /gateway] No se pudo arrancar el gateway falso: ${err.message}`)
  );
}

if (missing.length) {
  console.warn(
    `[proxy /gateway] Falta ${missing.join(' y ')} (ver .env.example): las peticiones a /gateway responderán 503.`
  );
}

// Retraso artificial para ver los esqueletos de carga: GATEWAY_DELAY_MS=1500 retrasa cada petición 1,5 s; ausente, vacío,
// 0 o inválido lo apaga. Solo existe aquí (`ng serve`): el servidor de producción no lo lee. El proxy se carga al arrancar,
// así que cambiar el valor exige reiniciar `ng serve`.
const delayMs = Math.min(Math.max(Number.parseInt(process.env.GATEWAY_DELAY_MS || '', 10) || 0, 0), 30000);
if (delayMs) {
  console.warn(`[proxy /gateway] Retraso artificial de ${delayMs} ms en cada petición (GATEWAY_DELAY_MS).`);
}

// Segundo factor (change add-mfa): `ng serve` no usa Express, así que el mismo módulo del servidor (server/mfa) corre en un puerto local
// (MFA_DEV_PORT, 4020) y el login y /gateway/mfa se le envían ANTES que el resto de /gateway. Si el puerto ya lo usa otro `ng serve`, se
// reutiliza. Sin MFA_SECRET_KEY el módulo queda apagado: /gateway/mfa responde 503 en JSON y el login llega al gateway sin intervención.
const mfaPort = Number(process.env.MFA_DEV_PORT) || 4020;
const mfa = require('../server/mfa').createMfa(process.env);
if (!mfa.enabled) {
  console.warn(`[proxy /gateway/mfa] Segundo factor desactivado: ${mfa.reason}.`);
}
const mfaApp = require('express')();
mfa.mount(mfaApp);
// SSO (change add-sso): mismo patrón; el regreso del proveedor (/gateway/sso/<proveedor>/callback) entra por el puerto de `ng serve`,
// así que SSO_REDIRECT_BASE_URL debe ser http://localhost:4200 y esa dirección debe estar registrada en el proveedor.
const sso = require('../server/sso').createSso(process.env, { mfa });
if (!sso.enabled) {
  console.warn(`[proxy /gateway/sso] SSO desactivado: ${sso.reason}.`);
}
sso.mount(mfaApp);
mfaApp
  .listen(mfaPort, '127.0.0.1')
  .on('error', (err) =>
    console.warn(
      `[proxy /gateway/mfa] No se pudo abrir el puerto ${mfaPort} (${err.code}); se usará el que ya esté abierto.`
    )
  );
const mfaTarget = `http://127.0.0.1:${mfaPort}`;

module.exports = {
  // Con el módulo apagado el login tampoco se desvía: sigue por /gateway como siempre
  ...(mfa.enabled ? { '/gateway/auth/login': { target: mfaTarget, changeOrigin: false } } : {}),
  '/gateway/mfa': { target: mfaTarget, changeOrigin: false },
  '/gateway/sso': { target: mfaTarget, changeOrigin: false },
  // Rutas solo de servidor (el intercambio del SSO entrega sesiones): el navegador no las alcanza (ver server/gateway-proxy.js)
  '/gateway/auth/sso': {
    target: 'http://127.0.0.1:9',
    bypass(req, res) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ message: 'Not found' }));
      return false;
    },
  },
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
