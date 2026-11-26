/**
 * mock-api de /api/v1 para E2E y pruebas del proxy (FND-001).
 *   node tests/mock-api/server.mjs            (MOCK_PORT, por defecto 4010)
 * - Exige `Authorization: Bearer` salvo en las rutas públicas del contrato (login, registro, refresh, logout,
 *   verificación y recuperación, invitaciones, tenant por slug, OTP). `/auth/me` y `/auth/change-password` lo exigen.
 * - `x-mock-scenario: <400..599>` fuerza un error con el formato del backend (409 → CONFLICT…); fuera de rango → 400.
 * - GET /{colección}/{id} inexistente o borrado → 404 (las subrutas literales como places/nearby usan su fixture).
 * - Una excepción interna responde 500 sin tumbar el proceso.
 * - `x-mock-delay: <ms>` retrasa la respuesta (pruebas de timeout).
 * - GET /__mock/requests devuelve las cabeceras y tamaños recibidos (para inspección).
 */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { loadFixtures, matchFixture, createStore, WILDCARDS } from './store.mjs';

// Endpoints retirados por el backend (trazabilidad del proyecto): el mock responde 404 aunque haya fixture legacy.
const COVERAGE = new URL('../../specs/migracion-api-v1/trazabilidad/endpoint-coverage.json', import.meta.url);
export const RETIRED_PREFIXES = existsSync(COVERAGE)
  ? [...new Set(JSON.parse(readFileSync(COVERAGE, 'utf8')).items.filter((e) => e.status === 'retired').map((e) => '/api/v1' + e.endpoint.split(' ')[1].split('/{')[0]))]
  : [];

const CODES = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 410: 'GONE', 422: 'UNPROCESSABLE_ENTITY', 423: 'ACCOUNT_LOCKED', 429: 'RATE_LIMIT_EXCEEDED', 500: 'INTERNAL_ERROR', 502: 'ROUTING_ENGINE_UNAVAILABLE' };
const PUBLIC = [
  /^\/api\/v1\/auth\/(login|register|refresh|logout|verify-email|resend-verification|forgot-password|reset-password)$/,
  /^\/api\/v1\/invitations\/accept\//,
  /^\/api\/v1\/tenants\/slug\//,
  /^\/api\/v1\/notifications\/otp\/(send|resend|verify)$/,
];
const COLLECTIONS = new Set(['places', 'packages', 'journeys', 'users', 'resources', 'settings', 'resource-types', 'zones']);
// M1 del contrato: borrado por lote solo en estos recursos (paquetes y zonas no lo tienen).
const BATCH_DELETE = new Set(['places', 'resource-types', 'resources', 'settings', 'users', 'journeys']);
const isIdList = (ids) => Array.isArray(ids) && ids.every((id) => typeof id === 'string');
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function errorJson(status, path, message, details = null) {
  return { error: CODES[status] || `HTTP_${status}`, message: message || `Escenario simulado ${status}`, timestamp: new Date().toISOString(), path, details };
}

