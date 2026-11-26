#!/usr/bin/env node
/**
 * Captura un fixture saneado del backend real (FND-001).
 *   node tests/tools/capture-fixture.mjs GET /units [--name get__units] [--body '{"a":1}'] [--public]
 * Usa la cuenta de pruebas de .env. Sustituye emails, teléfonos, tokens y nombres de persona por
 * valores ficticios antes de escribir tests/fixtures/api-v1/<nombre>.json.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function fixtureName(method, route) {
  const segments = sanitizeRoute(route).split('?')[0].replace(/^\/api\/v1/, '').split('/').filter(Boolean)
    .map((s) => (/^[0-9a-f]{24}$/i.test(s) || /^\d+$/.test(s) ? 'id' : s));
  return [method.toLowerCase(), ...segments].join('__');
}

const SECRET_KEYS = /token|password|secret|api[-_]?key|authorization|cookie/i;
const PERSON_KEYS = { email: 'usuario@example.invalid', firstName: 'Jane', lastName: 'Doe', phone: '+570000000000', phoneNumber: '+570000000000', contactName: 'Contacto ficticio', actorEmail: 'actor@example.invalid', inviterName: 'Persona ficticia', driverName: 'Persona ficticia', assignedUserName: 'Persona ficticia', identifierValue: '0000000000', documentNumber: '0000000000', taxId: '000000000-0', nit: '000000000-0', ipAddress: '0.0.0.0', ip: '0.0.0.0', fullName: 'Persona ficticia', userName: 'Persona ficticia', recipientName: 'Persona ficticia', receiverName: 'Persona ficticia', senderName: 'Persona ficticia' };
// `name` es de persona dentro de estos objetos (receptor, remitente, contacto…); en lugares o planes no se toca.
const PERSON_PARENTS = /^(receiver|sender|recipient|contact|customer|inviter|invitedBy|user|driver|assignedUser|assignedDriver|owner|member|createdBy|updatedBy|actor)s?$/i;

/** Quita tokens de la ruta guardada en el fixture (query `token`/`code` y `/invitations/accept/<token>`). */
export function sanitizeRoute(route) {
  return route
    .replace(/([?&](token|code|otp)=)[^&]+/gi, '$1ficticio')
    .replace(/(\/invitations\/accept\/)[^/?]+/, '$1token')
    .replace(/(\/invitations\/)(?!accept\b)([^/?]{12,})(?=\/resend\b)/, '$1token');
}

/** Sanea recursivamente: secretos → "ficticio", datos personales → valores fijos. */
export function sanitize(value, key = '', parent = '') {
  if (Array.isArray(value)) return value.map((v) => sanitize(v, key, parent));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v, k, key)]));
  }
  if (typeof value === 'string') {
    if (SECRET_KEYS.test(key)) return `${key}-ficticio`;
    if (key in PERSON_KEYS) return PERSON_KEYS[key];
    if (key === 'name' && PERSON_PARENTS.test(parent)) return 'Persona ficticia';
    return value.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, 'usuario@example.invalid').replace(/\+\d{10,13}\b/g, '+570000000000');
  }
  return value;
}

export function parseArgs(argv) {
  const [method, route, ...rest] = argv;
  if (!method || !route) throw new Error('Uso: capture-fixture.mjs <MÉTODO> <ruta> [--name n] [--body json] [--public]');
  const opt = (flag) => { const i = rest.indexOf(flag); return i >= 0 ? rest[i + 1] : undefined; };
  return { method: method.toUpperCase(), route, name: opt('--name') || fixtureName(method, route), body: opt('--body') ? JSON.parse(opt('--body')) : undefined, isPublic: rest.includes('--public') };
}

async function main() {
  const { api, login, missing } = await import('../api/_client.mjs');
  const args = parseArgs(process.argv.slice(2));
  const reason = missing(args.isPublic ? [] : ['SDD_TEST_EMAIL', 'SDD_TEST_PASSWORD']);
  if (reason) throw new Error(reason);
  const token = args.isPublic ? undefined : (await login()).accessToken;
  const r = await api(args.method, args.route, { token, body: args.body });
  const fixture = {
    name: `${args.method} /api/v1${sanitizeRoute(args.route).split('?')[0]}`,
    request: { method: args.method, url: `/api/v1${sanitizeRoute(args.route)}`, body: sanitize(args.body ?? null) },
    response: { status: r.status, body: sanitize(r.body) },
  };
  const file = path.join(root, 'tests', 'fixtures', 'api-v1', `${args.name}.json`);
  writeFileSync(file, JSON.stringify(fixture, null, 2) + '\n');
  console.log(`fixture ${path.relative(root, file)} (HTTP ${r.status})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(`capture-fixture: ${e.message}`); process.exit(1); });
}
