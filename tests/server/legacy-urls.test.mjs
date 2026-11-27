/** Sin URL absolutas del backend en el front (FND-002 CA-1, RF-1): solo quedan en módulos aún no migrados registrados en legacy-scan. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk, legacyHits, loadSpecs, CERRADOS } from '../../tools/specs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ABSOLUTE = /hanoit:9000|app\.ruteando\.co/;

test('[FND-002 CA-1] hanoit:9000|app.ruteando.co en master/js solo aparece en módulos sin migrar registrados en legacy-scan', () => {
  const found = [];
  for (const file of walk(path.join(root, 'master', 'js'), (p) => p.endsWith('.js'))) {
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((text, i) => {
      if (ABSOLUTE.test(text)) found.push({ file: path.relative(root, file).split(path.sep).join('/'), line: i + 1 });
    });
  }
  const estado = Object.fromEntries(loadSpecs(root).map((s) => [s.id, s.estado]));
  const hits = legacyHits(root);
  for (const f of found) {
    const owners = hits.filter((h) => h.file === f.file && h.line === f.line).map((h) => h.owner);
    assert.ok(owners.length > 0, `${f.file}:${f.line} no está registrado en legacy-scan`);
    assert.ok(!owners.includes('FND-002'), `${f.file}:${f.line} pertenece a FND-002`);
    for (const o of owners) assert.ok(!CERRADOS.includes(estado[o]), `${f.file}:${f.line} pertenece a ${o}, ya ${estado[o]}`);
  }
  // Los servicios de la capa API (FND-002) no contienen ninguna URL absoluta.
  for (const name of ['api_config.js', 'api_client.js', 'api_error.js', 'error_messages.js']) {
    const src = readFileSync(path.join(root, 'master', 'js', 'modules', 'services', name), 'utf8');
    assert.doesNotMatch(src, /https?:\/\//, name);
  }
  const config = readFileSync(path.join(root, 'master', 'js', 'modules', 'services', 'api_config.js'), 'utf8');
  assert.match(config, /baseUrl:\s*'\/api\/v1'/);
});