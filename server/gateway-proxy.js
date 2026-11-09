/**
 * Proxy del HanoIT Gateway: reenvía /gateway/** a <GATEWAY_URL>/api/v1/** añadiendo la
 * cabecera X-Api-Key desde el servidor, para que el navegador nunca conozca la clave.
 *
 * Variables de entorno (ver .env.example):
 *   GATEWAY_MODE        real (por defecto) o mock: el gateway falso de scripts/mock-gateway.mjs (ver gateway-mode.js)
 *   GATEWAY_URL         dirección base del gateway, sin /api/v1
 *   GATEWAY_API_KEY     clave de API (secreto)
 *   GATEWAY_TIMEOUT_MS  tiempo máximo de espera del gateway (por defecto 30000)
 *
 * Debe registrarse ANTES de los analizadores de cuerpo (body-parser): el cuerpo se reenvía
 * en streaming, sin leerlo ni guardarlo (necesario para multipart).
 */
const fs = require('fs');
const path = require('path');
require('colors'); // añade .yellow a String; también lo carga server.js
const { createProxyMiddleware } = require('http-proxy-middleware');
const { gatewayConfig, startMockGateway, MOCK_WARNING } = require('./gateway-mode');

const DEFAULT_TIMEOUT_MS = 30000;

/** Carga ../.env si existe. No pisa las variables que ya estén definidas en el entorno. */
function loadEnvFile() {
  const file = path.join(__dirname, '..', '.env');
  if (fs.existsSync(file) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(file);
  }
}

function sendJson(res, status, message) {
  if (res.headersSent || typeof res.writeHead !== 'function') {
    return res.end && res.end();
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ message }));
}

function createGatewayProxy(env) {
  const source = env || process.env;
  const config = gatewayConfig(source);
  const target = config.target;
  const apiKey = config.apiKey;
  const timeoutMs = Number(source.GATEWAY_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  if (config.invalid) {
    console.log(
      ('Proxy del gateway desactivado: GATEWAY_MODE debe ser "real" o "mock" (recibido "' + config.mode + '").').yellow
    );
    return function gatewayInvalidMode(req, res) {
      sendJson(res, 503, 'El gateway no está configurado en el servidor.');
    };
  }
  if (config.mode === 'mock') {
    console.log(MOCK_WARNING.yellow);
    startMockGateway().catch(function (err) {
      console.log(('No se pudo arrancar el gateway falso: ' + err.message).yellow);
    });
  }

  const missing = [];
  if (!target) missing.push('GATEWAY_URL');
  if (!apiKey) missing.push('GATEWAY_API_KEY');
  if (missing.length) {
    console.log(('Proxy del gateway desactivado: falta ' + missing.join(' y ') + ' (ver .env.example).').yellow);
    return function gatewayNotConfigured(req, res) {
      sendJson(res, 503, 'El gateway no está configurado en el servidor.');
    };
  }

  return createProxyMiddleware({
    target: target,
    changeOrigin: true,
    // Montado con app.use('/gateway', ...) Express ya recorta el prefijo de req.url; si no, se quita aquí
    pathRewrite: function (requestPath) {
      return '/api/v1' + requestPath.replace(/^\/gateway(?=\/|\?|$)/, '');
    },
    on: {
      proxyReq: function (proxyReq, req) {
        // La clave del cliente nunca se reenvía: se sustituye por la del servidor
        proxyReq.setHeader('X-Api-Key', apiKey);
        // La llamada al gateway es de servidor a servidor: el Origin del navegador activaría su filtro CORS (403)
        proxyReq.removeHeader('origin');
        proxyReq.setTimeout(timeoutMs, function () {
          req.gatewayTimedOut = true;
          proxyReq.destroy(new Error('Gateway timeout'));
        });
      },
      error: function (err, req, res) {
        // Mensajes genéricos: no incluyen la dirección del gateway ni la clave
        if (req.gatewayTimedOut) {
          return sendJson(res, 504, 'El gateway tardó demasiado en responder.');
        }
        sendJson(res, 502, 'El gateway no está disponible.');
      },
    },
  });
}

module.exports = { createGatewayProxy, loadEnvFile };
