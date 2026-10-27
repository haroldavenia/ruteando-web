#!/usr/bin/env node
// Gateway falso para desarrollo: imita lo que el frontend usa del HanoIT Gateway (`/api/v1/**`) con datos en memoria,
// para poder iniciar sesión y recorrer la aplicación sin el gateway real. NO es el contrato oficial: es lo observado en
// los fixtures y en las pruebas manuales; los datos se pierden al parar el proceso.
//
// Uso:
//   node scripts/mock-gateway.mjs                      # escucha en el puerto 4010
//   GATEWAY_URL=http://localhost:4010 GATEWAY_API_KEY=mock npm start      # app contra el mock (ver README)
//
// Usuarios (contraseña `demo1234`): admin@example.invalid (tenant_admin), agente@example.invalid (agent),
// conductor@example.invalid (driver). Variables: MOCK_GATEWAY_PORT (4010) y MOCK_GATEWAY_LATENCY_MS (120).
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.MOCK_GATEWAY_PORT ?? 4010);
const LATENCY = Number(process.env.MOCK_GATEWAY_LATENCY_MS ?? 120);
const PASSWORD = 'demo1234';

// ------------------------------------------------------------------ utilidades

let seq = 0;
const newId = () => '6adf' + (++seq).toString(16).padStart(20, '0');
const now = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));
const TENANT_ID = newId();

/** Los dominios maestros salen del fixture (incluye `returned` inactivo, como el gateway real). */
const masterDomains = JSON.parse(readFileSync(join(root, 'ng-ruteando/src/testing/fixtures/gateway/get__master-domains.json'), 'utf8')).response.body;

function fail(status, error, message, path) {
  return { status, body: { error, message, timestamp: now(), path } };
}
const notFound = (what, id, path) => fail(404, 'NOT_FOUND', `${what} not found: ${id}`, path);

function paged(items, query) {
  const size = Math.max(1, Number(query.get('size') ?? 20));
  const page = Math.max(0, Number(query.get('page') ?? 0));
  return {
    content: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
  };
}

/** Polilínea codificada de precisión 5 (orden latitud, longitud), como `geoJson` de las rutas. */
function encodePolyline(points) {
  let out = '';
  let prevLat = 0;
  let prevLng = 0;
  const enc = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let chunk = '';
    while (v >= 0x20) {
      chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    return chunk + String.fromCharCode(v + 63);
  };
  for (const [lng, lat] of points) {
    const la = Math.round(lat * 1e5);
    const ln = Math.round(lng * 1e5);
    out += enc(la - prevLat) + enc(ln - prevLng);
    prevLat = la;
    prevLng = ln;
  }
  return out;
}

