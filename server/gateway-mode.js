/**
 * Selector del gateway: GATEWAY_MODE=real (por defecto) usa GATEWAY_URL y GATEWAY_API_KEY; GATEWAY_MODE=mock usa el gateway
 * falso de scripts/mock-gateway.mjs, que se arranca dentro del mismo proceso. Lo comparten el servidor de producción
 * (gateway-proxy.js) y el proxy de `ng serve` (ng-ruteando/proxy.conf.js).
 *
 * PROVISIONAL: el modo mock existe mientras los servicios reales no estén estables. Cuando lo estén, se retira borrando este
 * fichero, su uso en gateway-proxy.js y proxy.conf.js, y las variables GATEWAY_MODE/MOCK_GATEWAY_* de .env.example.
 */
const DEFAULT_MOCK_PORT = 4010;

/** Resuelve a qué gateway apuntar. `invalid` indica un valor de GATEWAY_MODE desconocido (no se adivina nada). */
function gatewayConfig(env) {
  const source = env || process.env;
  const mode = (source.GATEWAY_MODE || 'real').trim().toLowerCase();
  if (mode === 'mock') {
    const port = Number(source.MOCK_GATEWAY_PORT) || DEFAULT_MOCK_PORT;
    // La clave real nunca se envía al simulado
    return { mode, target: 'http://127.0.0.1:' + port, apiKey: 'mock' };
  }
  if (mode === 'real') {
    return { mode, target: (source.GATEWAY_URL || '').replace(/\/+$/, ''), apiKey: source.GATEWAY_API_KEY || '' };
  }
  return { mode, invalid: true };
}

/**
 * Arranca el gateway falso en este proceso (muere con él). Devuelve una promesa del módulo del simulado, que exporta `server`;
 * si el puerto ya estaba ocupado por otro simulado, lo reutiliza.
 */
function startMockGateway() {
  return import('../scripts/mock-gateway.mjs');
}

/** Aviso para el registro: en producción alguien podría dejar el modo mock encendido sin darse cuenta. */
const MOCK_WARNING =
  'MODO MOCK (GATEWAY_MODE=mock): la aplicación usa un gateway FALSO con datos de demostración; no se guarda nada real. ' +
  'Si el servidor es accesible desde fuera, define MOCK_GATEWAY_PASSWORD.';

module.exports = { gatewayConfig, startMockGateway, MOCK_WARNING };
