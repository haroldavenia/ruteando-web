'use strict';
/**
 * Proxy del mismo origen /api/v1/** → BACKEND_URL (FND-002, ADR-0002).
 * Streaming en ambos sentidos, sin `Origin`, `X-Api-Key` opcional, timeout general y
 * timeout propio para POST /api/v1/journeys/plan. Errores con el formato del backend.
 */
const fs = require('fs');
const http = require('http');
const https = require('https');
const tls = require('tls');

/**
 * Agente HTTPS que confía en las CA del sistema + el certificado del backend (PEM).
 * Node solo aplica NODE_EXTRA_CA_CERTS si está en el entorno al arrancar el proceso
 * (no si llega por --env-file o process.loadEnvFile), por eso el PEM se carga aquí.
 * La verificación de nombre (hanoit, localhost, 127.0.0.1) nunca se desactiva.
 */
function backendAgent(caFile) {
  if (!caFile) return undefined;
  const pem = fs.readFileSync(caFile, 'utf8');
  if (!/-----BEGIN CERTIFICATE-----/.test(pem)) throw new Error(`${caFile} no contiene un certificado PEM`);
  return new https.Agent({ keepAlive: true, ca: [...tls.rootCertificates, pem] });
}

const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer',
  'transfer-encoding', 'upgrade', 'host', 'origin', 'referer', 'cookie'];

function errorBody(status, error, message, path) {
  return JSON.stringify({ error, message, timestamp: new Date().toISOString(), path, details: null });
}

function sendError(res, status, error, message, path) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(errorBody(status, error, message, path));
}

function isPlan(req) {
  return req.method === 'POST' && /^\/api\/v1\/journeys\/plan(\?|$)/.test(req.originalUrl || req.url);
}

/**
 * @param {{backendUrl?: string, apiKey?: string, timeoutMs?: number, planTimeoutMs?: number, caFile?: string}} options
 */
function createProxy(options) {
  const backendUrl = (options.backendUrl || '').replace(/\/+$/, '');
  const timeoutMs = Number(options.timeoutMs) || 60000;
  const planTimeoutMs = Number(options.planTimeoutMs) || 240000;
  const target = backendUrl ? new URL(backendUrl) : null;
  const client = target && target.protocol === 'https:' ? https : http;
  const agent = target && target.protocol === 'https:' ? backendAgent(options.caFile) : undefined;

  return function proxy(req, res) {
    const path = req.originalUrl || req.url;
    if (!target) {
      sendError(res, 503, 'SERVICE_UNAVAILABLE', 'BACKEND_URL no está configurado en el servidor web', path);
      return;
    }
    const headers = {};
    for (const [name, value] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.includes(name.toLowerCase())) headers[name] = value;
    }
    headers.host = target.host;
    if (options.apiKey) headers['x-api-key'] = options.apiKey;
    if (req.headers['transfer-encoding']) headers['transfer-encoding'] = req.headers['transfer-encoding'];

    const limit = isPlan(req) ? planTimeoutMs : timeoutMs;
    let finished = false;
    const upstream = client.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      method: req.method,
      agent,
      path: target.pathname.replace(/\/$/, '') + path,
      headers,
    }, (backendRes) => {
      clearTimeout(timer);
      finished = true;
      const out = {};
      for (const [name, value] of Object.entries(backendRes.headers)) {
        if (!['connection', 'keep-alive', 'transfer-encoding'].includes(name)) out[name] = value;
      }
      res.writeHead(backendRes.statusCode, out);
      // Si el backend corta a mitad de respuesta, se corta también al navegador (sin respuesta truncada "válida").
      backendRes.on('aborted', () => res.destroy());
      backendRes.on('error', () => res.destroy());
      backendRes.pipe(res);
    });

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      upstream.destroy();
      sendError(res, 504, 'GATEWAY_TIMEOUT', `El backend no respondió en ${limit} ms`, path);
    }, limit);

    upstream.on('error', (err) => {
      clearTimeout(timer);
      if (finished) {
        res.destroy();
        return;
      }
      finished = true;
      sendError(res, 502, 'BAD_GATEWAY', `No se pudo contactar el backend (${err.code || err.message})`, path);
    });
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  };
}

module.exports = { createProxy, errorBody, backendAgent };