function meters([lng1, lat1], [lng2, lat2]) {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

// ------------------------------------------------------------------ datos de partida

const CENTER = [-74.0817, 4.6097];
const point = (dLng, dLat) => ({ type: 'Point', coordinates: [CENTER[0] + dLng, CENTER[1] + dLat] });
const stamp = () => ({ tenantId: TENANT_ID, createdAt: now(), updatedAt: now() });

const db = {
  places: [],
  resourceTypes: [],
  resources: [],
  settings: [],
  packages: [],
  zones: [],
  journeys: [],
  drivers: [],
};

const USERS = [
  { id: newId(), email: 'admin@example.invalid', role: 'tenant_admin', firstName: 'Ada', lastName: 'Administradora' },
  { id: newId(), email: 'agente@example.invalid', role: 'agent', firstName: 'Álvaro', lastName: 'Agente' },
  { id: newId(), email: 'conductor@example.invalid', role: 'driver', firstName: 'Carmen', lastName: 'Conductora' },
].map((user) => ({ ...user, phone: null, tenantId: TENANT_ID, emailVerified: true, phoneVerified: false, createdAt: now() }));

const sessions = new Map(); // token (acceso o refresco) -> usuario

function seed() {
  const depot = { id: newId(), name: 'Depósito Central', type: 'depot', address: 'Av. Principal 100', location: point(0, 0), phoneNumber: null, contactName: null, zoneId: null, active: true, ...stamp() };
  const warehouse = { id: newId(), name: 'Bodega Norte', type: 'warehouse', address: 'Calle 80 # 20-10', location: point(0.012, 0.03), phoneNumber: null, contactName: null, zoneId: null, active: true, ...stamp() };
  db.places.push(depot, warehouse);

  const van = { id: newId(), category: 'van', name: 'Furgoneta', osrmProfile: 'driving', capacity: null, measure: null, restriction: null, gasMileage: null, active: true, ...stamp() };
  db.resourceTypes.push(van);
  for (const [name, plate] of [['Vehículo 1', 'ABC-123'], ['Vehículo 2', 'XYZ-987']]) {
    db.resources.push({
      id: newId(), resourceTypeId: van.id, driverId: null, name, licensePlate: plate, depotId: depot.id,
      shiftStartUtc: '2026-10-26T13:00:00Z', shiftDurationSec: 28800, breakDurationSec: 3600, quantity: 1, default: false, active: true,
      allowedPackageTypes: null, allowedZoneIds: null, ...stamp(),
    });
  }
  db.settings.push({
    id: newId(), description: 'Configuración de reparto', routeTopology: 'round_trip', restrictionType: 'fixed_routes', placeStartId: depot.id, placeEndId: depot.id,
    evaluateWeight: true, evaluateVolume: true, evaluateItineraryZone: false, fixedRoutes: 2, lengthOfStay: null, typeLengthOfStay: null,
    shiftStartUtc: null, shiftDurationSec: null, breakDurationSec: null, resourceIds: db.resources.map((r) => r.id), active: true,
    createdBy: USERS[0].id, globalShiftActive: false, globalBreakActive: false, ...stamp(),
  });

  const statuses = ['pending', 'pending', 'pending', 'attended', 'attended', 'unattended', 'cancelled', 'returned'];
  const spots = [[-0.02, 0.012], [0.015, 0.02], [0.03, -0.01], [-0.03, -0.015], [0.005, 0.035], [-0.012, 0.028], [0.025, 0.008], [-0.008, -0.025]];
  spots.forEach(([dLng, dLat], i) => {
    db.packages.push({
      id: newId(), guideNumber: `GUIA-${1001 + i}`, name: `Paquete ${i + 1}`, serviceType: i % 4 === 3 ? 'pickup' : 'delivery',
      address: `Dirección de ejemplo ${i + 1}`, standardizedAddress: null, location: point(dLng, dLat), geocodingScore: null, geocodingStatus: null,
      city: 'Bogotá', country: 'Colombia', postalCode: null, zoneId: null, weight: 1 + (i % 3), volume: 0.1 * (1 + (i % 4)), pieceNumber: 1, measure: null,
      durationStay: null, timeWindow: null, category: null, goodsTags: null, customerId: null, receiver: null, sender: null, observation: null,
      status: statuses[i], ...stamp(),
    });
  });

  db.zones.push({
    id: newId(), name: 'Zona Centro', code: 'CENTRO', color: 'blue', active: true, ...stamp(),
    boundary: { type: 'Polygon', coordinates: [[[-74.10, 4.59], [-74.06, 4.59], [-74.06, 4.63], [-74.10, 4.63], [-74.10, 4.59]]] },
  });

  db.drivers.push({
    id: USERS[2].id, email: USERS[2].email, firstName: USERS[2].firstName, lastName: USERS[2].lastName, phone: null, role: 'driver', tenantId: TENANT_ID,
    createdAt: now(), active: true, identifierType: null, identifierValue: null, avatar: null, lastLoginAt: null, updatedAt: null,
  });

  // Dos jornadas ya planificadas (la más reciente primero en los listados)
  const settings = db.settings[0];
  db.journeys.push(planJourney('Jornada de ayer', settings, db.packages.slice(0, 4), -86400000));
  db.journeys.push(planJourney('Jornada de hoy', settings, db.packages.slice(4), 0));
}

// ------------------------------------------------------------------ planificación falsa

function planJourney(name, settings, packages, offsetMs) {
  const depot = db.places.find((p) => p.id === settings.placeStartId);
  const resources = db.resources.filter((r) => settings.resourceIds.includes(r.id));
  const count = Math.max(1, Math.min(settings.fixedRoutes ?? 1, resources.length, packages.length || 1));
  const groups = Array.from({ length: count }, () => []);
  packages.forEach((pkg, i) => groups[i % count].push(pkg));
  const start = Date.now() + offsetMs;

  const routes = groups.map((group, routeIndex) => {
    const resource = resources[routeIndex];
    const stops = [{ stopType: 'depot', packageId: null, placeId: depot.id, coordinates: depot.location.coordinates, weight: 0, volume: 0, stay: 0 }];
    for (const pkg of group) {
      stops.push({ stopType: pkg.serviceType === 'pickup' ? 'pickup' : 'delivery', packageId: pkg.id, placeId: null, coordinates: pkg.location.coordinates, weight: pkg.weight ?? 0, volume: pkg.volume ?? 0, stay: 300 });
    }
    stops.push({ ...stops[0] });

    let clock = start + routeIndex * 600000;
    let distanceAccum = 0;
    let durationAccum = 0;
    let weightAccum = 0;
    let volumeAccum = 0;
    const waypoints = stops.map((stop, sequence) => {
      const leg = sequence === 0 ? 0 : meters(stops[sequence - 1].coordinates, stop.coordinates);
      const driving = Math.round(leg / (30000 / 3600)); // 30 km/h
      clock += driving * 1000;
      const arrival = new Date(clock).toISOString();
      clock += stop.stay * 1000;
      distanceAccum += leg;
      durationAccum += driving + stop.stay;
      weightAccum += stop.weight;
      volumeAccum += stop.volume;
      return {
        sequence, stopType: stop.stopType, packageId: stop.packageId, packageInfo: null, placeId: stop.placeId, coordinates: stop.coordinates,
        arrivalUtc: arrival, departureUtc: new Date(clock).toISOString(), distance: Math.round(leg), distanceAccum: Math.round(distanceAccum),
        duration: driving, durationAccum, weight: stop.weight, weightAccum, volume: stop.volume, volumeAccum: Number(volumeAccum.toFixed(2)),
      };
    });
    return {
      routeIndex, name: `Ruta ${routeIndex + 1}`, resourceId: resource.id,
      resource: { id: resource.id, name: resource.name, plate: resource.licensePlate, resourceTypeName: 'Furgoneta' },
      geoJson: encodePolyline(stops.map((s) => s.coordinates)),
      startRouteUtc: new Date(start + routeIndex * 600000).toISOString(), finishRouteUtc: new Date(clock).toISOString(),
      distanceTraveled: Math.round(distanceAccum), duration: durationAccum, weightUsed: weightAccum, volumeUsed: Number(volumeAccum.toFixed(2)),
      weightUsagePercent: Math.min(100, weightAccum * 10), volumeUsagePercent: Math.min(100, Number((volumeAccum * 20).toFixed(1))),
      fuelCost: null, avgStayTime: 300, legsCount: stops.length - 1, badPackageIds: null, waypoints,
    };
  });

  const times = routes.map((r) => r.duration);
  const created = new Date(start).toISOString();
  return {
    id: newId(), tenantId: TENANT_ID, createdBy: USERS[0].id, settingsId: settings.id,
    settings: { id: settings.id, name: settings.description, routeTopology: settings.routeTopology, restrictionType: settings.restrictionType },
    name, status: 'planned', totalServices: packages.length, totalResources: routes.length, totalZones: 0,
    stats: { minTime: Math.min(...times), avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length), maxTime: Math.max(...times) },
    invalidPackageIds: [], routes, resourceSummary: null, createdAt: created, updatedAt: created,
  };
}