export function createMockApi({ fixtures = loadFixtures() } = {}) {
  const store = createStore(fixtures);
  const requests = [];

  const handler = (req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://mock');
    } catch {
      return send(res, 400, errorJson(400, String(req.url), 'URL mal formada'));
    }
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, ''); // /places/{id}/ ≡ /places/{id}
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; chunks.push(c); });
    req.on('end', () => {
      if (url.pathname === '/__mock/requests') return send(res, 200, requests);
      requests.push({ method: req.method, path: url.pathname + url.search, headers: req.headers, size });
      const delay = Number(req.headers['x-mock-delay']) || 0;
      setTimeout(() => {
        try {
          respond(req, res, url, Buffer.concat(chunks));
        } catch (err) {
          if (!res.headersSent) send(res, 500, errorJson(500, url.pathname, `Error interno del mock: ${err.message}`));
          else res.end();
        }
      }, delay);
    });
  };

  function respond(req, res, url, raw) {
    const p = url.pathname;
    if (!p.startsWith('/api/v1/')) return send(res, 404, errorJson(404, p));
    if (RETIRED_PREFIXES.some((r) => p === r || p.startsWith(r + '/'))) return send(res, 404, errorJson(404, p, 'Endpoint retirado por el backend'));
    const rawScenario = req.headers['x-mock-scenario'];
    const scenario = Number(rawScenario);
    if (rawScenario !== undefined && (String(rawScenario).trim() === '' || !Number.isInteger(scenario) || scenario < 400 || scenario > 599)) {
      return send(res, 400, errorJson(400, p, 'x-mock-scenario debe ser un código HTTP entre 400 y 599'));
    }
    if (rawScenario !== undefined) {
      const headers = scenario === 429 ? { 'retry-after': '30' } : {};
      return send(res, scenario, errorJson(scenario, p), headers);
    }
    if (!PUBLIC.some((re) => re.test(p)) && !/^Bearer \S+/.test(req.headers.authorization || '')) {
      return send(res, 401, errorJson(401, p, 'Full authentication is required'));
    }
    let body = null;
    if (raw.length && !/json/.test(req.headers['content-type'] || '') && ['POST', 'PUT', 'PATCH'].includes(req.method) && !/\/upload$/.test(p)) {
      return send(res, 400, errorJson(400, p, 'Content-Type debe ser application/json'));
    }
    if (raw.length && /json/.test(req.headers['content-type'] || '')) {
      try { body = JSON.parse(raw.toString('utf8')); } catch { return send(res, 400, errorJson(400, p, 'JSON mal formado')); }
    }
    const [name, id, ...rest] = p.replace('/api/v1/', '').split('/');
    if (BATCH_DELETE.has(name) && id === 'batch-delete' && req.method === 'POST') return batchDelete(res, name, body, p);
    if (name === 'packages' && id === 'status' && req.method === 'PATCH') return packagesStatus(res, body, p);
    if (COLLECTIONS.has(name) && rest.length === 0) {
      const crud = crudFor(req.method, name, id, body, url);
      if (crud) return send(res, crud[0], crud[1]);
    }
    const fixture = matchFixture(fixtures, req.method, p);
    if (!fixture) return send(res, 404, errorJson(404, p, `Sin fixture para ${req.method} ${p}`));
    const { status, body: fb } = fixture.data.response;
    return send(res, status, fb);
  }

  // M1: POST /{recurso}/batch-delete {ids} (máx. 100). x-mock-conflict-ids: "a,b" fuerza conflict.
  function batchDelete(res, name, body, path) {
    if (!body || !isIdList(body.ids)) return send(res, 400, errorJson(400, path, 'ids debe ser un arreglo de strings'));
    const ids = body.ids;
    if (ids.length > 100) return send(res, 422, errorJson(422, path, 'Máximo 100 ids'));
    const conflicts = new Set(String(res.req.headers['x-mock-conflict-ids'] || '').split(',').filter(Boolean));
    const results = ids.map((id) => {
      if (conflicts.has(id)) return { id, status: 'conflict', error: { code: 'CONFLICT', message: 'Resource in use', details: { referencedBy: 'journeys', ids: ['j1'] } } };
      return { id, status: store.remove(name, id) ? 'deleted' : 'not_found' };
    });
    return send(res, 200, { results });
  }

  // M2: PATCH /packages/status {ids, status, reason?}
  function packagesStatus(res, body, path) {
    if (!body || !isIdList(body.ids)) return send(res, 400, errorJson(400, path, 'ids debe ser un arreglo de strings'));
    const ids = body.ids;
    if (ids.length > 100 || typeof body.status !== 'string' || !body.status) return send(res, 422, errorJson(422, path, 'Petición de estado no válida'));
    const results = ids.map((id) => {
      const pkg = store.find('packages', id);
      if (!pkg) return { id, status: 'not_found' };
      pkg.status = body.status;
      pkg.statusReason = body.reason || null;
      return { id, status: 'updated' };
    });
    return send(res, 200, { results });
  }

  function crudFor(method, name, id, body, url) {
    const template = (f) => (matchFixture(fixtures, f, `/api/v1/${name}${f === 'POST' ? '' : '/id'}`) || { data: { response: { body: {} } } }).data.response.body || {};
    if (method === 'GET' && !id) {
      const list = store.list(name);
      if (name === 'zones') return [200, list];
      const q = (url.searchParams.get('q') || '').toLowerCase();
      if (q.length > 80) return [422, errorJson(422, url.pathname, 'q supera 80 caracteres')];
      return [200, store.page(name, Number(url.searchParams.get('page') || 0), Number(url.searchParams.get('size') || 20), q)];
    }
    if (method === 'GET' && id) {
      const item = store.find(name, id);
      if (item) return [200, item];
      const literal = matchFixture(fixtures, 'GET', url.pathname);
      if (literal && literal.tokens[1] === id && !WILDCARDS.has(id)) return null; // subruta del contrato (p. ej. places/nearby): su fixture
      return [404, errorJson(404, url.pathname)];
    }
    const notObject = [400, errorJson(400, url.pathname, 'El cuerpo debe ser un objeto JSON')];
    if (method === 'POST' && !id) return isPlainObject(body) ? [201, store.create(name, body, template('POST'))] : notObject;
    if (method === 'PUT' && id) {
      if (!store.find(name, id)) return [404, errorJson(404, url.pathname)];
      if (!isPlainObject(body)) return notObject;
      const item = store.replace(name, id, body);
      return item ? [200, item] : [404, errorJson(404, url.pathname)];
    }
    if (method === 'DELETE' && id) return store.remove(name, id) ? [204, null] : [404, errorJson(404, url.pathname)];
    return null;
  }

  function send(res, status, body, headers = {}) {
    if (status === 204 || body === null) {
      res.writeHead(status, headers);
      return res.end();
    }
    res.writeHead(status, { 'content-type': 'application/json', ...headers });
    return res.end(JSON.stringify(body));
  }

  const server = http.createServer(handler);
  return { server, store, requests };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const port = Number(process.env.MOCK_PORT) || 4010;
  createMockApi().server.listen(port, () => console.log(`mock-api /api/v1 en http://localhost:${port}`));
}
