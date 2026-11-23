/** Diccionarios versionados (master/i18n) completos para las claves nuevas (FND-002, FND-005). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dict = (lang) => JSON.parse(readFileSync(path.join(root, 'master', 'i18n', `${lang}.json`), 'utf8'));
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));

test('[FND-002 CA-10] cada código de ErrorMessages tiene texto en es, en y es_AR', () => {
  const src = readFileSync(path.join(root, 'master', 'js', 'modules', 'services', 'error_messages.js'), 'utf8');
  const known = [...src.slice(src.indexOf('var KNOWN'), src.indexOf('];')).matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
  assert.ok(known.length > 25);
  for (const lang of ['es', 'en', 'es_AR']) {
    const d = dict(lang);
    for (const code of known) assert.ok(d.errors.code[code], `${lang}: errors.code.${code}`);
    assert.match(d.errors.code.RATE_LIMIT_EXCEEDED, /\{\{seconds\}\}/);
  }
});

test('[FND-005 CA-1] las claves ui.* y errors.* coinciden en los tres idiomas', () => {
  const base = flat({ ui: dict('es').ui, errors: dict('es').errors }).sort();
  for (const lang of ['en', 'es_AR']) {
    assert.deepEqual(flat({ ui: dict(lang).ui, errors: dict(lang).errors }).sort(), base, lang);
  }
});