// ------------------------------------------------------------------ enriquecimiento de respuestas

const enrich = {
  resources: (r) => {
    const type = db.resourceTypes.find((t) => t.id === r.resourceTypeId);
    return { ...r, resourceType: type ? { id: type.id, name: type.name, capacity: type.capacity, osrmProfile: type.osrmProfile } : null, assignedUser: null };
  },
  settings: (s) => {
    const summary = (id) => {
      const place = db.places.find((p) => p.id === id);
      return place ? { id: place.id, name: place.name, location: place.location } : null;
    };
    return {
      ...s, placeStart: summary(s.placeStartId), placeEnd: summary(s.placeEndId),
      resources: db.resources.filter((r) => s.resourceIds?.includes(r.id)).map((r) => ({ id: r.id, name: r.name, plate: r.licensePlate, resourceTypeName: 'Furgoneta' })),
    };
  },
};

// ------------------------------------------------------------------ rutas

const COLLECTIONS = {
  places: { list: db.places, what: 'Place', paged: true },
  'resource-types': { list: db.resourceTypes, what: 'ResourceType', paged: true },
  resources: { list: db.resources, what: 'Resource', paged: true, enrich: enrich.resources },
  settings: { list: db.settings, what: 'Settings', paged: true, enrich: enrich.settings },
  packages: { list: db.packages, what: 'Package', paged: true },
  zones: { list: db.zones, what: 'Zone', paged: false },
};

