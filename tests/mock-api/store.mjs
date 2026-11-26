/**
 * Almacén en memoria del mock-api (FND-001): fixtures reales de tests/fixtures/api-v1
 * + CRUD sobre las colecciones para que los E2E puedan crear, editar y borrar.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

export const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'api-v1');
export const WILDCARDS = new Set(['id', 'code', 'key', 'token', 'slug', 'driverId', 'journeyId', 'routeIndex', 'status']);

export function loadFixtures(dir = FIXTURES_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((file) => {
      const [method, ...tokens] = file.replace(/\.json$/, '').split('__');
      return { file, method: method.toUpperCase(), tokens, data: JSON.parse(readFileSync(path.join(dir, file), 'utf8')) };
    });
}

/** Fixture que mejor casa con método + ruta (más segmentos literales gana). */
export function matchFixture(fixtures, method, pathname) {
  const segments = pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean);
  let best = null;
  for (const f of fixtures) {
    if (f.method !== method || f.tokens.length !== segments.length) continue;
    let score = 0;
    const ok = f.tokens.every((t, i) => {
      if (t === segments[i]) { score += 2; return true; }
      if (WILDCARDS.has(t)) { score += 1; return true; }
      return false;
    });
    if (ok && (!best || score > best.score)) best = { ...f, score };
  }
  return best;
}

export const newId = () => randomBytes(12).toString('hex');

export function createStore(fixtures) {
  const collections = new Map();
  const collection = (name) => {
    if (!collections.has(name)) {
      const list = fixtures.find((f) => f.method === 'GET' && f.tokens.length === 1 && f.tokens[0] === name);
      const body = list && list.data.response.body;
      collections.set(name, structuredClone(Array.isArray(body) ? body : (body && body.content) || []));
    }
    return collections.get(name);
  };
  return {
    list: collection,
    page(name, page = 0, size = 20, q = '') {
      const match = (x) => ['guideNumber', 'name', 'address'].some((k) => String(x[k] ?? '').toLowerCase().includes(q));
      const all = q ? collection(name).filter(match) : collection(name);
      return { content: all.slice(page * size, page * size + size), totalElements: all.length, totalPages: Math.ceil(all.length / size), page, size };
    },
    find: (name, id) => collection(name).find((x) => x.id === id),
    create(name, body, template = {}) {
      const now = new Date().toISOString();
      const item = { ...template, ...body, id: newId(), createdAt: now, updatedAt: now };
      collection(name).push(item);
      return item;
    },
    replace(name, id, body) {
      const all = collection(name);
      const i = all.findIndex((x) => x.id === id);
      if (i < 0) return null;
      all[i] = { ...body, id, createdAt: all[i].createdAt, updatedAt: new Date().toISOString() };
      return all[i];
    },
    remove(name, id) {
      const all = collection(name);
      const i = all.findIndex((x) => x.id === id);
      if (i < 0) return false;
      all.splice(i, 1);
      return true;
    },
  };
}
