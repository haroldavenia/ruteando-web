/**
 * Cliente del HanoIT Gateway para el módulo de segundo factor: las mismas variables y la misma clave de API que el proxy
 * (gateway-mode.js), siempre de servidor a servidor. Devuelve el estado y el cuerpo tal cual; los fallos de red se traducen a
 * 502 (no disponible) o 504 (tardó demasiado) con mensajes genéricos que no citan la dirección del gateway ni la clave.
 */
const { gatewayConfig } = require('../gateway-mode');

const DEFAULT_TIMEOUT_MS = 30000;

class GatewayError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createGatewayClient(env = process.env, fetchImpl = fetch) {
  const config = gatewayConfig(env);
  const timeoutMs = Number(env.GATEWAY_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const ready = !config.invalid && Boolean(config.target) && Boolean(config.apiKey);

  /** `token` es el de acceso de la persona. Resuelve `{ status, json, text, contentType }`. */
  async function call(method, path, { body, token } = {}) {
    if (!ready) throw new GatewayError(503, 'El gateway no está configurado en el servidor.');
    const headers = { 'X-Api-Key': config.apiKey, Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetchImpl(`${config.target}/api/v1${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (err?.name === 'TimeoutError') throw new GatewayError(504, 'El gateway tardó demasiado en responder.');
      throw new GatewayError(502, 'El gateway no está disponible.');
    }
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json, text, contentType: res.headers.get('content-type') || 'application/json' };
  }

  return { ready, call };
}

module.exports = { createGatewayClient, GatewayError };