const ACTIVE_STATUSES = () => masterDomains.find((d) => d.code === 'PackageStatus').values.filter((v) => v.active).map((v) => v.key);

function sessionResponse(user, accessToken, refreshToken) {
  return { message: null, accessToken, refreshToken, expiresIn: 3600, user: clone(user) };
}
function openSession(user) {
  const accessToken = `mock-acceso-${Math.random().toString(36).slice(2)}`;
  const refreshToken = `mock-refresco-${Math.random().toString(36).slice(2)}`;
  sessions.set(accessToken, user);
  sessions.set(refreshToken, user);
  return sessionResponse(user, accessToken, refreshToken);
}

function handle(method, path, query, body, headers) {
  const unauthorized = { status: 401, body: 'Unauthorized access' };
  if (!headers['x-api-key']) return unauthorized;

  // --- autenticación (sin sesión)
  if (path === '/auth/login' && method === 'POST') {
    const user = USERS.find((u) => u.email === String(body?.email ?? '').toLowerCase());
    if (!user || body?.password !== PASSWORD) return fail(401, 'UNAUTHORIZED', 'Invalid credentials', path);
    return { status: 200, body: openSession(user) };
  }
  if (path === '/auth/register' && method === 'POST') {
    if (!body?.email || !body?.password) return fail(400, 'BAD_REQUEST', 'email and password are required', path);
    if (USERS.some((u) => u.email === body.email.toLowerCase())) return fail(409, 'CONFLICT', 'Email already registered', path);
    const user = { id: newId(), email: body.email.toLowerCase(), role: 'tenant_admin', firstName: body.firstName ?? '', lastName: body.lastName ?? '', phone: null, tenantId: TENANT_ID, emailVerified: false, phoneVerified: false, createdAt: now() };
    USERS.push(user);
    return { status: 201, body: { user: clone(user), tenant: { id: TENANT_ID, name: body.tenantName ?? 'Demo', slug: 'demo', plan: 'FREE' }, message: 'Registered' } };
  }
  if (path === '/auth/refresh' && method === 'POST') {
    const user = sessions.get(body?.refreshToken);
    if (!user) return fail(401, 'UNAUTHORIZED', 'Invalid refresh token', path);
    const accessToken = `mock-acceso-${Math.random().toString(36).slice(2)}`;
    sessions.set(accessToken, user);
    return { status: 200, body: sessionResponse(user, accessToken, body.refreshToken) }; // sin rotación, como el gateway real
  }
  if (path === '/auth/logout' && method === 'POST') {
    sessions.delete(body?.refreshToken);
    return { status: 204, body: null };
  }
  if (['/auth/forgot-password', '/auth/reset-password', '/auth/resend-verification', '/auth/verify-email'].includes(path)) {
    return { status: 200, body: { message: 'OK (mock)' } };
  }

  // --- el resto exige sesión
  const token = (headers.authorization ?? '').replace(/^Bearer /, '');
  const user = sessions.get(token);
  if (!user) return unauthorized;

  if (path === '/auth/me' && method === 'GET') return { status: 200, body: clone(user) };
  if (path === '/master-domains' && method === 'GET') return { status: 200, body: masterDomains };

  // --- paquetes: cambio de estado (rechaza las claves inactivas, como el gateway real)
  let m = path.match(/^\/packages\/([^/]+)\/status\/([^/]+)$/);
  if (m && method === 'PATCH') {
    const pkg = db.packages.find((p) => p.id === m[1]);
    if (!pkg) return notFound('Package', m[1], path);
    if (!ACTIVE_STATUSES().includes(m[2])) return fail(400, 'BAD_REQUEST', `Unknown PackageStatus key: ${m[2]}`, path);
    pkg.status = m[2];
    pkg.updatedAt = now();
    return { status: 200, body: clone(pkg) };
  }

  // --- jornadas
  if (path === '/journeys' && method === 'GET') {
    const items = [...db.journeys].reverse().map((j) => ({ ...j, routes: null })); // más reciente primero; el listado no trae rutas
    return { status: 200, body: paged(items, query) };
  }
  if (path === '/journeys/plan' && method === 'POST') {
    const settings = db.settings.find((s) => s.id === body?.settingsId);
    if (!settings) return notFound('Settings', body?.settingsId, path);
    const packages = (body?.packageIds ?? []).map((id) => db.packages.find((p) => p.id === id));
    if (packages.length === 0 || packages.some((p) => !p)) return fail(400, 'BAD_REQUEST', 'packageIds must be existing packages', path);
    const journey = planJourney(body.name || 'Jornada', settings, packages, 0);
    db.journeys.push(journey);
    return { status: 201, body: clone(journey) };
  }
  m = path.match(/^\/journeys\/([^/]+)(?:\/(metrics|navigations))?$/);
  if (m) {
    if (!/^[0-9a-f]{24}$/.test(m[1])) return fail(400, 'BAD_REQUEST', 'state should be: hexString has 24 characters', path);
    const journey = db.journeys.find((j) => j.id === m[1]);
    if (!journey) return notFound('Journey', m[1], path);
    if (m[2] === 'navigations') return { status: 200, body: [] };
    if (m[2] === 'metrics') return { status: 200, body: { id: newId(), tenantId: TENANT_ID, journeyId: journey.id, totalServices: journey.totalServices } };
    if (method === 'GET') return { status: 200, body: clone(journey) };
    if (method === 'DELETE') {
      db.journeys.splice(db.journeys.indexOf(journey), 1);
      return { status: 204, body: null };
    }
  }

  // --- conductores
  if (path === '/users/drivers' && method === 'GET') return { status: 200, body: clone(db.drivers) };
  m = path.match(/^\/users(?:\/([^/]+))?$/);
  if (m && method === 'POST' && !m[1]) {
    const driver = { id: newId(), email: body.email, firstName: body.firstName ?? null, lastName: body.lastName ?? null, phone: body.phone ?? null, role: body.role ?? 'driver', tenantId: TENANT_ID, createdAt: now(), active: true, identifierType: body.identifierType ?? null, identifierValue: body.identifierValue ?? null, avatar: null, lastLoginAt: null, updatedAt: null };
    db.drivers.push(driver);
    return { status: 201, body: clone(driver) };
  }
  if (m && m[1]) {
    const driver = db.drivers.find((d) => d.id === m[1]);
    if (!driver) return notFound('User', m[1], path);
    if (method === 'GET') return { status: 200, body: clone(driver) };
    if (method === 'PUT') return { status: 200, body: Object.assign(driver, body, { id: driver.id, updatedAt: now() }) };
    if (method === 'DELETE') {
      db.drivers.splice(db.drivers.indexOf(driver), 1);
      return { status: 204, body: null };
    }
  }

  // --- vehículo <-> conductor
  m = path.match(/^\/resources\/([^/]+)\/driver(?:\/([^/]+))?$/);
  if (m) {
    const resource = db.resources.find((r) => r.id === m[1]);
    if (!resource) return notFound('Resource', m[1], path);
    if (method === 'PUT') resource.driverId = m[2];
    else if (method === 'DELETE') {
      resource.driverId = null;
      return { status: 204, body: null };
    }
    return { status: 200, body: enrich.resources(resource) };
  }

  // --- colecciones con CRUD
  m = path.match(/^\/([a-z-]+)(?:\/([^/]+))?$/);
  const collection = m && COLLECTIONS[m[1]];
  if (collection) {
    const present = (item) => (collection.enrich ? collection.enrich(item) : item);
    const id = m[2];
    if (!id && method === 'GET') {
      const items = [...collection.list].reverse().map(present); // más reciente primero; `sort` se ignora, como el gateway real
      return { status: 200, body: collection.paged ? paged(items, query) : items };
    }
    if (!id && method === 'POST') {
      const item = { id: newId(), active: true, ...clone(body), ...stamp() };
      if (m[1] === 'packages') {
        item.status = 'pending';
        if (!item.guideNumber) item.guideNumber = `GUIA-${2000 + collection.list.length}`;
        if (collection.list.some((p) => p.guideNumber === item.guideNumber)) return fail(409, 'CONFLICT', `guideNumber already exists: ${item.guideNumber}`, path);
      }
      if (m[1] === 'settings') item.placeEndId ??= item.placeStartId;
      collection.list.push(item);
      return { status: 201, body: clone(present(item)) };
    }
    const item = collection.list.find((x) => x.id === id);
    if (id && !item) return notFound(collection.what, id, path);
    if (id && method === 'GET') return { status: 200, body: clone(present(item)) };
    if (id && method === 'PUT') return { status: 200, body: clone(present(Object.assign(item, clone(body), { id: item.id, tenantId: item.tenantId, updatedAt: now() }))) };
    if (id && method === 'DELETE') {
      if (m[1] === 'packages' && db.journeys.some((j) => j.routes.some((r) => r.waypoints.some((w) => w.packageId === id)))) {
        return fail(409, 'CONFLICT', 'Package is used in a journey', path);
      }
      collection.list.splice(collection.list.indexOf(item), 1);
      return { status: 204, body: null };
    }
  }

  return notFound('Resource', path, path);
}

// ------------------------------------------------------------------ servidor

seed();

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    let body = null;
    const raw = Buffer.concat(chunks).toString('utf8');
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = null;
      }
    }
    const path = url.pathname.replace(/^\/api\/v1/, '') || '/';
    const reply = url.pathname.startsWith('/api/v1/') ? handle(req.method ?? 'GET', path, url.searchParams, body, req.headers) : fail(404, 'NOT_FOUND', 'Not found', url.pathname);
    setTimeout(() => {
      const isText = typeof reply.body === 'string';
      res.writeHead(reply.status, { 'Content-Type': isText ? 'text/plain' : 'application/json' });
      res.end(reply.body === null ? undefined : isText ? reply.body : JSON.stringify(reply.body));
      console.log(`${req.method} ${url.pathname}${url.search} -> ${reply.status}`);
    }, LATENCY);
  });
});

server.listen(PORT, () => {
  console.log(`Gateway falso en http://localhost:${PORT}/api/v1 (usuarios: admin@, agente@, conductor@example.invalid; contraseña ${PASSWORD})`);
});
