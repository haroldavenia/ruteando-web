/**
 * Cliente de sondas API contra el backend real (FND-001). Lee .env (nunca imprime secretos).
 * Si falta BACKEND_URL o la cuenta de pruebas, las sondas se marcan como omitidas (skip) con el
 * motivo: no hay falsos verdes.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import http from 'node:http';
import https from 'node:https';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envFile = path.join(root, '.env');
if (existsSync(envFile) && !process.env.SDD_NO_ENV_FILE) process.loadEnvFile(envFile);

export const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/+$/, '');

// Mismo PEM que el proxy (BACKEND_CA_FILE o NODE_EXTRA_CA_CERTS): fetch no lo aplica si llega por .env.
const require = createRequire(import.meta.url);
const { backendAgent } = require('../../server/proxy.js');
const { resolveCaFile } = require('../../server/app.js');
const caFile = BACKEND_URL.startsWith('https:') ? resolveCaFile(process.env) : undefined;
const caMissing = caFile && !existsSync(caFile) ? `BACKEND_CA_FILE no existe (${path.relative(root, caFile)}): sonda no ejecutada` : null;
const agent = BACKEND_URL.startsWith('https:') && !caMissing ? backendAgent(caFile) : undefined;

/** Motivo por el que no se puede sondear, o null. */
export function missing(vars = []) {
  if (!BACKEND_URL) return 'BACKEND_URL no está definido (.env): sonda no ejecutada';
  if (caMissing) return caMissing;
  const absent = vars.filter((v) => !process.env[v]);
  return absent.length ? `faltan variables ${absent.join(', ')} (.env): sonda no ejecutada` : null;
}

/** test() que se omite con motivo si falta configuración. */
export function probe(name, vars, fn) {
  const reason = missing(vars);
  return reason ? test(name, { skip: reason }, () => {}) : test(name, fn);
}

/** Petición JSON a /api/v1 con verificación TLS completa (sin desactivar nombres ni CA). */
export function api(method, route, { token, body, headers = {} } = {}) {
  const url = new URL(`${BACKEND_URL}/api/v1${route}`);
  const payload = body ? JSON.stringify(body) : undefined;
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(url, {
      method,
      agent,
      timeout: Number(process.env.BACKEND_TIMEOUT_MS) || 60000,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${route}`)));
    req.on('error', reject);
    req.end(payload);
  });
}

let session = null;
/** Sesión de la cuenta de pruebas (una por proceso: el backend admite un refresh por usuario). */
export async function login() {
  if (!session) {
    const r = await api('POST', '/auth/login', { body: { email: process.env.SDD_TEST_EMAIL, password: process.env.SDD_TEST_PASSWORD } });
    if (r.status !== 200) throw new Error(`login de la cuenta de pruebas: HTTP ${r.status} ${r.body && r.body.error}`);
    session = r.body;
  }
  return session;
}
