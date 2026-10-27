#!/usr/bin/env node
// Extrae de la colección Postman del HanoIT Gateway el primer ejemplo de éxito (2xx) de cada
// petición y lo guarda, saneado, como fixture JSON para las pruebas de contrato de los servicios.
//
// Uso:  node scripts/extract-gateway-fixtures.mjs <ruta-de-la-colección.json> [--out <dir>] [--max-bytes <n>]
//
// La colección NO debe estar dentro del repositorio: contiene una clave de gateway y credenciales de prueba.
// Los fixtures no pueden contener secretos: el script los sustituye y, si después de sanear queda
// alguno, aborta sin escribir nada.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { collection: null, out: join(root, 'ng-ruteando', 'src', 'testing', 'fixtures', 'gateway'), maxBytes: 100_000 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = resolve(argv[++i]);
    else if (argv[i] === '--max-bytes') args.maxBytes = Number(argv[++i]);
    else if (!args.collection) args.collection = resolve(argv[i]);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.collection) {
  console.error('Uso: node scripts/extract-gateway-fixtures.mjs <ruta-de-la-colección.json> [--out <dir>] [--max-bytes <n>]');
  process.exit(2);
}

const collection = JSON.parse(readFileSync(args.collection, 'utf8'));
const variables = Object.fromEntries((collection.variable ?? []).map((v) => [v.key, v.value]));

// Valores secretos: se leen de las variables de la colección (nunca se escriben en este fichero)
const secrets = [
  [variables.gateway_api_key, 'clave-de-gateway-ficticia'],
  [variables.test_password, 'contraseña-ficticia'],
  [variables.test_email, 'admin@example.invalid'],
].filter(([value]) => typeof value === 'string' && value.length > 0);

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /\+\d{8,15}/g;
const otherEmails = new Map();

/** Sustituye secretos, correos y teléfonos reales, y los placeholders de Postman, por valores ficticios. */
function sanitize(text) {
  let out = text;
  for (const [value, fake] of secrets) {
    out = out.split(value).join(fake);
  }
  out = out
    .replace(EMAIL, (email) => {
      if (email.endsWith('.invalid')) return email; // dominio reservado: ya es ficticio
      if (!otherEmails.has(email)) otherEmails.set(email, `contacto-${otherEmails.size + 1}@example.invalid`);
      return otherEmails.get(email);
    })
    .replace(PHONE, '+570000000000');
  return out
    .replace(/\{\{access_token\}\}/g, 'acceso-ficticio')
    .replace(/\{\{refresh_token\}\}/g, 'refresco-ficticio')
    .replace(/\{\{base_url\}\}/g, '')
    .replace(/\{\{([a-z_]+)\}\}/g, '{$1}');
}

function* walk(items) {
  for (const item of items) {
    if (item.item) yield* walk(item.item);
    else yield item;
  }
}

function slug(name) {
  const [method, path] = name.split(' — ')[0].split(' ');
  const route = path.replace(/^\/api\/v1/, '').replace(/[{}]/g, '').replace(/^\/|\/$/g, '').replace(/\//g, '__') || 'raiz';
  return `${method.toLowerCase()}__${route}`;
}

function parseBody(text) {
  if (text === undefined || text === null || text === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const files = new Map();
const skipped = [];
const withoutExample = [];

for (const item of walk(collection.item)) {
  const response = (item.response ?? []).find((r) => /^2/.test(String(r.code)));
  if (!response) {
    withoutExample.push(item.name.split(' — ')[0]);
    continue;
  }
  const request = item.request;
  const rawUrl = typeof request.url === 'string' ? request.url : request.url.raw;
  const requestBody = request.body?.mode === 'raw' ? parseBody(request.body.raw) : null;
  const fixture = {
    name: item.name.split(' — ')[0],
    request: {
      method: request.method,
      url: sanitize(rawUrl),
      body: requestBody === null ? null : JSON.parse(sanitize(JSON.stringify(requestBody))),
    },
    response: {
      status: Number(response.code),
      body: (() => {
        const body = parseBody(response.body);
        return body === null ? null : JSON.parse(sanitize(JSON.stringify(body)));
      })(),
    },
  };
  const text = JSON.stringify(fixture, null, 2) + '\n';
  if (text.length > args.maxBytes) {
    skipped.push(`${fixture.name} (${text.length} bytes)`);
    continue;
  }
  let file = `${slug(item.name)}.json`;
  for (let n = 2; files.has(file); n++) file = `${slug(item.name)}_${n}.json`;
  files.set(file, text);
}

// Comprobación final: ningún secreto, correo o teléfono reales ni placeholder sin resolver en lo que se va a escribir
const problems = [];
for (const [file, text] of files) {
  for (const [value] of secrets) {
    if (text.includes(value)) problems.push(`${file} contiene un valor secreto de la colección`);
  }
  if ((text.match(EMAIL) ?? []).some((email) => !email.endsWith('.invalid'))) problems.push(`${file} contiene un correo que no es .invalid`);
  if ((text.match(PHONE) ?? []).some((phone) => phone !== '+570000000000')) problems.push(`${file} contiene un teléfono`);
  if (/\{\{[^}]*\}\}/.test(text)) problems.push(`${file} tiene un placeholder de Postman sin resolver`);
  if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./.test(text)) problems.push(`${file} parece contener un JWT`);
  if (/\b[0-9a-f]{64}\b/.test(text)) problems.push(`${file} contiene una cadena hexadecimal de 64 caracteres (¿clave?)`);
}
if (problems.length) {
  console.error('No se escribe nada. Problemas de saneado:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}

mkdirSync(args.out, { recursive: true });
for (const [file, text] of files) writeFileSync(join(args.out, file), text);
writeFileSync(
  join(args.out, '_index.json'),
  JSON.stringify({ files: [...files.keys()].sort(), skipped, withoutExample }, null, 2) + '\n',
);

console.log(`Fixtures escritos: ${files.size} en ${args.out}`);
if (skipped.length) console.log(`Omitidos por tamaño (> ${args.maxBytes} bytes): ${skipped.join('; ')}`);
if (withoutExample.length) console.log(`Sin ejemplo de éxito en la colección: ${withoutExample.length}`);
