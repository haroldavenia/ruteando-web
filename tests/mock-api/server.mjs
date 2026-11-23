/**
 * mock-api de /api/v1 para E2E y pruebas del proxy (FND-001).
 *   node tests/mock-api/server.mjs            (MOCK_PORT, por defecto 4010)
 * - Exige `Authorization: Bearer` salvo en /auth/* y /invitations/accept/*.
 * - `x-mock-scenario: <estado>` fuerza un error con el formato del backend (409 → CONFLICT…).
 * - `x-mock-delay: <ms>` retrasa la respuesta (pruebas de timeout).
 * - GET /__mock/requests devuelve las cabeceras y tamaños recibidos (para inspección).
 */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { loadFixtures, matchFixture, createStore } from './store.mjs';

const CODES = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 410: 'GONE', 422: 'UNPROCESSABLE_ENTITY', 423: 'ACCOUNT_LOCKED', 429: 'RATE_LIMIT_EXCEEDED', 500: 'INTERNAL_ERROR', 502: 'ROUTING_ENGINE_UNAVAILABLE' };
const PUBLIC = [/^\/api\/v1\/auth\//, /^\/api\/v1\/invitations\/accept\//, /^\/api\/v1\/tenants\/slug\//];
const COLLECTIONS = new Set(['places', 'packages', 'journeys', 'users', 'resources', 'settings', 'resource-types', 'zones']);

export function errorJson(status, path, message, details = null) {
  return { error: CODES[status] || `HTTP_${status}`, message: message || `Escenario simulado ${status}`, timestamp: new Date().toISOString(), path, details };
}

export function createMockApi({ fixtures = loadFixtures() } = {}) {
  const store = createStore(fixtures);
  const requests = [];

  const handler = (req, res) => {
    const url = new URL(req.url, 'http://mock');
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; chunks.push(c); });
    req.on('end', () => {
      if (url.pathname === '/__mock/requests') return send(res, 200, requests);
      requests.push({ method: req.method, path: url.pathname + url.search, headers: req.headers, size });
      const delay = Number(req.headers['x-mock-delay']) || 0;
      setTimeout(() => respond(req, res, url, Buffer.concat(chunks)), delay);
    });
  };

  function respond(req, res, url, raw) {
    const p = url.pathname;
    if (!p.startsWith('/api/v1/')) return send(res, 404, errorJson(404, p));
    const scenario = Number(req.headers['x-mock-scenario']);
    if (scenario >= 400) {
      const headers = scenario === 429 ? { 'retry-after': '30' } : {};
      return send(res, scenario, errorJson(scenario, p), headers);
    }
    if (!PUBLIC.some((re) => re.test(p)) && !/^Bearer \S+/.test(req.headers.authorization || '')) {
      return send(res, 401, errorJson(401, p, 'Full authentication is required'));
    }
    let body = null;
    if (raw.length && /json/.test(req.headers['content-type'] || '')) {
      try { body = JSON.parse(raw.toString('utf8')); } catch { return send(res, 400, errorJson(400, p, 'JSON mal formado')); }
    }
    const [name, id, ...rest] = p.replace('/api/v1/', '').split('/');
    if (COLLECTIONS.has(name) && rest.length === 0) {
      const crud = crudFor(req.method, name, id, body, url);
      if (crud) return send(res, crud[0], crud[1]);
    }
    const fixture = matchFixture(fixtures, req.method, p);
    if (!fixture) return send(res, 404, errorJson(404, p, `Sin fixture para ${req.method} ${p}`));
    const { status, body: fb } = fixture.data.response;
    return send(res, status, fb);
  }

  function crudFor(method, name, id, body, url) {
    const template = (f) => (matchFixture(fixtures, f, `/api/v1/${name}${f === 'POST' ? '' : '/id'}`) || { data: { response: { body: {} } } }).data.response.body || {};
    if (method === 'GET' && !id) {
      const list = store.list(name);
      if (name === 'zones') return [200, list];
      return [200, store.page(name, Number(url.searchParams.get('page') || 0), Number(url.searchParams.get('size') || 20))];
    }
    if (method === 'GET' && id) {
      const item = store.find(name, id);
      return item ? [200, item] : null;
    }
    if (method === 'POST' && !id) return [201, store.create(name, body || {}, template('POST'))];
    if (method === 'PUT' && id) {
      const item = store.replace(name, id, body || {});
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
