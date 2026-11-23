'use strict';
/**
 * Aplicación web de ruteando (FND-002): redirecciones de correos, proxy /api/v1 y estáticos
 * de la SPA AngularJS. Sin dependencias de MongoDB: se puede probar y arrancar sola.
 */
const path = require('path');
const express = require('express');
const { createProxy } = require('./proxy');

const ROOT = path.join(__dirname, '..');

/** Rutas sin `#` que llegan en los correos del backend → rutas de la SPA, conservando el token. */
const EMAIL_REDIRECTS = {
  '/verify-email': '/#/access/verify',
  '/reset-password': '/#/access/reset',
  '/invitations/accept': '/#/access/invitation',
};

function emailRedirect(req, res, next) {
  const target = EMAIL_REDIRECTS[req.path];
  if (!target || req.method !== 'GET') return next();
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  res.redirect(302, token ? `${target}?token=${encodeURIComponent(token)}` : target);
}

/** PEM del backend: BACKEND_CA_FILE o, si no, NODE_EXTRA_CA_CERTS (rutas relativas a la raíz del repo). */
function resolveCaFile(env) {
  const file = env.BACKEND_CA_FILE || env.NODE_EXTRA_CA_CERTS;
  return file ? path.resolve(ROOT, file) : undefined;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {{ staticRoot?: string }} [options]
 */
function createApp(env, options = {}) {
  const app = express();
  const staticRoot = options.staticRoot || ROOT;
  app.disable('x-powered-by');

  // El proxy va antes de cualquier body-parser para no consumir el stream.
  app.use('/api/v1', createProxy({
    backendUrl: env.BACKEND_URL,
    apiKey: env.BACKEND_API_KEY,
    timeoutMs: env.BACKEND_TIMEOUT_MS,
    planTimeoutMs: env.BACKEND_PLAN_TIMEOUT_MS,
    caFile: resolveCaFile(env),
  }));
  app.use(emailRedirect);

  app.get('/', (req, res) => res.sendFile(path.join(staticRoot, 'index.html')));
  app.use('/app', express.static(path.join(staticRoot, 'app'), { index: false }));
  app.use('/vendor', express.static(path.join(staticRoot, 'vendor'), { index: false }));
  app.get('/healthz', (req, res) => res.json({ status: 'ok', backend: env.BACKEND_URL ? 'configured' : 'missing' }));
  return app;
}

module.exports = { createApp, EMAIL_REDIRECTS, resolveCaFile };
